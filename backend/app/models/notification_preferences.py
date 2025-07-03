"""Notification preferences model for user notification settings."""
from typing import Optional, Dict
from datetime import datetime, time
from sqlalchemy import Column, String, Integer, Text, ForeignKey, Boolean, JSON, Time
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP
from sqlalchemy.orm import relationship, Mapped, mapped_column
import uuid

from app.db.base_class import Base


class NotificationPreferences(Base):
    __tablename__ = "notification_preferences"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)
    
    # Global settings
    global_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Notification type preferences
    practice_reminders: Mapped[bool] = mapped_column(Boolean, default=True)
    session_feedback: Mapped[bool] = mapped_column(Boolean, default=True)
    video_processing: Mapped[bool] = mapped_column(Boolean, default=True)
    achievements: Mapped[bool] = mapped_column(Boolean, default=True)
    event_reminders: Mapped[bool] = mapped_column(Boolean, default=True)
    system_announcements: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Quiet hours settings
    quiet_hours_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    quiet_hours_start: Mapped[Optional[time]] = mapped_column(Time)  # HH:MM:SS format
    quiet_hours_end: Mapped[Optional[time]] = mapped_column(Time)    # HH:MM:SS format
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="notification_preferences")
    
    def __repr__(self) -> str:
        return f"<NotificationPreferences {self.id} - User {self.user_id}>"