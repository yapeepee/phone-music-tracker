"""Forum media schemas for API validation."""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID

from app.models.forum_media import MediaType


class ForumMediaBase(BaseModel):
    """Base forum media schema."""
    media_type: MediaType
    original_filename: str
    content_type: str


class ForumMediaCreate(ForumMediaBase):
    """Schema for creating forum media records."""
    post_id: Optional[UUID] = None
    comment_id: Optional[UUID] = None
    s3_key: str
    file_size_bytes: int
    width: Optional[int] = None
    height: Optional[int] = None
    duration_seconds: Optional[int] = None


class ForumMedia(ForumMediaBase):
    """Schema for forum media responses."""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    post_id: Optional[UUID]
    comment_id: Optional[UUID]
    uploader_id: UUID
    s3_key: str
    file_size_bytes: int
    width: Optional[int]
    height: Optional[int]
    duration_seconds: Optional[int]
    processed: bool
    thumbnail_s3_key: Optional[str]
    created_at: datetime
    updated_at: datetime


class ForumMediaWithUrl(ForumMedia):
    """Forum media with presigned URL for access."""
    url: str
    thumbnail_url: Optional[str] = None


class ForumMediaUploadResponse(BaseModel):
    """Response after uploading forum media."""
    media_id: UUID
    url: str
    media_type: MediaType
    file_size: int
    width: Optional[int] = None
    height: Optional[int] = None
    duration: Optional[int] = None