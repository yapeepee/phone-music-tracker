"""
Tempo tracking models for slow practice enforcement
"""
import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, Boolean, TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base

if TYPE_CHECKING:
    from app.models.practice import PracticeSession
    from app.models.user import Student


class TempoTracking(Base):
    """Records tempo data during practice sessions"""
    __tablename__ = "tempo_tracking"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("practice_sessions.id"), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)
    actual_tempo: Mapped[int] = mapped_column(Integer, nullable=False)
    target_tempo: Mapped[int] = mapped_column(Integer, nullable=False)
    is_under_tempo: Mapped[bool] = mapped_column(Boolean, nullable=False)
    points_earned: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    
    # Relationships
    session: Mapped["PracticeSession"] = relationship("PracticeSession", back_populates="tempo_tracking")
    
    def __repr__(self) -> str:
        return f"<TempoTracking session={self.session_id} actual={self.actual_tempo} target={self.target_tempo}>"


class TempoAchievement(Base):
    """Tracks tempo-related achievements for gamification"""
    __tablename__ = "tempo_achievements"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.user_id"), nullable=False)
    achievement_type: Mapped[str] = mapped_column(String(50), nullable=False)
    level: Mapped[int] = mapped_column(Integer, default=1)
    unlocked_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    
    # Relationships
    student: Mapped["Student"] = relationship("Student", back_populates="tempo_achievements")
    
    def __repr__(self) -> str:
        return f"<TempoAchievement {self.achievement_type} level={self.level}>"