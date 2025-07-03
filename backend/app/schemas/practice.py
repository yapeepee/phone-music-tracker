from typing import Optional, List, Union
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator
from uuid import UUID

from app.models.practice import PracticeFocus


# Tag schemas
class TagBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")


class TagCreate(TagBase):
    tag_type: str = Field("general", pattern="^(piece|technique|general)$")
    composer: Optional[str] = Field(None, max_length=100)
    opus_number: Optional[str] = Field(None, max_length=50)
    difficulty_level: Optional[int] = Field(None, ge=1, le=10)
    estimated_mastery_sessions: Optional[int] = Field(None, ge=1)


class TagUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    tag_type: Optional[str] = Field(None, pattern="^(piece|technique|general)$")
    composer: Optional[str] = Field(None, max_length=100)
    opus_number: Optional[str] = Field(None, max_length=50)
    difficulty_level: Optional[int] = Field(None, ge=1, le=10)
    estimated_mastery_sessions: Optional[int] = Field(None, ge=1)
    is_archived: Optional[bool] = None


class Tag(TagBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    owner_teacher_id: Optional[UUID]
    tag_type: str
    composer: Optional[str]
    opus_number: Optional[str]
    difficulty_level: Optional[int]
    estimated_mastery_sessions: Optional[int]
    is_archived: bool = False
    archived_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


# Practice Session schemas
class PracticeSessionBase(BaseModel):
    focus: Optional[PracticeFocus] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    self_rating: Optional[int] = Field(None, ge=1, le=5)
    note: Optional[str] = Field(None, max_length=1000)
    tags: List[str] = []
    target_tempo: Optional[int] = Field(None, ge=20, le=300)
    practice_mode: str = Field(default="normal", pattern="^(normal|slow_practice|meditation)$")


class PracticeSessionCreate(PracticeSessionBase):
    @field_validator('end_time')
    @classmethod
    def validate_end_time(cls, v: Optional[datetime], info) -> Optional[datetime]:
        if v and 'start_time' in info.data:
            if v <= info.data['start_time']:
                raise ValueError('end_time must be after start_time')
        return v


class PracticeSessionUpdate(BaseModel):
    focus: Optional[PracticeFocus] = None
    end_time: Optional[datetime] = None
    self_rating: Optional[int] = Field(None, ge=1, le=5)
    note: Optional[str] = Field(None, max_length=1000)
    tags: Optional[List[str]] = None
    target_tempo: Optional[int] = Field(None, ge=20, le=300)
    practice_mode: Optional[str] = Field(None, pattern="^(normal|slow_practice|meditation)$")


class PracticeSession(PracticeSessionBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    student_id: UUID
    is_synced: bool
    created_at: datetime
    updated_at: datetime
    duration_minutes: Optional[int] = None


class PracticeSessionWithDetails(PracticeSession):
    tags_details: List[Tag] = []
    has_video: bool = False
    metrics_count: int = 0
    feedback_count: int = 0


# Video schemas
class VideoBase(BaseModel):
    duration_seconds: int = Field(..., gt=0, le=300)  # Max 5 minutes
    file_size_bytes: int = Field(..., gt=0)


class VideoCreate(VideoBase):
    s3_key: str


class Video(VideoBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    session_id: UUID
    s3_key: str
    thumbnail_s3_key: Optional[str]
    processed: bool
    processing_error: Optional[str]
    created_at: datetime
    updated_at: datetime


# Metric schemas
class MetricBase(BaseModel):
    metric_key: str = Field(..., max_length=50)
    metric_value: float
    unit: Optional[str] = Field(None, max_length=20)
    timestamp: datetime


class MetricCreate(MetricBase):
    session_id: UUID


class Metric(MetricBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    session_id: UUID
    created_at: datetime
    updated_at: datetime


# Feedback schemas
class FeedbackBase(BaseModel):
    text: str = Field(..., min_length=1)
    rating: Optional[int] = Field(None, ge=1, le=5)
    timestamp_seconds: Optional[int] = Field(None, ge=0)


class FeedbackCreate(FeedbackBase):
    session_id: Optional[UUID] = None
    video_id: Optional[UUID] = None


class Feedback(FeedbackBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    teacher_id: UUID
    session_id: Optional[UUID]
    video_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime


# Statistics schemas
class PracticeStatistics(BaseModel):
    total_sessions: int
    total_minutes: int
    average_rating: Optional[float]
    sessions_by_focus: dict[str, int]
    sessions_by_day: dict[str, int]
    streak_days: int
    most_used_tags: List[dict[str, Union[str, int]]]


# Current Pieces schemas
class CurrentPieceAdd(BaseModel):
    notes: Optional[str] = Field(None, max_length=500)
    priority: int = Field(default=3, ge=1, le=5)


class CurrentPieceUpdate(BaseModel):
    notes: Optional[str] = Field(None, max_length=500)
    priority: Optional[int] = Field(None, ge=1, le=5)


class CurrentPiece(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    piece_id: UUID
    started_at: datetime
    notes: Optional[str]
    priority: int
    last_practiced_at: Optional[datetime]
    practice_session_count: int
    created_at: datetime
    updated_at: datetime


class CurrentPieceWithDetails(CurrentPiece):
    piece: Tag  # Full piece details
    
    
class UserCurrentPieces(BaseModel):
    user_id: UUID
    current_pieces: List[CurrentPieceWithDetails]
    total_count: int