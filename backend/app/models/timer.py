from typing import Optional, List, TYPE_CHECKING
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP
from sqlalchemy.orm import relationship, Mapped, mapped_column
import uuid

from app.db.base_class import Base

if TYPE_CHECKING:
    from app.models.practice import PracticeSession


class SessionTimer(Base):
    """Model for tracking practice timer state per session"""
    __tablename__ = "session_timers"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("practice_sessions.id"), 
        nullable=False,
        unique=True
    )
    total_seconds: Mapped[int] = mapped_column(Integer, default=0)
    is_paused: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    session: Mapped["PracticeSession"] = relationship("PracticeSession", back_populates="timer")
    events: Mapped[List["TimerEvent"]] = relationship("TimerEvent", back_populates="session_timer", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        return f"<SessionTimer {self.id} for session {self.session_id}>"


class TimerEvent(Base):
    """Model for tracking timer pause/resume events"""
    __tablename__ = "timer_events"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_timer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("session_timers.id"), nullable=False)
    event_type: Mapped[str] = mapped_column(String(10), nullable=False)  # 'start', 'pause', 'resume', 'stop'
    event_timestamp: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    session_timer: Mapped["SessionTimer"] = relationship("SessionTimer", back_populates="events")
    
    def __repr__(self) -> str:
        return f"<TimerEvent {self.event_type} at {self.event_timestamp}>"