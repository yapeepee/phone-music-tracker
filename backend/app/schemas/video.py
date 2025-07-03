"""Video upload schemas"""
from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from uuid import UUID


class VideoUploadInit(BaseModel):
    """Schema for initiating video upload"""
    session_id: UUID
    filename: str = Field(..., min_length=1, max_length=255)
    file_size: int = Field(..., gt=0, le=524288000)  # Max 500MB
    duration_seconds: int = Field(..., gt=0, le=300)  # Max 5 minutes
    content_type: Optional[str] = "video/mp4"


class VideoUploadResponse(BaseModel):
    """Response after initiating upload"""
    upload_id: str
    upload_url: str
    expires_at: datetime
    chunk_size: int = 5242880  # 5MB chunks


class VideoUploadStatus(BaseModel):
    """Video upload status"""
    upload_id: str
    offset: int
    size: int
    completed: bool
    expires_at: Optional[datetime]
    percentage: float = Field(ge=0, le=100)


class VideoUploadComplete(BaseModel):
    """Schema for completing video upload"""
    upload_id: str


class VideoBase(BaseModel):
    """Base video schema"""
    duration_seconds: int = Field(..., gt=0, le=300)
    file_size_bytes: int = Field(..., gt=0)


class VideoCreate(VideoBase):
    """Schema for creating video record"""
    session_id: UUID
    s3_key: str
    upload_id: Optional[str] = None


class VideoUpdate(BaseModel):
    """Schema for updating video"""
    processed: Optional[bool] = None
    processing_error: Optional[str] = None
    thumbnail_s3_key: Optional[str] = None


class Video(VideoBase):
    """Complete video schema"""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    session_id: UUID
    s3_key: str
    thumbnail_s3_key: Optional[str]
    processed: bool
    processing_error: Optional[str]
    upload_completed: bool
    created_at: datetime
    updated_at: datetime


class VideoWithPresignedUrl(Video):
    """Video with presigned URL for playback"""
    url: str  # Changed from presigned_url to match frontend expectation
    thumbnail_url: Optional[str] = None


class VideoProcessingRequest(BaseModel):
    """Request to process video"""
    video_id: UUID
    generate_thumbnail: bool = True
    extract_audio: bool = False


class VideoProcessingStatus(BaseModel):
    """Video processing status"""
    video_id: UUID
    status: str = Field(..., pattern="^(pending|processing|completed|failed)$")
    progress: Optional[float] = Field(None, ge=0, le=100)
    error: Optional[str] = None
    completed_at: Optional[datetime] = None