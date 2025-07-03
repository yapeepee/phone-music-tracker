"""Notification schemas for API responses."""
from typing import Optional, Dict
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID

from app.models.notification import NotificationType


# Notification schemas
class NotificationBase(BaseModel):
    type: NotificationType
    title: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1)
    data: Optional[Dict] = Field(None, description="Additional data specific to notification type")


class NotificationCreate(NotificationBase):
    user_id: UUID


class NotificationUpdate(BaseModel):
    read: bool = Field(True, description="Mark notification as read")


class Notification(NotificationBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    user_id: UUID
    read: bool
    read_at: Optional[datetime]
    created_at: datetime


class NotificationList(BaseModel):
    """Response model for paginated notification list"""
    items: list[Notification]
    total: int
    unread_count: int