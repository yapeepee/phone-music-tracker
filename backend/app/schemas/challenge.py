"""Challenge and achievement schemas."""
from typing import Optional, Dict, Any, List
from datetime import datetime, date
from uuid import UUID
from pydantic import BaseModel, Field

from app.models.challenge import ChallengeType, ChallengeStatus, AchievementTier


# Achievement schemas
class AchievementBase(BaseModel):
    """Base achievement schema."""
    name: str = Field(..., max_length=100)
    description: str
    tier: AchievementTier
    icon: str = Field(default="medal", max_length=50)
    badge_image_url: Optional[str] = Field(None, max_length=500)


class AchievementCreate(AchievementBase):
    """Schema for creating an achievement."""
    pass


class Achievement(AchievementBase):
    """Achievement response schema."""
    id: UUID
    total_earned: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# Challenge schemas
class ChallengeBase(BaseModel):
    """Base challenge schema."""
    name: str = Field(..., max_length=100)
    description: str
    type: ChallengeType
    target_value: int = Field(..., gt=0)
    target_metric: Optional[str] = Field(None, max_length=50)
    target_focus: Optional[str] = Field(None, max_length=50)
    reputation_reward: int = Field(default=10, ge=0)
    achievement_id: Optional[UUID] = None
    icon: str = Field(default="trophy", max_length=50)
    color: str = Field(default="#6366F1", pattern="^#[0-9A-Fa-f]{6}$")
    order_index: int = Field(default=0)
    is_active: bool = True
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_repeatable: bool = True
    cooldown_days: Optional[int] = Field(None, ge=0)


class ChallengeCreate(ChallengeBase):
    """Schema for creating a challenge."""
    pass


class ChallengeUpdate(BaseModel):
    """Schema for updating a challenge."""
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    target_value: Optional[int] = Field(None, gt=0)
    reputation_reward: Optional[int] = Field(None, ge=0)
    icon: Optional[str] = Field(None, max_length=50)
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    order_index: Optional[int] = None
    is_active: Optional[bool] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_repeatable: Optional[bool] = None
    cooldown_days: Optional[int] = Field(None, ge=0)


class Challenge(ChallengeBase):
    """Challenge response schema."""
    id: UUID
    created_at: datetime
    updated_at: datetime
    achievement: Optional[Achievement] = None
    
    class Config:
        from_attributes = True


class ChallengeWithProgress(Challenge):
    """Challenge with user progress."""
    user_status: Optional[ChallengeStatus] = None
    user_progress: Optional[int] = 0
    user_progress_percentage: Optional[float] = 0.0
    can_start: bool = True
    cooldown_remaining_days: Optional[int] = None


# User challenge schemas
class UserChallengeBase(BaseModel):
    """Base user challenge schema."""
    challenge_id: UUID
    status: ChallengeStatus = ChallengeStatus.NOT_STARTED
    current_value: int = Field(default=0, ge=0)
    progress_data: Optional[Dict[str, Any]] = None


class UserChallengeCreate(BaseModel):
    """Schema for starting a challenge."""
    challenge_id: UUID


class UserChallengeUpdate(BaseModel):
    """Schema for updating challenge progress."""
    current_value: Optional[int] = Field(None, ge=0)
    progress_data: Optional[Dict[str, Any]] = None


class UserChallenge(UserChallengeBase):
    """User challenge response schema."""
    id: UUID
    user_id: UUID
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    challenge: Challenge
    progress_percentage: float = Field(default=0.0, ge=0.0, le=100.0)
    
    class Config:
        from_attributes = True


# User achievement schemas
class UserAchievementBase(BaseModel):
    """Base user achievement schema."""
    user_id: UUID
    achievement_id: UUID
    earned_from_challenge_id: Optional[UUID] = None


class UserAchievement(UserAchievementBase):
    """User achievement response schema."""
    id: UUID
    earned_at: datetime
    achievement: Achievement
    
    class Config:
        from_attributes = True


# List response schemas
class ChallengeListResponse(BaseModel):
    """Challenge list response."""
    items: List[ChallengeWithProgress]
    total: int
    page: int = 1
    page_size: int = 20


class AchievementListResponse(BaseModel):
    """Achievement list response."""
    items: List[Achievement]
    total: int


class UserAchievementListResponse(BaseModel):
    """User achievement list response."""
    items: List[UserAchievement]
    total: int
    total_points_earned: int = 0