"""Notification endpoints for user notifications."""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.models.user import User
from app.schemas.notification import (
    Notification,
    NotificationList,
    NotificationUpdate
)
from app.services.notification_service import NotificationService

router = APIRouter()


@router.get("/", response_model=NotificationList)
async def get_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> NotificationList:
    """
    Get notifications for the current user.
    
    Returns paginated list with total count and unread count.
    """
    notification_service = NotificationService(db)
    
    notifications, total, unread_count = await notification_service.get_notifications(
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        unread_only=unread_only
    )
    
    return NotificationList(
        items=notifications,
        total=total,
        unread_count=unread_count
    )


@router.get("/unread-count", response_model=dict)
async def get_unread_count(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> dict:
    """Get the count of unread notifications for the current user"""
    notification_service = NotificationService(db)
    
    _, _, unread_count = await notification_service.get_notifications(
        user_id=current_user.id,
        limit=1,  # We only need the count
        unread_only=True
    )
    
    return {"unread_count": unread_count}


@router.put("/mark-all-read", response_model=dict)
async def mark_all_notifications_as_read(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> dict:
    """Mark all notifications as read for the current user"""
    notification_service = NotificationService(db)
    
    count = await notification_service.mark_all_as_read(
        user_id=current_user.id
    )
    
    return {"marked_count": count}


@router.get("/{notification_id}", response_model=Notification)
async def get_notification(
    notification_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Notification:
    """Get a specific notification"""
    notification_service = NotificationService(db)
    
    notification = await notification_service.get_notification(
        notification_id=notification_id,
        user_id=current_user.id
    )
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return notification


@router.put("/{notification_id}", response_model=Notification)
async def mark_notification_as_read(
    notification_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Notification:
    """Mark a notification as read"""
    notification_service = NotificationService(db)
    
    success = await notification_service.mark_as_read(
        notification_id=notification_id,
        user_id=current_user.id
    )
    
    if not success:
        raise HTTPException(
            status_code=404,
            detail="Notification not found or already read"
        )
    
    # Get the updated notification
    notification = await notification_service.get_notification(
        notification_id=notification_id,
        user_id=current_user.id
    )
    
    return notification


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> dict:
    """Delete a notification"""
    notification_service = NotificationService(db)
    
    success = await notification_service.delete_notification(
        notification_id=notification_id,
        user_id=current_user.id
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"detail": "Notification deleted successfully"}