from typing import List, Optional, Tuple
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy import select, func, and_, or_, desc, text
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.practice_segment import PracticeSegment, SegmentClick
from app.models.practice import Tag, PracticeSession
from app.models.user import Student
from app.models.timer import SessionTimer
from app.schemas.practice_segment import (
    PracticeSegmentCreate, 
    PracticeSegmentUpdate, 
    SegmentClickCreate,
    PieceProgress
)


class PracticeSegmentService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_student_pieces(
        self, 
        student_id: UUID,
        include_completed: bool = True,
        include_archived: bool = False
    ) -> List[Tag]:
        """Get all piece-type tags that the student is working on"""
        query = (
            select(Tag)
            .join(PracticeSegment, Tag.id == PracticeSegment.piece_tag_id)
            .where(
                and_(
                    PracticeSegment.student_id == student_id,
                    Tag.tag_type == "piece"
                )
            )
        )
        
        if not include_archived:
            query = query.where(Tag.is_archived == False)
        
        if not include_completed:
            query = query.where(PracticeSegment.is_completed == False)
        
        query = query.distinct()
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_piece_segments(
        self,
        piece_tag_id: UUID,
        student_id: UUID
    ) -> List[PracticeSegment]:
        """Get all practice segments for a piece"""
        query = (
            select(PracticeSegment)
            .where(
                and_(
                    PracticeSegment.piece_tag_id == piece_tag_id,
                    PracticeSegment.student_id == student_id
                )
            )
            .order_by(PracticeSegment.display_order, PracticeSegment.created_at)
        )
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def create_segment(
        self,
        segment_data: PracticeSegmentCreate,
        student_id: UUID
    ) -> PracticeSegment:
        """Create a new practice segment"""
        # Verify the tag exists and is a piece
        tag_query = select(Tag).where(
            and_(
                Tag.id == segment_data.piece_tag_id,
                Tag.tag_type == "piece"
            )
        )
        tag_result = await self.db.execute(tag_query)
        tag = tag_result.scalar_one_or_none()
        
        if not tag:
            raise ValueError("Invalid piece tag ID or tag is not a piece type")
        
        # Check if segment with same name already exists
        existing_query = select(PracticeSegment).where(
            and_(
                PracticeSegment.piece_tag_id == segment_data.piece_tag_id,
                PracticeSegment.student_id == student_id,
                PracticeSegment.name == segment_data.name
            )
        )
        existing_result = await self.db.execute(existing_query)
        if existing_result.scalar_one_or_none():
            raise ValueError("A segment with this name already exists for this piece")
        
        # Create the segment
        segment = PracticeSegment(
            **segment_data.model_dump(),
            student_id=student_id
        )
        
        self.db.add(segment)
        await self.db.commit()
        await self.db.refresh(segment)
        
        return segment
    
    async def update_segment(
        self,
        segment_id: UUID,
        segment_data: PracticeSegmentUpdate,
        student_id: UUID
    ) -> Optional[PracticeSegment]:
        """Update a practice segment"""
        query = select(PracticeSegment).where(
            and_(
                PracticeSegment.id == segment_id,
                PracticeSegment.student_id == student_id
            )
        )
        result = await self.db.execute(query)
        segment = result.scalar_one_or_none()
        
        if not segment:
            return None
        
        update_data = segment_data.model_dump(exclude_unset=True)
        
        # Handle completion
        if "is_completed" in update_data and update_data["is_completed"]:
            update_data["completed_at"] = datetime.now(timezone.utc)
        elif "is_completed" in update_data and not update_data["is_completed"]:
            update_data["completed_at"] = None
        
        for field, value in update_data.items():
            setattr(segment, field, value)
        
        await self.db.commit()
        await self.db.refresh(segment)
        
        return segment
    
    async def delete_segment(
        self,
        segment_id: UUID,
        student_id: UUID
    ) -> bool:
        """Delete a practice segment"""
        query = select(PracticeSegment).where(
            and_(
                PracticeSegment.id == segment_id,
                PracticeSegment.student_id == student_id
            )
        )
        result = await self.db.execute(query)
        segment = result.scalar_one_or_none()
        
        if not segment:
            return False
        
        await self.db.delete(segment)
        await self.db.commit()
        
        return True
    
    async def record_click(
        self,
        click_data: SegmentClickCreate
    ) -> SegmentClick:
        """Record a click on a practice segment"""
        # Verify segment exists
        segment_query = select(PracticeSegment).where(
            PracticeSegment.id == click_data.segment_id
        )
        segment_result = await self.db.execute(segment_query)
        segment = segment_result.scalar_one_or_none()
        
        if not segment:
            raise ValueError("Invalid segment ID")
        
        # Create click record
        click = SegmentClick(**click_data.model_dump())
        self.db.add(click)
        
        # Note: The database trigger will automatically update the segment's
        # total_click_count and last_clicked_at fields
        
        await self.db.commit()
        await self.db.refresh(click)
        
        return click
    
    async def get_piece_progress(
        self,
        piece_tag_id: UUID,
        student_id: UUID
    ) -> PieceProgress:
        """Get detailed progress for a piece"""
        # Get the piece tag
        tag_query = select(Tag).where(Tag.id == piece_tag_id)
        tag_result = await self.db.execute(tag_query)
        tag = tag_result.scalar_one_or_none()
        
        if not tag:
            raise ValueError("Invalid piece tag ID")
        
        # Get all segments for the piece
        segments = await self.get_piece_segments(piece_tag_id, student_id)
        
        # Calculate aggregated stats
        total_segments = len(segments)
        completed_segments = sum(1 for s in segments if s.is_completed)
        total_clicks = sum(s.total_click_count for s in segments)
        
        # Get practice date range
        click_query = (
            select(
                func.min(SegmentClick.clicked_at).label("first_date"),
                func.max(SegmentClick.clicked_at).label("last_date"),
                func.count(func.distinct(func.date(SegmentClick.clicked_at))).label("days_practiced")
            )
            .join(PracticeSegment)
            .where(
                and_(
                    PracticeSegment.piece_tag_id == piece_tag_id,
                    PracticeSegment.student_id == student_id
                )
            )
        )
        
        click_result = await self.db.execute(click_query)
        click_stats = click_result.one()
        
        completion_percentage = (
            (completed_segments / total_segments * 100) if total_segments > 0 else 0
        )
        
        return PieceProgress(
            piece_tag_id=piece_tag_id,
            piece_name=tag.name,
            composer=tag.composer,
            total_segments=total_segments,
            completed_segments=completed_segments,
            total_clicks=total_clicks,
            days_practiced=click_stats.days_practiced or 0,
            first_practice_date=click_stats.first_date,
            last_practice_date=click_stats.last_date,
            completion_percentage=completion_percentage,
            segments=segments
        )
    
    async def get_segment_analytics(
        self,
        segment_id: UUID,
        student_id: UUID
    ) -> dict:
        """Get detailed analytics for a segment"""
        # This would use the segment_practice_analytics view
        query = f"""
            SELECT 
                segment_id,
                segment_name,
                piece_name,
                total_click_count,
                is_completed,
                days_practiced,
                first_practice_date,
                last_practice_date,
                daily_practice_data
            FROM segment_practice_analytics
            WHERE segment_id = :segment_id AND student_id = :student_id
        """
        
        result = await self.db.execute(
            query,
            {"segment_id": segment_id, "student_id": student_id}
        )
        
        row = result.one_or_none()
        if not row:
            return None
        
        return dict(row)
    
    async def get_overall_segment_analytics(
        self,
        student_id: UUID,
        days: int = 30
    ) -> dict:
        """Get overall practice focus analytics for all segments"""
        from datetime import timedelta
        
        # Calculate date range
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days)
        
        # Get all segments with click data
        segments_query = text("""
            SELECT 
                ps.id as segment_id,
                ps.name as segment_name,
                ps.description,
                ps.is_completed,
                ps.total_click_count,
                ps.created_at,
                t.name as piece_name,
                t.composer,
                t.is_archived as piece_archived,
                COUNT(DISTINCT DATE(sc.created_at)) as days_practiced,
                COUNT(sc.id) as recent_clicks,
                MAX(sc.created_at) as last_clicked
            FROM practice_segments ps
            JOIN tags t ON ps.piece_tag_id = t.id
            LEFT JOIN segment_clicks sc ON ps.id = sc.segment_id 
                AND sc.created_at >= :start_date
            WHERE ps.student_id = :student_id
            GROUP BY ps.id, ps.name, ps.description, ps.is_completed, 
                     ps.total_click_count, ps.created_at, t.name, t.composer, t.is_archived
            ORDER BY ps.total_click_count DESC
        """)
        
        result = await self.db.execute(
            segments_query,
            {"student_id": student_id, "start_date": start_date}
        )
        all_segments = result.fetchall()
        
        # Get daily click distribution
        daily_clicks_query = text("""
            SELECT 
                DATE(sc.created_at) as practice_date,
                COUNT(*) as click_count,
                COUNT(DISTINCT sc.segment_id) as segments_practiced
            FROM segment_clicks sc
            JOIN practice_segments ps ON sc.segment_id = ps.id
            WHERE ps.student_id = :student_id
                AND sc.created_at >= :start_date
            GROUP BY DATE(sc.created_at)
            ORDER BY practice_date DESC
        """)
        
        daily_result = await self.db.execute(
            daily_clicks_query,
            {"student_id": student_id, "start_date": start_date}
        )
        daily_clicks = daily_result.fetchall()
        
        # Get most clicked segments in period
        top_segments = [
            {
                "segment_id": str(seg.segment_id),
                "segment_name": seg.segment_name,
                "piece_name": seg.piece_name,
                "total_clicks": seg.total_click_count,
                "recent_clicks": seg.recent_clicks,
                "days_practiced": seg.days_practiced,
                "is_completed": seg.is_completed,
                "last_clicked": seg.last_clicked.isoformat() if seg.last_clicked else None
            }
            for seg in all_segments[:10]  # Top 10 most clicked
        ]
        
        # Get least practiced segments (need attention)
        needs_attention = [
            {
                "segment_id": str(seg.segment_id),
                "segment_name": seg.segment_name,
                "piece_name": seg.piece_name,
                "total_clicks": seg.total_click_count,
                "recent_clicks": seg.recent_clicks,
                "days_practiced": seg.days_practiced,
                "is_completed": seg.is_completed,
                "created_days_ago": (end_date - seg.created_at).days
            }
            for seg in all_segments
            if not seg.is_completed and seg.recent_clicks < 5 and not seg.piece_archived
        ][:10]
        
        # Calculate statistics
        total_segments = len(all_segments)
        completed_segments = sum(1 for seg in all_segments if seg.is_completed)
        active_segments = sum(1 for seg in all_segments if not seg.piece_archived and not seg.is_completed)
        total_clicks_period = sum(seg.recent_clicks for seg in all_segments)
        
        # Get practice consistency
        practice_days = len(daily_clicks)
        consistency_percentage = (practice_days / days * 100) if days > 0 else 0
        
        return {
            "period_days": days,
            "statistics": {
                "total_segments": total_segments,
                "completed_segments": completed_segments,
                "active_segments": active_segments,
                "total_clicks_period": total_clicks_period,
                "practice_days": practice_days,
                "consistency_percentage": round(consistency_percentage, 1),
                "avg_clicks_per_day": round(total_clicks_period / practice_days, 1) if practice_days > 0 else 0,
                "avg_segments_per_day": round(sum(d.segments_practiced for d in daily_clicks) / practice_days, 1) if practice_days > 0 else 0
            },
            "top_practiced_segments": top_segments,
            "needs_attention": needs_attention,
            "daily_activity": [
                {
                    "date": d.practice_date.isoformat(),
                    "clicks": d.click_count,
                    "segments_practiced": d.segments_practiced
                }
                for d in daily_clicks
            ],
            "all_segments": [
                {
                    "segment_id": str(seg.segment_id),
                    "segment_name": seg.segment_name,
                    "piece_name": seg.piece_name,
                    "composer": seg.composer,
                    "total_clicks": seg.total_click_count,
                    "recent_clicks": seg.recent_clicks,
                    "days_practiced": seg.days_practiced,
                    "is_completed": seg.is_completed,
                    "piece_archived": seg.piece_archived,
                    "last_clicked": seg.last_clicked.isoformat() if seg.last_clicked else None
                }
                for seg in all_segments
            ]
        }
    
    async def archive_piece(
        self, 
        piece_id: UUID, 
        student_id: UUID
    ) -> Optional[dict]:
        """Archive a piece and return summary statistics"""
        # First check if the piece exists and belongs to the student
        piece_query = (
            select(Tag)
            .where(
                and_(
                    Tag.id == piece_id,
                    Tag.tag_type == 'piece',
                    Tag.owner_teacher_id.is_(None)
                )
            )
        )
        result = await self.db.execute(piece_query)
        piece = result.scalar_one_or_none()
        
        if not piece:
            return None
        
        # Update the piece to archived
        piece.is_archived = True
        # archived_at will be set automatically by database trigger
        
        # Mark all segments as completed
        await self.db.execute(
            text("""
                UPDATE practice_segments 
                SET is_completed = TRUE, 
                    completed_at = CURRENT_TIMESTAMP
                WHERE piece_tag_id = :piece_id 
                AND student_id = :student_id
                AND is_completed = FALSE
            """),
            {"piece_id": piece_id, "student_id": student_id}
        )
        
        # Get summary statistics
        summary_query = (
            select(
                func.count(PracticeSegment.id).label('total_segments'),
                func.count(PracticeSegment.id).filter(
                    PracticeSegment.is_completed == True
                ).label('completed_segments'),
                func.sum(PracticeSegment.total_click_count).label('total_clicks'),
                func.count(func.distinct(SegmentClick.session_id)).label('sessions_practiced'),
                func.min(SegmentClick.clicked_at).label('first_practiced'),
                func.max(SegmentClick.clicked_at).label('last_practiced')
            )
            .select_from(PracticeSegment)
            .outerjoin(SegmentClick, SegmentClick.segment_id == PracticeSegment.id)
            .where(
                and_(
                    PracticeSegment.piece_tag_id == piece_id,
                    PracticeSegment.student_id == student_id
                )
            )
        )
        
        result = await self.db.execute(summary_query)
        stats = result.one()
        
        # Get timer statistics for this piece
        timer_query = (
            select(
                func.count(func.distinct(SessionTimer.session_id)).label('sessions_with_timer'),
                func.sum(SessionTimer.total_seconds).label('total_timer_seconds'),
                func.avg(SessionTimer.total_seconds).label('avg_timer_seconds'),
                func.count(func.distinct(SessionTimer.id)).filter(
                    SessionTimer.total_seconds > 0
                ).label('sessions_with_active_timer')
            )
            .select_from(PracticeSession)
            .join(SessionTimer, SessionTimer.session_id == PracticeSession.id)
            .where(
                and_(
                    PracticeSession.primary_piece_tag_id == piece_id,
                    PracticeSession.student_id == student_id
                )
            )
        )
        
        timer_result = await self.db.execute(timer_query)
        timer_stats = timer_result.one()
        
        # Get all segments with their stats
        segments_query = (
            select(
                PracticeSegment.id,
                PracticeSegment.name,
                PracticeSegment.description,
                PracticeSegment.total_click_count,
                PracticeSegment.is_completed,
                PracticeSegment.created_at,
                PracticeSegment.last_clicked_at
            )
            .where(
                and_(
                    PracticeSegment.piece_tag_id == piece_id,
                    PracticeSegment.student_id == student_id
                )
            )
            .order_by(PracticeSegment.display_order, PracticeSegment.created_at)
        )
        
        segments_result = await self.db.execute(segments_query)
        segments = [row._asdict() for row in segments_result]
        
        await self.db.commit()
        
        return {
            'piece': {
                'id': str(piece.id),
                'name': piece.name,
                'composer': piece.composer,
                'opus_number': piece.opus_number,
                'difficulty_level': piece.difficulty_level,
                'archived_at': piece.archived_at.isoformat() if piece.archived_at else None
            },
            'summary': {
                'total_segments': stats.total_segments or 0,
                'completed_segments': stats.completed_segments or 0,
                'total_clicks': stats.total_clicks or 0,
                'sessions_practiced': stats.sessions_practiced or 0,
                'first_practiced': stats.first_practiced.isoformat() if stats.first_practiced else None,
                'last_practiced': stats.last_practiced.isoformat() if stats.last_practiced else None,
                'completion_percentage': (
                    (stats.completed_segments / stats.total_segments * 100) 
                    if stats.total_segments > 0 else 0
                ),
                'total_practice_seconds': timer_stats.total_timer_seconds or 0,
                'avg_practice_seconds': int(timer_stats.avg_timer_seconds) if timer_stats.avg_timer_seconds else 0,
                'sessions_with_timer': timer_stats.sessions_with_timer or 0
            },
            'segments': segments
        }
    
    async def unarchive_piece(
        self, 
        piece_id: UUID, 
        student_id: UUID
    ) -> bool:
        """Unarchive a piece"""
        piece_query = (
            select(Tag)
            .where(
                and_(
                    Tag.id == piece_id,
                    Tag.tag_type == 'piece',
                    Tag.is_archived == True,
                    Tag.owner_teacher_id.is_(None)
                )
            )
        )
        result = await self.db.execute(piece_query)
        piece = result.scalar_one_or_none()
        
        if not piece:
            return False
        
        piece.is_archived = False
        piece.archived_at = None
        await self.db.commit()
        
        return True
    
    async def get_archived_pieces(
        self, 
        student_id: UUID
    ) -> List[dict]:
        """Get all archived pieces with summaries for a specific student"""
        # Can't use the view because it aggregates across all students
        # Need to calculate stats for this specific student only
        query = """
            WITH segment_stats AS (
                SELECT 
                    ps.piece_tag_id,
                    COUNT(DISTINCT ps.id) as total_segments,
                    COUNT(DISTINCT ps.id) FILTER (WHERE ps.is_completed = true) as completed_segments,
                    COALESCE(SUM(ps.total_click_count), 0) as total_clicks
                FROM practice_segments ps
                WHERE ps.student_id = :student_id
                GROUP BY ps.piece_tag_id
            ),
            click_stats AS (
                SELECT 
                    ps.piece_tag_id,
                    COUNT(DISTINCT sc.session_id) as sessions_practiced,
                    MIN(sc.clicked_at) as first_practiced,
                    MAX(sc.clicked_at) as last_practiced
                FROM practice_segments ps
                LEFT JOIN segment_clicks sc ON sc.segment_id = ps.id
                WHERE ps.student_id = :student_id
                GROUP BY ps.piece_tag_id
            )
            SELECT 
                t.id as piece_id,
                t.name as piece_name,
                t.composer,
                t.opus_number,
                t.difficulty_level,
                t.archived_at,
                t.created_at,
                COALESCE(ss.total_segments, 0) as total_segments,
                COALESCE(ss.completed_segments, 0) as completed_segments,
                COALESCE(ss.total_clicks, 0) as total_clicks,
                COALESCE(cs.sessions_practiced, 0) as sessions_practiced,
                cs.first_practiced,
                cs.last_practiced
            FROM tags t
            LEFT JOIN segment_stats ss ON ss.piece_tag_id = t.id
            LEFT JOIN click_stats cs ON cs.piece_tag_id = t.id
            WHERE t.tag_type = 'piece' 
            AND t.is_archived = true
            AND t.owner_teacher_id IS NULL
            ORDER BY t.archived_at DESC
        """
        
        result = await self.db.execute(
            text(query),
            {"student_id": student_id}
        )
        
        pieces = []
        for row in result:
            pieces.append({
                'piece_id': str(row.piece_id),
                'piece_name': row.piece_name,
                'composer': row.composer,
                'opus_number': row.opus_number,
                'difficulty_level': row.difficulty_level,
                'archived_at': row.archived_at.isoformat() if row.archived_at else None,
                'created_at': row.created_at.isoformat(),
                'total_segments': row.total_segments or 0,
                'completed_segments': row.completed_segments or 0,
                'total_clicks': row.total_clicks or 0,
                'sessions_practiced': row.sessions_practiced or 0,
                'first_practiced': row.first_practiced.isoformat() if row.first_practiced else None,
                'last_practiced': row.last_practiced.isoformat() if row.last_practiced else None,
                'completion_percentage': (
                    (row.completed_segments / row.total_segments * 100) 
                    if row.total_segments and row.total_segments > 0 else 0
                )
            })
        
        return pieces
    
    async def get_archived_piece_details(
        self, 
        piece_id: UUID, 
        student_id: UUID
    ) -> Optional[dict]:
        """Get full details of an archived piece including all segments"""
        # First check if the piece exists and is archived
        piece_query = (
            select(Tag)
            .where(
                and_(
                    Tag.id == piece_id,
                    Tag.tag_type == 'piece',
                    Tag.is_archived == True,
                    Tag.owner_teacher_id.is_(None)
                )
            )
        )
        result = await self.db.execute(piece_query)
        piece = result.scalar_one_or_none()
        
        if not piece:
            return None
        
        # Get summary statistics - separate queries to avoid JOIN multiplication
        # First get segment counts without joins
        segment_stats_query = (
            select(
                func.count(PracticeSegment.id).label('total_segments'),
                func.count(PracticeSegment.id).filter(
                    PracticeSegment.is_completed == True
                ).label('completed_segments'),
                func.sum(PracticeSegment.total_click_count).label('total_clicks')
            )
            .select_from(PracticeSegment)
            .where(
                and_(
                    PracticeSegment.piece_tag_id == piece_id,
                    PracticeSegment.student_id == student_id
                )
            )
        )
        
        segment_result = await self.db.execute(segment_stats_query)
        segment_stats = segment_result.one()
        
        # Then get click statistics separately
        click_stats_query = (
            select(
                func.count(func.distinct(SegmentClick.session_id)).label('sessions_practiced'),
                func.min(SegmentClick.clicked_at).label('first_practiced'),
                func.max(SegmentClick.clicked_at).label('last_practiced')
            )
            .select_from(SegmentClick)
            .join(PracticeSegment, SegmentClick.segment_id == PracticeSegment.id)
            .where(
                and_(
                    PracticeSegment.piece_tag_id == piece_id,
                    PracticeSegment.student_id == student_id
                )
            )
        )
        
        click_result = await self.db.execute(click_stats_query)
        click_stats = click_result.one()
        
        # Get all segments with their stats
        segments_query = (
            select(
                PracticeSegment.id,
                PracticeSegment.name,
                PracticeSegment.description,
                PracticeSegment.total_click_count,
                PracticeSegment.is_completed,
                PracticeSegment.created_at,
                PracticeSegment.last_clicked_at
            )
            .where(
                and_(
                    PracticeSegment.piece_tag_id == piece_id,
                    PracticeSegment.student_id == student_id
                )
            )
            .order_by(PracticeSegment.display_order, PracticeSegment.created_at)
        )
        
        segments_result = await self.db.execute(segments_query)
        segments = [row._asdict() for row in segments_result]
        
        # Get timer statistics for this piece
        timer_query = (
            select(
                func.count(func.distinct(SessionTimer.session_id)).label('sessions_with_timer'),
                func.sum(SessionTimer.total_seconds).label('total_timer_seconds'),
                func.avg(SessionTimer.total_seconds).label('avg_timer_seconds')
            )
            .select_from(PracticeSession)
            .join(SessionTimer, SessionTimer.session_id == PracticeSession.id)
            .where(
                and_(
                    PracticeSession.primary_piece_tag_id == piece_id,
                    PracticeSession.student_id == student_id
                )
            )
        )
        
        timer_result = await self.db.execute(timer_query)
        timer_stats = timer_result.one()
        
        return {
            'piece': {
                'id': str(piece.id),
                'name': piece.name,
                'composer': piece.composer,
                'opus_number': piece.opus_number,
                'difficulty_level': piece.difficulty_level,
                'archived_at': piece.archived_at.isoformat() if piece.archived_at else None
            },
            'summary': {
                'total_segments': segment_stats.total_segments or 0,
                'completed_segments': segment_stats.completed_segments or 0,
                'total_clicks': segment_stats.total_clicks or 0,
                'sessions_practiced': click_stats.sessions_practiced or 0,
                'first_practiced': click_stats.first_practiced.isoformat() if click_stats.first_practiced else None,
                'last_practiced': click_stats.last_practiced.isoformat() if click_stats.last_practiced else None,
                'completion_percentage': (
                    (segment_stats.completed_segments / segment_stats.total_segments * 100) 
                    if segment_stats.total_segments > 0 else 0
                ),
                'total_practice_seconds': timer_stats.total_timer_seconds or 0,
                'avg_practice_seconds': int(timer_stats.avg_timer_seconds) if timer_stats.avg_timer_seconds else 0,
                'sessions_with_timer': timer_stats.sessions_with_timer or 0
            },
            'segments': segments
        }