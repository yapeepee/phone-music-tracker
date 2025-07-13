from typing import Optional, List
from datetime import datetime, timedelta
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, case, or_, String
from sqlalchemy.orm import selectinload

from app.models.practice import PracticeSession, Tag, Metric, Feedback, Video, session_tags
from app.models.user import Student
from app.schemas.practice import (
    PracticeSessionCreate,
    PracticeSessionUpdate,
    PracticeStatistics,
    TagCreate,
)


class SessionService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_session(
        self,
        student_id: UUID,
        session_data: PracticeSessionCreate
    ) -> PracticeSession:
        """Create a new practice session"""
        # Create session
        db_session = PracticeSession(
            student_id=student_id,
            focus=session_data.focus,
            start_time=session_data.start_time,
            end_time=session_data.end_time,
            self_rating=session_data.self_rating,
            note=session_data.note,
            target_tempo=session_data.target_tempo,
            practice_mode=session_data.practice_mode,
            is_synced=True,  # Created via API, so it's synced
        )
        
        # Handle tags
        if session_data.tags:
            tags = await self._get_or_create_tags(session_data.tags)
            db_session.tags = tags
        
        self.db.add(db_session)
        await self.db.commit()
        
        # Query back with eager loading to avoid greenlet issues
        query = select(PracticeSession).where(
            PracticeSession.id == db_session.id
        ).options(
            selectinload(PracticeSession.tags)
        )
        result = await self.db.execute(query)
        session = result.scalar_one()
        
        # Track challenge progress if session has an end time (completed)
        if session.end_time:
            from app.services.practice.challenge_service import ChallengeService
            challenge_service = ChallengeService(self.db)
            await challenge_service.track_practice_session(session)
            
            # Check for special achievements (like first session)
            from app.models.user import User
            user_query = select(User).where(User.id == student_id)
            user_result = await self.db.execute(user_query)
            user = user_result.scalar_one()
            await challenge_service.check_for_special_achievements(user)
        
        return session
    
    async def get_sessions(
        self,
        student_id: UUID,
        skip: int = 0,
        limit: int = 100,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[PracticeSession]:
        """Get practice sessions for a student"""
        query = select(PracticeSession).where(
            PracticeSession.student_id == student_id
        ).options(
            selectinload(PracticeSession.tags),
            selectinload(PracticeSession.videos),
            selectinload(PracticeSession.feedback),
        )
        
        if start_date:
            query = query.where(PracticeSession.start_time >= start_date)
        if end_date:
            query = query.where(PracticeSession.start_time <= end_date)
        
        query = query.order_by(PracticeSession.start_time.desc())
        query = query.offset(skip).limit(limit)
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_session_by_id(
        self,
        session_id: UUID,
        student_id: Optional[UUID] = None
    ) -> Optional[PracticeSession]:
        """Get a specific practice session"""
        query = select(PracticeSession).where(
            PracticeSession.id == session_id
        ).options(
            selectinload(PracticeSession.tags),
            selectinload(PracticeSession.videos),
            selectinload(PracticeSession.feedback),
            selectinload(PracticeSession.metrics),
        )
        
        if student_id:
            query = query.where(PracticeSession.student_id == student_id)
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def update_session(
        self,
        session_id: UUID,
        student_id: UUID,
        session_update: PracticeSessionUpdate
    ) -> Optional[PracticeSession]:
        """Update a practice session"""
        session = await self.get_session_by_id(session_id, student_id)
        if not session:
            return None
        
        update_data = session_update.model_dump(exclude_unset=True)
        
        # Handle tags separately
        if "tags" in update_data:
            tags = await self._get_or_create_tags(update_data.pop("tags"))
            session.tags = tags
        
        # Check if session is being completed (end_time being set)
        was_incomplete = session.end_time is None
        
        for field, value in update_data.items():
            setattr(session, field, value)
        
        self.db.add(session)
        await self.db.commit()
        await self.db.refresh(session)
        
        # Track challenge progress if session was just completed
        if was_incomplete and session.end_time is not None:
            from app.services.practice.challenge_service import ChallengeService
            challenge_service = ChallengeService(self.db)
            await challenge_service.track_practice_session(session)
            
            # Check for special achievements
            from app.models.user import User
            user_query = select(User).where(User.id == student_id)
            user_result = await self.db.execute(user_query)
            user = user_result.scalar_one()
            await challenge_service.check_for_special_achievements(user)
        
        return session
    
    async def delete_session(
        self,
        session_id: UUID,
        student_id: UUID
    ) -> bool:
        """Delete a practice session"""
        session = await self.get_session_by_id(session_id, student_id)
        if not session:
            return False
        
        await self.db.delete(session)
        await self.db.commit()
        return True
    
    async def get_statistics(
        self,
        student_id: UUID,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> PracticeStatistics:
        """Get practice statistics for a student"""
        # Base query
        query = select(PracticeSession).where(
            PracticeSession.student_id == student_id
        )
        
        if start_date:
            query = query.where(PracticeSession.start_time >= start_date)
        if end_date:
            query = query.where(PracticeSession.start_time <= end_date)
        
        # Get sessions
        result = await self.db.execute(query.options(selectinload(PracticeSession.tags)))
        sessions = result.scalars().all()
        
        # Calculate statistics
        total_sessions = len(sessions)
        total_minutes = sum(
            s.duration_minutes or 0 for s in sessions
        )
        
        # Average rating
        ratings = [s.self_rating for s in sessions if s.self_rating]
        average_rating = sum(ratings) / len(ratings) if ratings else None
        
        # Sessions by focus
        sessions_by_focus = {}
        for session in sessions:
            focus = session.focus.value
            sessions_by_focus[focus] = sessions_by_focus.get(focus, 0) + 1
        
        # Sessions by day
        sessions_by_day = {}
        for session in sessions:
            day = session.start_time.strftime("%Y-%m-%d")
            sessions_by_day[day] = sessions_by_day.get(day, 0) + 1
        
        # Calculate streak
        streak_days = await self._calculate_streak(student_id)
        
        # Most used tags
        tag_counts = {}
        for session in sessions:
            for tag in session.tags:
                tag_counts[tag.name] = tag_counts.get(tag.name, 0) + 1
        
        most_used_tags = [
            {"name": tag, "count": count}
            for tag, count in sorted(
                tag_counts.items(),
                key=lambda x: x[1],
                reverse=True
            )[:10]
        ]
        
        return PracticeStatistics(
            total_sessions=total_sessions,
            total_minutes=total_minutes,
            average_rating=average_rating,
            sessions_by_focus=sessions_by_focus,
            sessions_by_day=sessions_by_day,
            streak_days=streak_days,
            most_used_tags=most_used_tags,
        )
    
    async def _get_or_create_tags(self, tag_names: List[str]) -> List[Tag]:
        """Get existing tags or create new ones"""
        tags = []
        for name in tag_names:
            # Check if tag exists - prefer general tags first, then any tag
            # This handles cases where there might be multiple tags with same name
            query = select(Tag).where(Tag.name == name).order_by(
                # Prioritize general tags, then technique, then piece
                case(
                    (Tag.tag_type == "general", 1),
                    (Tag.tag_type == "technique", 2),
                    (Tag.tag_type == "piece", 3),
                    else_=4
                ),
                Tag.created_at  # Then by creation date
            ).limit(1)
            
            result = await self.db.execute(query)
            tag = result.scalar_one_or_none()
            
            if not tag:
                # Create new tag as general type by default
                tag = Tag(name=name, tag_type="general")
                self.db.add(tag)
            
            tags.append(tag)
        
        return tags
    
    async def _calculate_streak(self, student_id: UUID) -> int:
        """Calculate current practice streak in days"""
        # Get sessions ordered by date
        query = select(PracticeSession.start_time).where(
            PracticeSession.student_id == student_id
        ).order_by(PracticeSession.start_time.desc())
        
        result = await self.db.execute(query)
        session_dates = [s.date() for s in result.scalars().all()]
        
        if not session_dates:
            return 0
        
        # Check if practiced today or yesterday
        today = datetime.now().date()
        yesterday = today - timedelta(days=1)
        
        if session_dates[0] not in [today, yesterday]:
            return 0
        
        # Count consecutive days
        streak = 1
        for i in range(1, len(session_dates)):
            if session_dates[i] == session_dates[i-1] - timedelta(days=1):
                streak += 1
            elif session_dates[i] == session_dates[i-1]:
                # Same day, continue
                continue
            else:
                break
        
        return streak
    
    async def get_teacher_student_sessions(
        self,
        teacher_id: UUID,
        student_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[PracticeSession]:
        """Get sessions for students assigned to a teacher"""
        # First get students assigned to this teacher
        query = select(Student).where(Student.primary_teacher_id == teacher_id)
        
        if student_id:
            query = query.where(Student.user_id == student_id)
        
        result = await self.db.execute(query)
        students = result.scalars().all()
        
        if not students:
            return []
        
        student_ids = [s.user_id for s in students]
        
        # Get sessions for these students
        query = select(PracticeSession).where(
            PracticeSession.student_id.in_(student_ids)
        ).options(
            selectinload(PracticeSession.tags),
            selectinload(PracticeSession.videos),
            selectinload(PracticeSession.feedback),
            selectinload(PracticeSession.student).selectinload(Student.user),
        )
        
        query = query.order_by(PracticeSession.created_at.desc())
        query = query.offset(skip).limit(limit)
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def search_sessions(
        self,
        search_query: str,
        student_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[PracticeSession]:
        """Search practice sessions by technique (focus, notes, tags)"""
        # Build the base query
        query = select(PracticeSession).options(
            selectinload(PracticeSession.tags),
            selectinload(PracticeSession.videos),
            selectinload(PracticeSession.feedback),
        )
        
        # If student_id provided, filter by it
        if student_id:
            query = query.where(PracticeSession.student_id == student_id)
        
        # Search pattern for fuzzy matching
        search_pattern = f"%{search_query}%"
        
        # Search in multiple fields:
        # 1. Focus enum value (technique, musicality, etc.)
        # 2. Note field (could contain technique descriptions)
        # 3. Tag names (through join)
        search_conditions = []
        
        # Search in focus field (cast to string for ILIKE)
        search_conditions.append(
            func.cast(PracticeSession.focus, String).ilike(search_pattern)
        )
        
        # Search in note field
        if PracticeSession.note is not None:
            search_conditions.append(
                PracticeSession.note.ilike(search_pattern)
            )
        
        # Search in tags (exists subquery)
        tag_exists = select(1).select_from(session_tags).join(
            Tag, session_tags.c.tag_id == Tag.id
        ).where(
            and_(
                session_tags.c.session_id == PracticeSession.id,
                Tag.name.ilike(search_pattern)
            )
        ).exists()
        
        search_conditions.append(tag_exists)
        
        # Apply OR condition for all search criteria
        query = query.where(or_(*search_conditions))
        
        # Order by most recent first
        query = query.order_by(PracticeSession.created_at.desc())
        query = query.offset(skip).limit(limit)
        
        result = await self.db.execute(query)
        return result.scalars().all()