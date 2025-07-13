"""Notification service for managing user notifications."""
from typing import List, Optional, Dict
from uuid import UUID
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, and_, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.notification import Notification, NotificationType
from app.models.user import User
from app.schemas.notification import NotificationCreate


class NotificationService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_notification(
        self,
        notification_data: NotificationCreate
    ) -> Notification:
        """Create a new notification"""
        notification = Notification(
            user_id=notification_data.user_id,
            type=notification_data.type,
            title=notification_data.title,
            message=notification_data.message,
            data=notification_data.data
        )
        
        self.db.add(notification)
        await self.db.commit()
        await self.db.refresh(notification)
        
        return notification
    
    async def create_feedback_notification(
        self,
        student_id: UUID,
        teacher_name: str,
        session_id: UUID,
        feedback_id: UUID,
        session_date: datetime
    ) -> Notification:
        """Create a notification for new feedback received"""
        notification_data = NotificationCreate(
            user_id=student_id,
            type=NotificationType.FEEDBACK_RECEIVED,
            title="New Feedback Received",
            message=f"{teacher_name} has provided feedback on your practice session from {session_date.strftime('%b %d, %Y')}",
            data={
                "session_id": str(session_id),
                "feedback_id": str(feedback_id),
                "teacher_name": teacher_name
            }
        )
        
        return await self.create_notification(notification_data)
    
    async def get_notifications(
        self,
        user_id: UUID,
        skip: int = 0,
        limit: int = 20,
        unread_only: bool = False
    ) -> tuple[List[Notification], int, int]:
        """
        Get notifications for a user
        Returns: (notifications, total_count, unread_count)
        """
        # Build query
        query = select(Notification).where(
            Notification.user_id == user_id
        )
        
        if unread_only:
            query = query.where(Notification.read == False)
        
        # Order by newest first
        query = query.order_by(Notification.created_at.desc())
        
        # Get total count
        count_query = select(func.count()).select_from(Notification).where(
            Notification.user_id == user_id
        )
        if unread_only:
            count_query = count_query.where(Notification.read == False)
        
        total_result = await self.db.execute(count_query)
        total_count = total_result.scalar() or 0
        
        # Get unread count
        unread_query = select(func.count()).select_from(Notification).where(
            and_(
                Notification.user_id == user_id,
                Notification.read == False
            )
        )
        unread_result = await self.db.execute(unread_query)
        unread_count = unread_result.scalar() or 0
        
        # Get paginated results
        query = query.offset(skip).limit(limit)
        result = await self.db.execute(query)
        notifications = result.scalars().all()
        
        return notifications, total_count, unread_count
    
    async def get_notification(
        self,
        notification_id: UUID,
        user_id: UUID
    ) -> Optional[Notification]:
        """Get a specific notification"""
        query = select(Notification).where(
            and_(
                Notification.id == notification_id,
                Notification.user_id == user_id
            )
        )
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def mark_as_read(
        self,
        notification_id: UUID,
        user_id: UUID
    ) -> bool:
        """Mark a notification as read"""
        query = update(Notification).where(
            and_(
                Notification.id == notification_id,
                Notification.user_id == user_id,
                Notification.read == False
            )
        ).values(
            read=True,
            read_at=datetime.now(timezone.utc)
        )
        
        result = await self.db.execute(query)
        await self.db.commit()
        
        return result.rowcount > 0
    
    async def mark_all_as_read(
        self,
        user_id: UUID
    ) -> int:
        """Mark all notifications as read for a user"""
        query = update(Notification).where(
            and_(
                Notification.user_id == user_id,
                Notification.read == False
            )
        ).values(
            read=True,
            read_at=datetime.now(timezone.utc)
        )
        
        result = await self.db.execute(query)
        await self.db.commit()
        
        return result.rowcount
    
    async def delete_notification(
        self,
        notification_id: UUID,
        user_id: UUID
    ) -> bool:
        """Delete a notification"""
        query = select(Notification).where(
            and_(
                Notification.id == notification_id,
                Notification.user_id == user_id
            )
        )
        
        result = await self.db.execute(query)
        notification = result.scalar_one_or_none()
        
        if notification:
            await self.db.delete(notification)
            await self.db.commit()
            return True
        
        return False
    
    async def delete_old_notifications(
        self,
        days_old: int = 30
    ) -> int:
        """Delete notifications older than specified days"""
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_old)
        
        query = select(Notification).where(
            Notification.created_at < cutoff_date
        )
        
        result = await self.db.execute(query)
        old_notifications = result.scalars().all()
        
        for notification in old_notifications:
            await self.db.delete(notification)
        
        await self.db.commit()
        
        return len(old_notifications)
    
    async def create_partner_request_notification(
        self,
        partner_id: UUID,
        requester_name: str,
        piece_name: str,
        match_id: UUID,
        message: Optional[str] = None
    ) -> Notification:
        """Create a notification for a new practice partner request"""
        notification_message = f"{requester_name} wants to practice {piece_name} with you"
        if message:
            notification_message += f". Message: {message}"
        
        notification_data = NotificationCreate(
            user_id=partner_id,
            type=NotificationType.PARTNER_REQUEST_RECEIVED,
            title="New Practice Partner Request",
            message=notification_message,
            data={
                "match_id": str(match_id),
                "piece_name": piece_name,
                "requester_name": requester_name
            }
        )
        
        return await self.create_notification(notification_data)
    
    async def create_partner_accepted_notification(
        self,
        requester_id: UUID,
        partner_name: str,
        piece_name: str,
        match_id: UUID,
        message: Optional[str] = None
    ) -> Notification:
        """Create a notification when a partner request is accepted"""
        notification_message = f"{partner_name} accepted your request to practice {piece_name}"
        if message:
            notification_message += f". Message: {message}"
        
        notification_data = NotificationCreate(
            user_id=requester_id,
            type=NotificationType.PARTNER_REQUEST_ACCEPTED,
            title="Practice Partner Request Accepted",
            message=notification_message,
            data={
                "match_id": str(match_id),
                "piece_name": piece_name,
                "partner_name": partner_name
            }
        )
        
        return await self.create_notification(notification_data)
    
    async def create_partner_declined_notification(
        self,
        requester_id: UUID,
        partner_name: str,
        piece_name: str,
        match_id: UUID
    ) -> Notification:
        """Create a notification when a partner request is declined"""
        notification_data = NotificationCreate(
            user_id=requester_id,
            type=NotificationType.PARTNER_REQUEST_DECLINED,
            title="Practice Partner Request Declined",
            message=f"{partner_name} declined your request to practice {piece_name}",
            data={
                "match_id": str(match_id),
                "piece_name": piece_name,
                "partner_name": partner_name
            }
        )
        
        return await self.create_notification(notification_data)