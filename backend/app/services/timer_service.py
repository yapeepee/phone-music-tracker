from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
from sqlalchemy import text

from app.models.timer import SessionTimer, TimerEvent
from app.schemas.timer import (
    SessionTimerCreate, SessionTimerUpdate, SessionTimer as SessionTimerSchema,
    TimerEventCreate, TimerEvent as TimerEventSchema, TimerSummary
)


class TimerService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_session_timer(
        self, 
        timer_data: SessionTimerCreate
    ) -> SessionTimerSchema:
        """Create a new timer for a practice session"""
        try:
            # Create the session timer
            session_timer = SessionTimer(
                session_id=timer_data.session_id,
                total_seconds=timer_data.total_seconds,
                is_paused=timer_data.is_paused
            )
            self.db.add(session_timer)
            await self.db.flush()
            
            # Create initial events if provided
            for event_data in timer_data.events:
                event = TimerEvent(
                    session_timer_id=session_timer.id,
                    event_type=event_data.event_type,
                    event_timestamp=event_data.event_timestamp
                )
                self.db.add(event)
            
            await self.db.commit()
            await self.db.refresh(session_timer, ["events"])
            
            return SessionTimerSchema.model_validate(session_timer)
            
        except IntegrityError:
            await self.db.rollback()
            raise ValueError("Timer already exists for this session")

    async def get_session_timer(self, session_id: UUID) -> Optional[SessionTimerSchema]:
        """Get timer for a specific session"""
        result = await self.db.execute(
            select(SessionTimer)
            .options(selectinload(SessionTimer.events))
            .where(SessionTimer.session_id == session_id)
        )
        timer = result.scalar_one_or_none()
        
        if not timer:
            return None
            
        return SessionTimerSchema.model_validate(timer)

    async def update_session_timer(
        self, 
        session_id: UUID, 
        update_data: SessionTimerUpdate
    ) -> SessionTimerSchema:
        """Update timer for a session"""
        result = await self.db.execute(
            select(SessionTimer).where(SessionTimer.session_id == session_id)
        )
        timer = result.scalar_one_or_none()
        
        if not timer:
            raise ValueError("Timer not found for this session")
        
        update_dict = update_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(timer, field, value)
        
        timer.updated_at = datetime.now(timezone.utc)
        
        await self.db.commit()
        await self.db.refresh(timer, ["events"])
        
        return SessionTimerSchema.model_validate(timer)

    async def add_timer_event(
        self, 
        session_id: UUID, 
        event_data: TimerEventCreate
    ) -> TimerEventSchema:
        """Add a new timer event (pause/resume)"""
        # Get the timer
        result = await self.db.execute(
            select(SessionTimer).where(SessionTimer.session_id == session_id)
        )
        timer = result.scalar_one_or_none()
        
        if not timer:
            raise ValueError("Timer not found for this session")
        
        # Create the event
        event = TimerEvent(
            session_timer_id=timer.id,
            event_type=event_data.event_type,
            event_timestamp=event_data.event_timestamp
        )
        self.db.add(event)
        
        # Update timer pause state
        if event_data.event_type == 'pause':
            timer.is_paused = True
        elif event_data.event_type == 'resume':
            timer.is_paused = False
        
        timer.updated_at = datetime.now(timezone.utc)
        
        await self.db.commit()
        await self.db.refresh(event)
        
        return TimerEventSchema.model_validate(event)

    async def get_timer_summary(self, session_id: UUID) -> Optional[TimerSummary]:
        """Get a summary of timer data for a session"""
        timer = await self.get_session_timer(session_id)
        if not timer:
            return None
        
        # Calculate pause time
        pause_count = 0
        total_pause_seconds = 0
        pause_start = None
        
        for event in sorted(timer.events, key=lambda e: e.event_timestamp):
            if event.event_type == 'pause':
                pause_count += 1
                pause_start = event.event_timestamp
            elif event.event_type == 'resume' and pause_start:
                pause_duration = (event.event_timestamp - pause_start).total_seconds()
                total_pause_seconds += pause_duration
                pause_start = None
        
        return TimerSummary(
            total_seconds=timer.total_seconds,
            pause_count=pause_count,
            total_pause_seconds=int(total_pause_seconds),
            events=timer.events
        )

    async def get_piece_timer_stats(self, piece_id: UUID, student_id: UUID) -> Dict[str, Any]:
        """Get timer statistics for a specific piece"""
        query = """
            SELECT 
                COUNT(DISTINCT ps.id) as session_count,
                SUM(st.total_seconds) as total_seconds,
                AVG(st.total_seconds) as avg_seconds,
                MAX(st.total_seconds) as max_seconds,
                COUNT(DISTINCT te.id) FILTER (WHERE te.event_type = 'pause') as total_pauses
            FROM practice_sessions ps
            LEFT JOIN session_timers st ON ps.id = st.session_id
            LEFT JOIN timer_events te ON st.id = te.session_timer_id
            WHERE ps.primary_piece_tag_id = :piece_id
            AND ps.student_id = :student_id
            GROUP BY ps.primary_piece_tag_id
        """
        
        result = await self.db.execute(
            text(query),
            {"piece_id": piece_id, "student_id": student_id}
        )
        row = result.first()
        
        if not row:
            return {
                "session_count": 0,
                "total_seconds": 0,
                "avg_seconds": 0,
                "max_seconds": 0,
                "total_pauses": 0
            }
        
        return {
            "session_count": row.session_count or 0,
            "total_seconds": row.total_seconds or 0,
            "avg_seconds": int(row.avg_seconds) if row.avg_seconds else 0,
            "max_seconds": row.max_seconds or 0,
            "total_pauses": row.total_pauses or 0
        }