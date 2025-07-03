"""Forum media upload API endpoints."""
from typing import List, Optional
import uuid
import tempfile
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from PIL import Image
import io

from app.api import deps
from app.db.session import get_db
from app.models.user import User
from app.models.forum_media import ForumMedia, MediaType
from app.services.media.forum_media_service import ForumMediaService
from app.services.storage import StorageService
from app.schemas.forum_media import (
    ForumMediaWithUrl,
    ForumMediaUploadResponse,
    ForumMediaCreate
)
from app.core.config import settings

router = APIRouter()


# Supported formats
SUPPORTED_IMAGE_FORMATS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
SUPPORTED_VIDEO_FORMATS = ['.mp4', '.mov', '.avi', '.webm']
MAX_IMAGE_SIZE_MB = 10
MAX_VIDEO_SIZE_MB = 100


def get_storage_service() -> StorageService:
    """Get storage service instance."""
    return StorageService(
        bucket_name=settings.S3_BUCKET_NAME,
        endpoint_url=settings.S3_ENDPOINT_URL,
        access_key=settings.S3_ACCESS_KEY or settings.AWS_ACCESS_KEY_ID,
        secret_key=settings.S3_SECRET_KEY or settings.AWS_SECRET_ACCESS_KEY
    )


@router.post("/upload/{entity_type}/{entity_id}", response_model=ForumMediaUploadResponse)
async def upload_forum_media(
    entity_type: str,  # "post" or "comment"
    entity_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Upload media file for a forum post or comment."""
    # Validate entity type
    if entity_type not in ["post", "comment"]:
        raise HTTPException(status_code=400, detail="Invalid entity type. Must be 'post' or 'comment'")
    
    # Validate entity ID
    try:
        entity_uuid = uuid.UUID(entity_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid entity ID format")
    
    # Determine media type based on file extension
    filename_lower = file.filename.lower()
    media_type = None
    max_size_mb = 0
    
    if any(filename_lower.endswith(fmt) for fmt in SUPPORTED_IMAGE_FORMATS):
        media_type = MediaType.IMAGE
        max_size_mb = MAX_IMAGE_SIZE_MB
    elif any(filename_lower.endswith(fmt) for fmt in SUPPORTED_VIDEO_FORMATS):
        media_type = MediaType.VIDEO
        max_size_mb = MAX_VIDEO_SIZE_MB
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format. Supported: {SUPPORTED_IMAGE_FORMATS + SUPPORTED_VIDEO_FORMATS}"
        )
    
    # Check file size
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > max_size_mb * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {max_size_mb}MB"
        )
    
    # Generate S3 key
    media_service = ForumMediaService(db)
    s3_key = media_service.generate_media_key(
        user_id=current_user.id,
        media_type=media_type,
        filename=file.filename,
        post_id=entity_uuid if entity_type == "post" else None,
        comment_id=entity_uuid if entity_type == "comment" else None
    )
    
    # Get image dimensions if it's an image
    width = None
    height = None
    if media_type == MediaType.IMAGE:
        try:
            file.file.seek(0)
            img = Image.open(file.file)
            width, height = img.size
            file.file.seek(0)
        except Exception:
            pass  # Ignore errors, dimensions are optional
    
    # Upload to S3
    storage_service = get_storage_service()
    with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
        file.file.seek(0)
        content = file.file.read()
        tmp_file.write(content)
        tmp_file.flush()
        
        await storage_service.upload_file(
            tmp_file.name,
            s3_key,
            content_type=file.content_type
        )
    
    # Create database record
    media_data = ForumMediaCreate(
        media_type=media_type,
        original_filename=file.filename,
        content_type=file.content_type,
        post_id=entity_uuid if entity_type == "post" else None,
        comment_id=entity_uuid if entity_type == "comment" else None,
        s3_key=s3_key,
        file_size_bytes=file_size,
        width=width,
        height=height
    )
    
    media = await media_service.create_media(media_data, current_user.id)
    
    # Get media with presigned URL
    media_with_url = await media_service.get_media_with_url(media.id)
    
    return ForumMediaUploadResponse(
        media_id=media.id,
        url=media_with_url.url,
        media_type=media.media_type,
        file_size=media.file_size_bytes,
        width=media.width,
        height=media.height,
        duration=media.duration_seconds
    )


@router.get("/post/{post_id}", response_model=List[ForumMediaWithUrl])
async def get_post_media(
    post_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Get all media files for a post."""
    try:
        post_uuid = uuid.UUID(post_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid post ID format")
    
    media_service = ForumMediaService(db)
    return await media_service.get_post_media(post_uuid)


@router.get("/comment/{comment_id}", response_model=List[ForumMediaWithUrl])
async def get_comment_media(
    comment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Get all media files for a comment."""
    try:
        comment_uuid = uuid.UUID(comment_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid comment ID format")
    
    media_service = ForumMediaService(db)
    return await media_service.get_comment_media(comment_uuid)


@router.delete("/{media_id}")
async def delete_forum_media(
    media_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Delete a forum media file."""
    try:
        media_uuid = uuid.UUID(media_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid media ID format")
    
    media_service = ForumMediaService(db)
    try:
        success = await media_service.delete_media(media_uuid, current_user.id)
        if not success:
            raise HTTPException(status_code=404, detail="Media not found")
        return {"message": "Media deleted successfully"}
    except PermissionError:
        raise HTTPException(status_code=403, detail="Not authorized to delete this media")