"""
Service for tempo tracking and slow practice enforcement
"""
from datetime import datetime, timezone
from typing import List, Optional, Dict
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc
from sqlalchemy.orm import selectinload

from app.models.tempo import TempoTracking, TempoAchievement
from app.models.practice import PracticeSession
from app.models.user import Student
from app.schemas.tempo import (
    TempoTrackingCreate,
    TempoTrackingBatch,
    TempoStats,
    AchievementProgress
)


class TempoService:
    """Service for managing tempo tracking and achievements"""
    
    # Achievement type constants
    ACHIEVEMENT_ZEN_MASTER = "zen_master"
    ACHIEVEMENT_PATIENCE_PADAWAN = "patience_padawan"
    ACHIEVEMENT_SLOW_AND_STEADY = "slow_and_steady"
    ACHIEVEMENT_TEMPO_DISCIPLINE = "tempo_discipline"
    ACHIEVEMENT_MEDITATION_MASTER = "meditation_master"
    ACHIEVEMENT_FIRST_SLOW_PRACTICE = "first_slow_practice"
    
    # Points calculation constants
    POINTS_PER_MINUTE_UNDER = 1
    POINTS_PER_MINUTE_20_UNDER = 2
    POINTS_PER_MINUTE_MEDITATION = 3
    
    def __init__(self, db: AsyncSession):
        self.db = db
        
    async def record_tempo_entry(
        self,
        session_id: UUID,
        entry: TempoTrackingCreate
    ) -> TempoTracking:
        """Record a single tempo tracking entry"""
        # Get the session to verify it exists
        session = await self.db.get(PracticeSession, session_id)
        if not session:
            raise ValueError("Practice session not found")
            
        # Calculate points based on tempo difference
        tempo_diff_percent = (entry.target_tempo - entry.actual_tempo) / entry.target_tempo * 100
        
        points = 0
        if entry.is_under_tempo:
            if tempo_diff_percent >= 20:  # 20% or more under tempo
                points = self.POINTS_PER_MINUTE_20_UNDER
            else:
                points = self.POINTS_PER_MINUTE_UNDER
                
            # Meditation mode bonus
            if session.practice_mode == "meditation" and entry.actual_tempo < 60:
                points = self.POINTS_PER_MINUTE_MEDITATION
        
        # Create tempo tracking entry
        db_entry = TempoTracking(
            session_id=session_id,
            actual_tempo=entry.actual_tempo,
            target_tempo=entry.target_tempo,
            is_under_tempo=entry.is_under_tempo,
            points_earned=points
        )
        
        self.db.add(db_entry)
        await self.db.commit()
        await self.db.refresh(db_entry)
        
        # Check for achievements
        await self._check_achievements(session.student_id, session_id)
        
        return db_entry
        
    async def record_tempo_batch(
        self,
        session_id: UUID,
        batch: TempoTrackingBatch
    ) -> List[TempoTracking]:
        """Record multiple tempo tracking entries at once"""
        entries = []
        for entry in batch.entries:
            db_entry = await self.record_tempo_entry(session_id, entry)
            entries.append(db_entry)
        return entries
        
    async def get_session_tempo_stats(self, session_id: UUID) -> TempoStats:
        """Get tempo statistics for a practice session"""
        # Get all tempo entries for the session
        query = select(TempoTracking).where(TempoTracking.session_id == session_id)
        result = await self.db.execute(query)
        entries = result.scalars().all()
        
        if not entries:
            # Get session to return basic stats
            session = await self.db.get(PracticeSession, session_id)
            return TempoStats(
                session_id=session_id,
                average_tempo=0,
                target_tempo=session.target_tempo or 0,
                time_under_tempo_seconds=0,
                time_over_tempo_seconds=0,
                total_points_earned=0,
                compliance_percentage=0
            )
        
        # Calculate statistics
        total_entries = len(entries)
        under_tempo_entries = sum(1 for e in entries if e.is_under_tempo)
        total_tempo = sum(e.actual_tempo for e in entries)
        total_points = sum(e.points_earned for e in entries)
        
        # Assuming each entry represents ~1 second of practice
        time_under = under_tempo_entries
        time_over = total_entries - under_tempo_entries
        
        return TempoStats(
            session_id=session_id,
            average_tempo=total_tempo / total_entries if total_entries > 0 else 0,
            target_tempo=entries[0].target_tempo if entries else 0,
            time_under_tempo_seconds=time_under,
            time_over_tempo_seconds=time_over,
            total_points_earned=total_points,
            compliance_percentage=(under_tempo_entries / total_entries * 100) if total_entries > 0 else 0
        )
        
    async def get_student_achievements(self, student_id: UUID) -> List[TempoAchievement]:
        """Get all tempo achievements for a student"""
        query = select(TempoAchievement).where(
            TempoAchievement.student_id == student_id
        ).order_by(desc(TempoAchievement.unlocked_at))
        
        result = await self.db.execute(query)
        return result.scalars().all()
        
    async def get_achievement_progress(
        self,
        student_id: UUID,
        achievement_type: str
    ) -> AchievementProgress:
        """Get progress towards a specific achievement"""
        # Check if already unlocked
        query = select(TempoAchievement).where(
            and_(
                TempoAchievement.student_id == student_id,
                TempoAchievement.achievement_type == achievement_type
            )
        )
        result = await self.db.execute(query)
        existing = result.scalar_one_or_none()
        
        current_progress = 0
        required_progress = 0
        
        # Calculate progress based on achievement type
        if achievement_type == self.ACHIEVEMENT_ZEN_MASTER:
            # 30 minutes in meditation mode
            required_progress = 30 * 60  # seconds
            current_progress = await self._get_meditation_time(student_id)
            
        elif achievement_type == self.ACHIEVEMENT_PATIENCE_PADAWAN:
            # First 10 minutes under tempo
            required_progress = 10 * 60  # seconds
            current_progress = await self._get_under_tempo_time(student_id)
            
        elif achievement_type == self.ACHIEVEMENT_SLOW_AND_STEADY:
            # 7 day slow practice streak
            required_progress = 7
            current_progress = await self._get_slow_practice_streak(student_id)
            
        elif achievement_type == self.ACHIEVEMENT_TEMPO_DISCIPLINE:
            # 100 total slow practice points
            required_progress = 100
            current_progress = await self._get_total_points(student_id)
            
        percentage = min((current_progress / required_progress * 100) if required_progress > 0 else 0, 100)
        
        return AchievementProgress(
            achievement_type=achievement_type,
            current_progress=current_progress,
            required_progress=required_progress,
            percentage_complete=percentage,
            is_unlocked=existing is not None,
            level=existing.level if existing else 0
        )
        
    async def _check_achievements(self, student_id: UUID, session_id: UUID):
        """Check and unlock achievements based on current progress"""
        # Check each achievement type
        achievements_to_check = [
            (self.ACHIEVEMENT_FIRST_SLOW_PRACTICE, self._check_first_slow_practice),
            (self.ACHIEVEMENT_PATIENCE_PADAWAN, self._check_patience_padawan),
            (self.ACHIEVEMENT_ZEN_MASTER, self._check_zen_master),
            (self.ACHIEVEMENT_TEMPO_DISCIPLINE, self._check_tempo_discipline),
        ]
        
        for achievement_type, check_func in achievements_to_check:
            # Skip if already unlocked
            existing = await self.db.execute(
                select(TempoAchievement).where(
                    and_(
                        TempoAchievement.student_id == student_id,
                        TempoAchievement.achievement_type == achievement_type
                    )
                )
            )
            if existing.scalar_one_or_none():
                continue
                
            # Check if achievement criteria met
            if await check_func(student_id):
                achievement = TempoAchievement(
                    student_id=student_id,
                    achievement_type=achievement_type,
                    level=1
                )
                self.db.add(achievement)
                await self.db.commit()
                
    async def _get_meditation_time(self, student_id: UUID) -> int:
        """Get total seconds spent in meditation mode"""
        query = select(func.count(TempoTracking.id)).join(
            PracticeSession
        ).where(
            and_(
                PracticeSession.student_id == student_id,
                PracticeSession.practice_mode == "meditation",
                TempoTracking.actual_tempo < 60,
                TempoTracking.is_under_tempo == True
            )
        )
        result = await self.db.execute(query)
        return result.scalar() or 0
        
    async def _get_under_tempo_time(self, student_id: UUID) -> int:
        """Get total seconds spent under tempo"""
        query = select(func.count(TempoTracking.id)).join(
            PracticeSession
        ).where(
            and_(
                PracticeSession.student_id == student_id,
                TempoTracking.is_under_tempo == True
            )
        )
        result = await self.db.execute(query)
        return result.scalar() or 0
        
    async def _get_slow_practice_streak(self, student_id: UUID) -> int:
        """Get current slow practice streak in days"""
        # This is simplified - in production would need more complex logic
        # to track consecutive days
        query = select(
            func.count(func.distinct(func.date(PracticeSession.start_time)))
        ).join(
            TempoTracking
        ).where(
            and_(
                PracticeSession.student_id == student_id,
                PracticeSession.practice_mode.in_(["slow_practice", "meditation"]),
                TempoTracking.is_under_tempo == True
            )
        )
        result = await self.db.execute(query)
        return result.scalar() or 0
        
    async def _get_total_points(self, student_id: UUID) -> int:
        """Get total tempo points earned"""
        query = select(func.sum(TempoTracking.points_earned)).join(
            PracticeSession
        ).where(
            PracticeSession.student_id == student_id
        )
        result = await self.db.execute(query)
        return result.scalar() or 0
        
    async def _check_first_slow_practice(self, student_id: UUID) -> bool:
        """Check if student has done their first slow practice"""
        count = await self._get_under_tempo_time(student_id)
        return count > 0
        
    async def _check_patience_padawan(self, student_id: UUID) -> bool:
        """Check if student has 10 minutes under tempo"""
        time = await self._get_under_tempo_time(student_id)
        return time >= 600  # 10 minutes
        
    async def _check_zen_master(self, student_id: UUID) -> bool:
        """Check if student has 30 minutes in meditation mode"""
        time = await self._get_meditation_time(student_id)
        return time >= 1800  # 30 minutes
        
    async def _check_tempo_discipline(self, student_id: UUID) -> bool:
        """Check if student has earned 100 points"""
        points = await self._get_total_points(student_id)
        return points >= 100