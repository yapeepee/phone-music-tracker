"""
Pydantic schemas for tempo tracking
"""
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field


# Tempo Tracking Schemas
class TempoTrackingBase(BaseModel):
    actual_tempo: int = Field(..., ge=20, le=300, description="Actual tempo in BPM")
    target_tempo: int = Field(..., ge=20, le=300, description="Target tempo in BPM")
    is_under_tempo: bool
    points_earned: int = Field(default=0, ge=0)


class TempoTrackingCreate(TempoTrackingBase):
    """Schema for creating tempo tracking entry"""
    pass


class TempoTrackingInDB(TempoTrackingBase):
    """Schema for tempo tracking in database"""
    id: UUID
    session_id: UUID
    timestamp: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class TempoTracking(TempoTrackingInDB):
    """Schema for tempo tracking response"""
    pass


# Tempo Statistics
class TempoStats(BaseModel):
    """Statistics for a practice session's tempo"""
    session_id: UUID
    average_tempo: float
    target_tempo: int
    time_under_tempo_seconds: int
    time_over_tempo_seconds: int
    total_points_earned: int
    compliance_percentage: float  # Percentage of time under tempo


# Tempo Achievement Schemas
class TempoAchievementBase(BaseModel):
    achievement_type: str = Field(..., description="Type of achievement")
    level: int = Field(default=1, ge=1)


class TempoAchievementCreate(TempoAchievementBase):
    """Schema for creating tempo achievement"""
    pass


class TempoAchievementInDB(TempoAchievementBase):
    """Schema for tempo achievement in database"""
    id: UUID
    student_id: UUID
    unlocked_at: datetime

    class Config:
        from_attributes = True


class TempoAchievement(TempoAchievementInDB):
    """Schema for tempo achievement response"""
    pass


# Session Update with Tempo
class SessionTempoUpdate(BaseModel):
    """Schema for updating session tempo settings"""
    target_tempo: int = Field(..., ge=20, le=300)
    practice_mode: str = Field(default="normal", pattern="^(normal|slow_practice|meditation)$")


# Batch Tempo Tracking
class TempoTrackingBatch(BaseModel):
    """Schema for batch tempo tracking submission"""
    entries: List[TempoTrackingCreate]
    
    
# Achievement Progress
class AchievementProgress(BaseModel):
    """Schema for achievement progress tracking"""
    achievement_type: str
    current_progress: float
    required_progress: float
    percentage_complete: float
    is_unlocked: bool
    level: int