"""Schemas for video processing."""
from typing import Optional, List, Dict
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum

from app.models.practice import VideoQuality, ProcessingStatus


class ProcessingProgress(BaseModel):
    """Video processing progress update."""
    
    session_id: int
    status: ProcessingStatus
    progress: float = Field(ge=0.0, le=1.0)
    message: Optional[str] = None
    current_step: Optional[str] = None
    
    class Config:
        use_enum_values = True


class ThumbnailInfo(BaseModel):
    """Thumbnail information."""
    
    path: str
    index: int
    timestamp: Optional[float] = None
    width: int = 320
    height: int = 180


class VideoFileInfo(BaseModel):
    """Processed video file information."""
    
    path: str
    quality: VideoQuality
    size: int
    width: Optional[int] = None
    height: Optional[int] = None
    bitrate: Optional[str] = None
    
    class Config:
        use_enum_values = True


class AudioTrackInfo(BaseModel):
    """Extracted audio track information."""
    
    path: str
    format: str = "mp3"
    bitrate: str = "192k"
    size: int
    duration: Optional[float] = None


class VideoInfo(BaseModel):
    """Original video metadata."""
    
    duration: float
    width: int
    height: int
    fps: float
    video_codec: str
    audio_codec: Optional[str] = None
    bitrate: int
    size: int


class VideoProcessingResult(BaseModel):
    """Complete video processing result."""
    
    video_info: VideoInfo
    transcoded_videos: Dict[str, VideoFileInfo]
    thumbnails: List[ThumbnailInfo]
    audio_track: Optional[AudioTrackInfo] = None
    preview_clip: Optional[Dict] = None
    processing_time: Optional[float] = None
    
    class Config:
        use_enum_values = True


class VideoProcessingRequest(BaseModel):
    """Request to process a video."""
    
    session_id: int
    qualities: List[VideoQuality] = [VideoQuality.LOW, VideoQuality.MEDIUM, VideoQuality.HIGH]
    generate_thumbnails: bool = True
    thumbnail_count: int = 5
    extract_audio: bool = True
    create_preview: bool = True
    preview_duration: int = 30
    
    class Config:
        use_enum_values = True


class VideoProcessingStatus(BaseModel):
    """Current processing status for a video."""
    
    session_id: int
    status: ProcessingStatus
    progress: float = Field(ge=0.0, le=1.0)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    result: Optional[VideoProcessingResult] = None
    task_id: Optional[str] = None
    
    class Config:
        use_enum_values = True


class BatchProcessingRequest(BaseModel):
    """Request to process multiple videos."""
    
    session_ids: List[int]
    qualities: List[VideoQuality] = [VideoQuality.LOW, VideoQuality.MEDIUM]
    priority: str = "normal"  # normal, high, low
    
    class Config:
        use_enum_values = True


class BatchProcessingResult(BaseModel):
    """Result of batch processing."""
    
    total: int
    queued: int
    processing: int
    completed: int
    failed: int
    results: Dict[int, Dict]  # session_id -> result/error


class VideoUploadResponse(BaseModel):
    """Response after video upload."""
    
    session_id: int
    video_url: str
    file_size: int
    duration: float
    processing_status: ProcessingStatus
    task_id: Optional[str] = None
    
    class Config:
        use_enum_values = True


class VideoDownloadUrl(BaseModel):
    """Presigned URL for video download."""
    
    url: str
    expires_in: int = 3600
    quality: Optional[VideoQuality] = None
    file_type: str = "video"  # video, audio, thumbnail, preview
    
    class Config:
        use_enum_values = True