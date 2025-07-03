"""API endpoints for notification preferences."""
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.models.user import User
from app.schemas.notification_preferences import (
    NotificationPreferences,
    NotificationPreferencesUpdate,
    NotificationPreferencesFrontend
)
from app.services.notification_preferences_service import NotificationPreferencesService

router = APIRouter()


@router.get("/", response_model=NotificationPreferencesFrontend)
async def get_notification_preferences(
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_user)]
) -> NotificationPreferencesFrontend:
    """Get current user's notification preferences."""
    service = NotificationPreferencesService(db)
    preferences = await service.get_or_create_preferences(current_user.id)
    
    # Convert to frontend format
    return NotificationPreferencesFrontend.from_db_model(
        NotificationPreferences.model_validate(preferences)
    )


@router.put("/", response_model=NotificationPreferencesFrontend)
async def update_notification_preferences(
    preferences_data: dict,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_user)]
) -> NotificationPreferencesFrontend:
    """Update current user's notification preferences."""
    service = NotificationPreferencesService(db)
    
    # Update preferences using frontend format
    updated_preferences = await service.update_from_frontend(
        current_user.id,
        preferences_data
    )
    
    # Convert to frontend format
    return NotificationPreferencesFrontend.from_db_model(
        NotificationPreferences.model_validate(updated_preferences)
    )


@router.post("/reset", response_model=NotificationPreferencesFrontend)
async def reset_notification_preferences(
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_user)]
) -> NotificationPreferencesFrontend:
    """Reset notification preferences to defaults."""
    service = NotificationPreferencesService(db)
    
    # Reset all preferences to defaults
    default_update = NotificationPreferencesUpdate(
        global_enabled=True,
        practice_reminders=True,
        session_feedback=True,
        video_processing=True,
        achievements=True,
        event_reminders=True,
        system_announcements=True,
        quiet_hours_enabled=False,
        quiet_hours_start=None,
        quiet_hours_end=None
    )
    
    updated_preferences = await service.update_preferences(
        current_user.id,
        default_update
    )
    
    # Convert to frontend format
    return NotificationPreferencesFrontend.from_db_model(
        NotificationPreferences.model_validate(updated_preferences)
    )