"""Reputation system models."""
from typing import Optional, TYPE_CHECKING
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP
from sqlalchemy.orm import relationship, Mapped, mapped_column
import uuid

from app.db.base_class import Base

if TYPE_CHECKING:
    from app.models.user import User


class ReputationHistory(Base):
    """Track reputation changes for users."""
    __tablename__ = "reputation_history"
    __table_args__ = (
        UniqueConstraint('user_id', 'reason', 'reference_id', name='unique_reputation_event'),
    )
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # What caused the reputation change
    reason: Mapped[str] = mapped_column(String(50), nullable=False)
    # Reference to the specific item (post, comment, session, etc)
    reference_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True))
    
    # Points change (can be positive or negative)
    points_change: Mapped[int] = mapped_column(Integer, nullable=False)
    # Total points after this change
    total_points: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # Additional context
    description: Mapped[Optional[str]] = mapped_column(Text)
    
    # Timestamp
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="reputation_history")
    
    def __repr__(self) -> str:
        return f"<ReputationHistory {self.user_id} {self.reason} {self.points_change:+d}>"


# Reputation point values
REPUTATION_POINTS = {
    # Forum activity
    "post_upvoted": 5,
    "post_downvoted": -2,
    "comment_upvoted": 2,
    "comment_downvoted": -1,
    "answer_accepted": 15,
    "accepted_answer": 2,  # For the asker
    "first_post_daily": 2,
    
    # Practice activity (students)
    "practice_completed": 1,
    "practice_streak_7": 10,
    "practice_streak_30": 50,
    
    # Teaching activity (teachers)
    "feedback_given": 3,
    "student_milestone": 10,
}