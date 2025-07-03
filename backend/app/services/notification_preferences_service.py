"""Service for managing notification preferences."""
from typing import Optional
from datetime import time
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from app.models.notification_preferences import NotificationPreferences
from app.schemas.notification_preferences import (
    NotificationPreferencesCreate,
    NotificationPreferencesUpdate
)


class NotificationPreferencesService:
    """Service for notification preferences operations."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_user_preferences(self, user_id: uuid.UUID) -> Optional[NotificationPreferences]:
        """Get notification preferences for a user."""
        result = await self.db.execute(
            select(NotificationPreferences).where(
                NotificationPreferences.user_id == user_id
            )
        )
        return result.scalar_one_or_none()
    
    async def create_default_preferences(self, user_id: uuid.UUID) -> NotificationPreferences:
        """Create default notification preferences for a user."""
        preferences = NotificationPreferences(
            user_id=user_id
        )
        self.db.add(preferences)
        await self.db.commit()
        await self.db.refresh(preferences)
        return preferences
    
    async def get_or_create_preferences(self, user_id: uuid.UUID) -> NotificationPreferences:
        """Get existing preferences or create default ones."""
        preferences = await self.get_user_preferences(user_id)
        if not preferences:
            preferences = await self.create_default_preferences(user_id)
        return preferences
    
    async def update_preferences(
        self,
        user_id: uuid.UUID,
        preferences_update: NotificationPreferencesUpdate
    ) -> NotificationPreferences:
        """Update notification preferences for a user."""
        # Get existing preferences or create default
        preferences = await self.get_or_create_preferences(user_id)
        
        # Update fields
        update_data = preferences_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(preferences, field, value)
        
        await self.db.commit()
        await self.db.refresh(preferences)
        return preferences
    
    async def update_from_frontend(
        self,
        user_id: uuid.UUID,
        frontend_data: dict
    ) -> NotificationPreferences:
        """Update preferences from frontend format."""
        # Convert frontend format to database format
        update_data = NotificationPreferencesUpdate()
        
        # Global enabled
        if "globalEnabled" in frontend_data:
            update_data.global_enabled = frontend_data["globalEnabled"]
        
        # Notification types
        if "types" in frontend_data:
            types = frontend_data["types"]
            if "practiceReminders" in types:
                update_data.practice_reminders = types["practiceReminders"]
            if "sessionFeedback" in types:
                update_data.session_feedback = types["sessionFeedback"]
            if "videoProcessing" in types:
                update_data.video_processing = types["videoProcessing"]
            if "achievements" in types:
                update_data.achievements = types["achievements"]
            if "eventReminders" in types:
                update_data.event_reminders = types["eventReminders"]
            if "systemAnnouncements" in types:
                update_data.system_announcements = types["systemAnnouncements"]
        
        # Quiet hours
        if "quietHours" in frontend_data:
            quiet_hours = frontend_data["quietHours"]
            if "enabled" in quiet_hours:
                update_data.quiet_hours_enabled = quiet_hours["enabled"]
            if "startTime" in quiet_hours:
                # Convert "HH:MM" to time object
                start_parts = quiet_hours["startTime"].split(":")
                update_data.quiet_hours_start = time(
                    hour=int(start_parts[0]),
                    minute=int(start_parts[1])
                )
            if "endTime" in quiet_hours:
                # Convert "HH:MM" to time object
                end_parts = quiet_hours["endTime"].split(":")
                update_data.quiet_hours_end = time(
                    hour=int(end_parts[0]),
                    minute=int(end_parts[1])
                )
        
        return await self.update_preferences(user_id, update_data)
    
    async def check_notification_allowed(
        self,
        user_id: uuid.UUID,
        notification_type: str,
        check_quiet_hours: bool = True
    ) -> bool:
        """Check if a notification should be sent based on user preferences."""
        preferences = await self.get_user_preferences(user_id)
        
        # If no preferences, allow all notifications
        if not preferences:
            return True
        
        # Check global enabled
        if not preferences.global_enabled:
            return False
        
        # Map notification types to preference fields
        type_mapping = {
            "practice_reminder": preferences.practice_reminders,
            "session_feedback": preferences.session_feedback,
            "feedback_received": preferences.session_feedback,
            "video_processing": preferences.video_processing,
            "achievement_unlocked": preferences.achievements,
            "event_reminder": preferences.event_reminders,
            "event_invitation": preferences.event_reminders,
            "event_cancelled": preferences.event_reminders,
            "system_announcement": preferences.system_announcements,
        }
        
        # Check specific notification type
        if notification_type in type_mapping:
            if not type_mapping[notification_type]:
                return False
        
        # Check quiet hours if requested
        if check_quiet_hours and preferences.quiet_hours_enabled:
            from datetime import datetime
            current_time = datetime.utcnow().time()
            
            # Handle quiet hours that span midnight
            if preferences.quiet_hours_start and preferences.quiet_hours_end:
                if preferences.quiet_hours_start <= preferences.quiet_hours_end:
                    # Normal case: 22:00 - 08:00
                    if preferences.quiet_hours_start <= current_time <= preferences.quiet_hours_end:
                        return False
                else:
                    # Spans midnight: 22:00 - 08:00 (next day)
                    if current_time >= preferences.quiet_hours_start or current_time <= preferences.quiet_hours_end:
                        return False
        
        return True