from typing import Optional, List, Dict, Any, TYPE_CHECKING
from datetime import datetime, date, time
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from uuid import UUID

from app.models.schedule import EventType, RecurrenceType, EventStatus


# User reference schema
class UserBasic(BaseModel):
    """Basic user info for participant lists"""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    full_name: str
    email: str
    role: str


# Base schemas
class ScheduleEventBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    event_type: EventType = EventType.LESSON
    start_datetime: datetime
    end_datetime: datetime
    timezone: str = Field(default="UTC", max_length=50)
    location: Optional[str] = Field(None, max_length=200)
    is_online: bool = False
    meeting_url: Optional[str] = Field(None, max_length=500)
    color: str = Field(default="#6366F1", pattern="^#[0-9A-Fa-f]{6}$")
    reminder_minutes: int = Field(default=15, ge=0, le=10080)  # Max 1 week
    max_participants: Optional[int] = Field(None, ge=1)

    @field_validator('end_datetime')
    @classmethod
    def validate_end_datetime(cls, v: datetime, info) -> datetime:
        if 'start_datetime' in info.data and v <= info.data['start_datetime']:
            raise ValueError('end_datetime must be after start_datetime')
        return v

    @model_validator(mode='after')
    def validate_online_fields(self) -> 'ScheduleEventBase':
        if self.is_online and not self.meeting_url:
            raise ValueError('meeting_url is required for online events')
        return self


class ScheduleEventCreate(ScheduleEventBase):
    participant_ids: List[UUID] = []
    recurrence_rule: Optional['RecurrenceRuleCreate'] = None


class ScheduleEventUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    event_type: Optional[EventType] = None
    status: Optional[EventStatus] = None
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    timezone: Optional[str] = Field(None, max_length=50)
    location: Optional[str] = Field(None, max_length=200)
    is_online: Optional[bool] = None
    meeting_url: Optional[str] = Field(None, max_length=500)
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    reminder_minutes: Optional[int] = Field(None, ge=0, le=10080)
    max_participants: Optional[int] = Field(None, ge=1)
    participant_ids: Optional[List[UUID]] = None


class ScheduleEvent(ScheduleEventBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    teacher_id: UUID
    status: EventStatus
    parent_event_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime
    duration_minutes: int


class ScheduleEventWithParticipants(ScheduleEvent):
    model_config = ConfigDict(from_attributes=True)
    
    participants: List['UserBasic'] = []
    recurrence_rule: Optional['RecurrenceRule'] = None


class ScheduleEventWithConflicts(ScheduleEventWithParticipants):
    conflicts: List['ScheduleConflict'] = []


# Recurrence Rule schemas
class RecurrenceRuleBase(BaseModel):
    recurrence_type: RecurrenceType
    interval: int = Field(default=1, ge=1)
    days_of_week: Optional[List[int]] = Field(None, description="0=Mon, 1=Tue, ..., 6=Sun")
    day_of_month: Optional[int] = Field(None, ge=1, le=31)
    week_of_month: Optional[int] = Field(None, ge=1, le=5)
    end_date: Optional[date] = None
    occurrences: Optional[int] = Field(None, ge=1)
    exception_dates: Optional[List[date]] = []

    @model_validator(mode='after')
    def validate_recurrence_fields(self) -> 'RecurrenceRuleBase':
        if self.recurrence_type == RecurrenceType.WEEKLY and not self.days_of_week:
            raise ValueError('days_of_week is required for weekly recurrence')
        
        if self.recurrence_type == RecurrenceType.MONTHLY:
            if not self.day_of_month and not self.week_of_month:
                raise ValueError('Either day_of_month or week_of_month is required for monthly recurrence')
        
        if self.end_date and self.occurrences:
            raise ValueError('Cannot specify both end_date and occurrences')
        
        return self


class RecurrenceRuleCreate(RecurrenceRuleBase):
    pass


class RecurrenceRuleUpdate(BaseModel):
    interval: Optional[int] = Field(None, ge=1)
    days_of_week: Optional[List[int]] = None
    day_of_month: Optional[int] = Field(None, ge=1, le=31)
    week_of_month: Optional[int] = Field(None, ge=1, le=5)
    end_date: Optional[date] = None
    occurrences: Optional[int] = Field(None, ge=1)
    exception_dates: Optional[List[date]] = None


class RecurrenceRule(RecurrenceRuleBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    event_id: UUID
    created_at: datetime
    updated_at: datetime


# Conflict schemas
class ScheduleConflictBase(BaseModel):
    conflict_type: str
    severity: str = "warning"
    resolution_status: str = "unresolved"


class ScheduleConflict(ScheduleConflictBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    event_id: UUID
    conflicting_event_id: UUID
    detected_at: datetime
    resolved_at: Optional[datetime]
    conflicting_event: Optional['ScheduleEvent'] = None


class ConflictResolution(BaseModel):
    resolution_status: str = Field(..., pattern="^(resolved|ignored)$")
    resolution_note: Optional[str] = Field(None, max_length=500)


# Calendar view schemas
class CalendarEventSummary(BaseModel):
    """Simplified event for calendar display"""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    title: str
    event_type: EventType
    status: EventStatus
    start_datetime: datetime
    end_datetime: datetime
    color: str
    is_online: bool
    participant_count: int = 0
    is_recurring: bool = False


class CalendarDayEvents(BaseModel):
    """Events grouped by day for calendar display"""
    date: date
    events: List[CalendarEventSummary]


class CalendarRequest(BaseModel):
    """Request for calendar events"""
    start_date: date
    end_date: date
    include_cancelled: bool = False


# User reference schema
class UserBasic(BaseModel):
    """Basic user info for participant lists"""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    full_name: str
    email: str
    role: str


# WebCal/iCal schemas
class WebCalSubscription(BaseModel):
    """WebCal subscription info"""
    user_id: UUID
    subscription_url: str
    token: str
    created_at: datetime


# Update forward references
ScheduleEventCreate.model_rebuild()
ScheduleEventWithParticipants.model_rebuild() 
ScheduleEventWithConflicts.model_rebuild()
ScheduleConflict.model_rebuild()