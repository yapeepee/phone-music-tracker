"""Notification preferences schemas."""
from typing import Optional
from datetime import time
from pydantic import BaseModel, Field
import uuid


class NotificationPreferencesBase(BaseModel):
    """Base schema for notification preferences."""
    global_enabled: bool = True
    practice_reminders: bool = True
    session_feedback: bool = True
    video_processing: bool = True
    achievements: bool = True
    event_reminders: bool = True
    system_announcements: bool = True
    quiet_hours_enabled: bool = False
    quiet_hours_start: Optional[time] = None
    quiet_hours_end: Optional[time] = None


class NotificationPreferencesCreate(NotificationPreferencesBase):
    """Schema for creating notification preferences."""
    pass


class NotificationPreferencesUpdate(BaseModel):
    """Schema for updating notification preferences."""
    global_enabled: Optional[bool] = None
    practice_reminders: Optional[bool] = None
    session_feedback: Optional[bool] = None
    video_processing: Optional[bool] = None
    achievements: Optional[bool] = None
    event_reminders: Optional[bool] = None
    system_announcements: Optional[bool] = None
    quiet_hours_enabled: Optional[bool] = None
    quiet_hours_start: Optional[time] = None
    quiet_hours_end: Optional[time] = None


class NotificationPreferences(NotificationPreferencesBase):
    """Schema for notification preferences response."""
    id: uuid.UUID
    user_id: uuid.UUID
    
    class Config:
        from_attributes = True


# Frontend-compatible schema
class NotificationPreferencesFrontend(BaseModel):
    """Schema matching frontend expectations."""
    global_enabled: bool = Field(alias="globalEnabled")
    types: dict = Field(default_factory=dict)
    quiet_hours: dict = Field(alias="quietHours", default_factory=dict)
    
    @classmethod
    def from_db_model(cls, db_prefs: NotificationPreferences) -> "NotificationPreferencesFrontend":
        """Convert database model to frontend format."""
        return cls(
            globalEnabled=db_prefs.global_enabled,
            types={
                "practiceReminders": db_prefs.practice_reminders,
                "sessionFeedback": db_prefs.session_feedback,
                "videoProcessing": db_prefs.video_processing,
                "achievements": db_prefs.achievements,
                "eventReminders": db_prefs.event_reminders,
                "systemAnnouncements": db_prefs.system_announcements,
            },
            quietHours={
                "enabled": db_prefs.quiet_hours_enabled,
                "startTime": db_prefs.quiet_hours_start.strftime("%H:%M") if db_prefs.quiet_hours_start else "22:00",
                "endTime": db_prefs.quiet_hours_end.strftime("%H:%M") if db_prefs.quiet_hours_end else "08:00",
            }
        )
    
    class Config:
        populate_by_name = True