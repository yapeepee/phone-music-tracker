"""Notification model for user notifications."""
from typing import Optional, Dict
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, ForeignKey, Boolean, JSON, Enum
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP
from sqlalchemy.orm import relationship, Mapped, mapped_column
import uuid
import enum

from app.db.base_class import Base


class NotificationType(str, enum.Enum):
    VIDEO_PROCESSING = "video_processing"
    FEEDBACK_RECEIVED = "feedback_received"
    SESSION_REMINDER = "session_reminder"
    ACHIEVEMENT_UNLOCKED = "achievement_unlocked"
    SYSTEM_ANNOUNCEMENT = "system_announcement"


class Notification(Base):
    __tablename__ = "notifications"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    type: Mapped[NotificationType] = mapped_column(Enum(NotificationType), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    data: Mapped[Optional[Dict]] = mapped_column(JSON)  # Additional data specific to notification type
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    read_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True))
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="notifications")
    
    def __repr__(self) -> str:
        return f"<Notification {self.id} - {self.type}>"