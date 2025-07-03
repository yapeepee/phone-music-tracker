"""Service for handling forum media uploads and operations."""
import os
import logging
from typing import Optional, List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.forum_media import ForumMedia, MediaType
from app.models.forum import Post, Comment
from app.models.user import User
from app.services.storage import StorageService
from app.schemas.forum_media import ForumMediaCreate, ForumMediaWithUrl
from app.core.config import settings

logger = logging.getLogger(__name__)


class ForumMediaService:
    """Service for managing forum media uploads and operations."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.storage_service = StorageService(
            bucket_name=settings.S3_BUCKET_NAME,
            endpoint_url=settings.S3_ENDPOINT_URL,
            access_key=settings.S3_ACCESS_KEY or settings.AWS_ACCESS_KEY_ID,
            secret_key=settings.S3_SECRET_KEY or settings.AWS_SECRET_ACCESS_KEY
        )
    
    async def create_media(
        self,
        media_data: ForumMediaCreate,
        uploader_id: UUID
    ) -> ForumMedia:
        """Create a new forum media record."""
        # Validate that post or comment exists
        if media_data.post_id:
            post = await self.db.get(Post, media_data.post_id)
            if not post:
                raise ValueError("Post not found")
        elif media_data.comment_id:
            comment = await self.db.get(Comment, media_data.comment_id)
            if not comment:
                raise ValueError("Comment not found")
        else:
            raise ValueError("Either post_id or comment_id must be provided")
        
        # Create media record
        media = ForumMedia(
            post_id=media_data.post_id,
            comment_id=media_data.comment_id,
            uploader_id=uploader_id,
            media_type=media_data.media_type,
            s3_key=media_data.s3_key,
            original_filename=media_data.original_filename,
            file_size_bytes=media_data.file_size_bytes,
            content_type=media_data.content_type,
            width=media_data.width,
            height=media_data.height,
            duration_seconds=media_data.duration_seconds
        )
        
        self.db.add(media)
        await self.db.commit()
        await self.db.refresh(media)
        
        return media
    
    async def get_media(self, media_id: UUID) -> Optional[ForumMedia]:
        """Get a forum media by ID."""
        query = select(ForumMedia).where(ForumMedia.id == media_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_media_with_url(self, media_id: UUID) -> Optional[ForumMediaWithUrl]:
        """Get forum media with presigned URL."""
        media = await self.get_media(media_id)
        if not media:
            return None
        
        # Generate presigned URL
        url = await self.storage_service.generate_presigned_url(
            object_key=media.s3_key,
            expiration=3600  # 1 hour
        )
        
        # Replace internal MinIO URL with external URL if configured
        if hasattr(settings, 'S3_EXTERNAL_URL') and settings.S3_EXTERNAL_URL:
            url = url.replace(settings.S3_ENDPOINT_URL, settings.S3_EXTERNAL_URL)
        
        # Generate thumbnail URL for videos
        thumbnail_url = None
        if media.media_type == MediaType.VIDEO and media.thumbnail_s3_key:
            thumbnail_url = await self.storage_service.generate_presigned_url(
                object_key=media.thumbnail_s3_key,
                expiration=3600
            )
            if hasattr(settings, 'S3_EXTERNAL_URL') and settings.S3_EXTERNAL_URL:
                thumbnail_url = thumbnail_url.replace(settings.S3_ENDPOINT_URL, settings.S3_EXTERNAL_URL)
        
        return ForumMediaWithUrl(
            **media.__dict__,
            url=url,
            thumbnail_url=thumbnail_url
        )
    
    async def get_post_media(self, post_id: UUID) -> List[ForumMediaWithUrl]:
        """Get all media for a post."""
        query = select(ForumMedia).where(ForumMedia.post_id == post_id)
        result = await self.db.execute(query)
        media_list = result.scalars().all()
        
        # Convert to media with URLs
        media_with_urls = []
        for media in media_list:
            media_with_url = await self.get_media_with_url(media.id)
            if media_with_url:
                media_with_urls.append(media_with_url)
        
        return media_with_urls
    
    async def get_comment_media(self, comment_id: UUID) -> List[ForumMediaWithUrl]:
        """Get all media for a comment."""
        query = select(ForumMedia).where(ForumMedia.comment_id == comment_id)
        result = await self.db.execute(query)
        media_list = result.scalars().all()
        
        # Convert to media with URLs
        media_with_urls = []
        for media in media_list:
            media_with_url = await self.get_media_with_url(media.id)
            if media_with_url:
                media_with_urls.append(media_with_url)
        
        return media_with_urls
    
    async def delete_media(self, media_id: UUID, user_id: UUID) -> bool:
        """Delete forum media (only by uploader or post/comment author)."""
        media = await self.get_media(media_id)
        if not media:
            return False
        
        # Check permissions
        if media.uploader_id != user_id:
            # Check if user is the post/comment author
            if media.post_id:
                post = await self.db.get(Post, media.post_id)
                if post and post.author_id != user_id:
                    raise PermissionError("Not authorized to delete this media")
            elif media.comment_id:
                comment = await self.db.get(Comment, media.comment_id)
                if comment and comment.author_id != user_id:
                    raise PermissionError("Not authorized to delete this media")
        
        # Delete from S3
        try:
            await self.storage_service.delete_file(media.s3_key)
            if media.thumbnail_s3_key:
                await self.storage_service.delete_file(media.thumbnail_s3_key)
        except Exception as e:
            logger.error(f"Error deleting media from S3: {e}")
        
        # Delete from database
        await self.db.delete(media)
        await self.db.commit()
        
        return True
    
    def generate_media_key(
        self,
        user_id: UUID,
        media_type: MediaType,
        filename: str,
        post_id: Optional[UUID] = None,
        comment_id: Optional[UUID] = None
    ) -> str:
        """Generate S3 key for forum media."""
        # Clean filename
        safe_filename = os.path.basename(filename)
        
        # Generate path based on owner type
        if post_id:
            return f"forum/{media_type}/posts/{post_id}/{user_id}_{safe_filename}"
        elif comment_id:
            return f"forum/{media_type}/comments/{comment_id}/{user_id}_{safe_filename}"
        else:
            return f"forum/{media_type}/temp/{user_id}_{safe_filename}"