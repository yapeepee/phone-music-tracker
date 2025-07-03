from typing import Optional, List
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field


class TimerEventBase(BaseModel):
    event_type: str = Field(..., pattern="^(start|pause|resume|stop)$")
    event_timestamp: datetime


class TimerEventCreate(TimerEventBase):
    pass


class TimerEvent(TimerEventBase):
    id: UUID
    session_timer_id: UUID
    
    class Config:
        from_attributes = True


class SessionTimerBase(BaseModel):
    total_seconds: int = 0
    is_paused: bool = False


class SessionTimerCreate(SessionTimerBase):
    session_id: UUID
    events: Optional[List[TimerEventCreate]] = []


class SessionTimerUpdate(BaseModel):
    total_seconds: Optional[int] = None
    is_paused: Optional[bool] = None


class SessionTimer(SessionTimerBase):
    id: UUID
    session_id: UUID
    created_at: datetime
    updated_at: datetime
    events: List[TimerEvent] = []
    
    class Config:
        from_attributes = True


class SessionTimerWithEvents(SessionTimer):
    """Session timer with all associated events"""
    pass


class TimerSummary(BaseModel):
    """Summary of timer data for a session"""
    total_seconds: int
    pause_count: int
    total_pause_seconds: int
    events: List[TimerEvent]