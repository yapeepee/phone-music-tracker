from typing import Optional, List
from datetime import datetime, time
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_validator
from enum import Enum

# Import schemas needed for relationships
from app.schemas.user import User
from app.schemas.practice import Tag

# Enums
class CommunicationPreference(str, Enum):
    IN_APP = "in_app"
    EMAIL = "email" 
    VIDEO_CALL = "video_call"

class SkillLevel(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    PROFESSIONAL = "professional"

class MatchStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    CANCELLED = "cancelled"
    ENDED = "ended"

class MatchReason(str, Enum):
    SAME_PIECE = "same_piece"
    SIMILAR_TIMEZONE = "similar_timezone"
    SKILL_LEVEL = "skill_level"
    MANUAL = "manual"


# User Availability Schemas
class UserAvailabilityBase(BaseModel):
    day_of_week: int = Field(..., ge=0, le=6, description="0=Sunday, 6=Saturday")
    start_time: time
    end_time: time
    timezone: str = "UTC"
    is_active: bool = True
    
    @field_validator('end_time')
    def validate_time_range(cls, v, info):
        if info.data.get('start_time') and v <= info.data.get('start_time'):
            raise ValueError('end_time must be after start_time')
        return v

class UserAvailabilityCreate(UserAvailabilityBase):
    pass

class UserAvailabilityUpdate(BaseModel):
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    timezone: Optional[str] = None
    is_active: Optional[bool] = None

class UserAvailability(UserAvailabilityBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# User Practice Preferences Schemas
class UserPracticePreferencesBase(BaseModel):
    is_available_for_partners: bool = False
    preferred_communication: CommunicationPreference = CommunicationPreference.IN_APP
    skill_level: Optional[SkillLevel] = None
    practice_goals: Optional[str] = None
    languages: List[str] = ["English"]
    max_partners: int = Field(5, ge=1, le=20)

class UserPracticePreferencesCreate(UserPracticePreferencesBase):
    pass

class UserPracticePreferencesUpdate(BaseModel):
    is_available_for_partners: Optional[bool] = None
    preferred_communication: Optional[CommunicationPreference] = None
    skill_level: Optional[SkillLevel] = None
    practice_goals: Optional[str] = None
    languages: Optional[List[str]] = None
    max_partners: Optional[int] = Field(None, ge=1, le=20)

class UserPracticePreferences(UserPracticePreferencesBase):
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Practice Partner Match Schemas
class PracticePartnerMatchBase(BaseModel):
    piece_id: UUID
    requester_message: Optional[str] = None

class PracticePartnerMatchCreate(PracticePartnerMatchBase):
    partner_id: UUID

class PracticePartnerMatchUpdate(BaseModel):
    status: Optional[MatchStatus] = None
    partner_message: Optional[str] = None

class PracticePartnerMatch(PracticePartnerMatchBase):
    id: UUID
    requester_id: UUID
    partner_id: UUID
    status: MatchStatus
    match_reason: Optional[MatchReason] = None
    partner_message: Optional[str] = None
    matched_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    ended_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class PracticePartnerMatchWithUsers(PracticePartnerMatch):
    """Practice partner match with user details"""
    requester: User
    partner: User
    piece: Tag


# Partner Discovery Schemas
class CompatiblePartner(BaseModel):
    """A potential practice partner for a piece"""
    user_id: UUID
    full_name: str
    timezone: str
    timezone_diff_hours: int
    skill_level: Optional[SkillLevel] = None
    common_languages: List[str]
    piece_id: UUID
    piece_name: str
    piece_composer: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class PartnerSearchFilters(BaseModel):
    """Filters for finding practice partners"""
    piece_id: Optional[UUID] = None
    max_timezone_diff_hours: Optional[int] = Field(None, ge=0, le=12)
    skill_level: Optional[SkillLevel] = None
    language: Optional[str] = None
    
    
# Partner Practice Session Schemas
class PartnerPracticeSessionCreate(BaseModel):
    match_id: UUID
    session_id: UUID
    partner_session_id: Optional[UUID] = None
    is_synchronized: bool = False
    notes: Optional[str] = None

class PartnerPracticeSession(PartnerPracticeSessionCreate):
    id: UUID
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)