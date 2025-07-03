from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID


# Practice Segment schemas
class PracticeSegmentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    display_order: int = Field(0, ge=0)


class PracticeSegmentCreate(PracticeSegmentBase):
    piece_tag_id: UUID


class PracticeSegmentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    display_order: Optional[int] = Field(None, ge=0)
    is_completed: Optional[bool] = None


class PracticeSegment(PracticeSegmentBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    piece_tag_id: UUID
    student_id: UUID
    is_completed: bool
    completed_at: Optional[datetime]
    total_click_count: int
    last_clicked_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime


class PracticeSegmentWithAnalytics(PracticeSegment):
    """Extended segment info with practice analytics"""
    days_practiced: int
    first_practice_date: Optional[datetime]
    last_practice_date: Optional[datetime]
    daily_practice_data: List[dict]  # [{date: str, count: int}, ...]


# Segment Click schemas
class SegmentClickCreate(BaseModel):
    segment_id: UUID
    session_id: Optional[UUID] = None
    click_count: int = Field(1, ge=1)


class SegmentClick(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    segment_id: UUID
    session_id: Optional[UUID]
    clicked_at: datetime
    click_count: int


# Piece Progress schemas
class PieceProgress(BaseModel):
    """Progress overview for a musical piece"""
    piece_tag_id: UUID
    piece_name: str
    composer: Optional[str]
    total_segments: int
    completed_segments: int
    total_clicks: int
    days_practiced: int
    first_practice_date: Optional[datetime]
    last_practice_date: Optional[datetime]
    completion_percentage: float
    segments: List[PracticeSegment]