from typing import Optional, List, Dict, Any, TYPE_CHECKING
from datetime import datetime, time, date
from sqlalchemy import Column, String, Integer, Text, ForeignKey, Table, Enum, Float, Boolean, JSON, Time, Date
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP
from sqlalchemy.orm import relationship, Mapped, mapped_column
import uuid
import enum

from app.db.base_class import Base

if TYPE_CHECKING:
    from app.models.user import User, Student, Teacher


class EventType(str, enum.Enum):
    LESSON = "lesson"
    PRACTICE = "practice"
    MASTERCLASS = "masterclass"
    RECITAL = "recital"
    OTHER = "other"


class RecurrenceType(str, enum.Enum):
    NONE = "none"
    DAILY = "daily"
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"


class EventStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    RESCHEDULED = "rescheduled"


# Association table for participants (students in an event)
event_participants = Table(
    "event_participants",
    Base.metadata,
    Column("event_id", UUID(as_uuid=True), ForeignKey("schedule_events.id"), primary_key=True),
    Column("student_id", UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True),
    Column("status", String(20), default="confirmed"),  # confirmed, tentative, declined
    Column("created_at", TIMESTAMP(timezone=True), default=datetime.utcnow),
)


class ScheduleEvent(Base):
    __tablename__ = "schedule_events"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Event details
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    event_type: Mapped[EventType] = mapped_column(Enum(EventType), nullable=False, default=EventType.LESSON)
    status: Mapped[EventStatus] = mapped_column(Enum(EventStatus), nullable=False, default=EventStatus.SCHEDULED)
    
    # Time information
    start_datetime: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    end_datetime: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    timezone: Mapped[str] = mapped_column(String(50), nullable=False, default="UTC")
    
    # Recurrence
    recurrence_rule: Mapped[Optional["RecurrenceRule"]] = relationship(
        "RecurrenceRule", 
        back_populates="event", 
        uselist=False,
        cascade="all, delete-orphan"
    )
    parent_event_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("schedule_events.id"), 
        nullable=True
    )
    
    # Location
    location: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    is_online: Mapped[bool] = mapped_column(Boolean, default=False)
    meeting_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    # Metadata
    color: Mapped[str] = mapped_column(String(7), default="#6366F1")  # Hex color for calendar display
    reminder_minutes: Mapped[int] = mapped_column(Integer, default=15)  # Minutes before event to send reminder
    max_participants: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    teacher: Mapped["User"] = relationship("User", foreign_keys=[teacher_id], back_populates="taught_events")
    participants: Mapped[List["User"]] = relationship(
        "User",
        secondary=event_participants,
        back_populates="scheduled_events"
    )
    
    # For recurring events
    child_events: Mapped[List["ScheduleEvent"]] = relationship(
        "ScheduleEvent",
        back_populates="parent_event",
        cascade="all, delete-orphan"
    )
    parent_event: Mapped[Optional["ScheduleEvent"]] = relationship(
        "ScheduleEvent",
        remote_side=[id],
        back_populates="child_events"
    )
    
    # For conflict tracking
    conflicts: Mapped[List["ScheduleConflict"]] = relationship(
        "ScheduleConflict",
        foreign_keys="ScheduleConflict.event_id",
        back_populates="event",
        cascade="all, delete-orphan"
    )
    
    @property
    def duration_minutes(self) -> int:
        """Calculate duration in minutes"""
        if self.start_datetime and self.end_datetime:
            return int((self.end_datetime - self.start_datetime).total_seconds() / 60)
        return 0


class RecurrenceRule(Base):
    __tablename__ = "recurrence_rules"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("schedule_events.id"), unique=True)
    
    # Recurrence pattern
    recurrence_type: Mapped[RecurrenceType] = mapped_column(Enum(RecurrenceType), nullable=False)
    interval: Mapped[int] = mapped_column(Integer, default=1)  # Every N days/weeks/months
    
    # For weekly recurrence
    days_of_week: Mapped[Optional[List[int]]] = mapped_column(JSON, nullable=True)  # [0=Mon, 1=Tue, ..., 6=Sun]
    
    # For monthly recurrence
    day_of_month: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # 1-31
    week_of_month: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # 1-5 (5=last)
    
    # End condition
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    occurrences: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # Number of occurrences
    
    # Exceptions
    exception_dates: Mapped[Optional[List[date]]] = mapped_column(JSON, nullable=True)  # Dates to skip
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    event: Mapped["ScheduleEvent"] = relationship("ScheduleEvent", back_populates="recurrence_rule")


class ScheduleConflict(Base):
    __tablename__ = "schedule_conflicts"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("schedule_events.id"))
    conflicting_event_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("schedule_events.id"))
    
    # Conflict details
    conflict_type: Mapped[str] = mapped_column(String(50))  # "time_overlap", "location_conflict", "participant_conflict"
    severity: Mapped[str] = mapped_column(String(20), default="warning")  # "warning", "error"
    resolution_status: Mapped[str] = mapped_column(String(20), default="unresolved")  # "unresolved", "resolved", "ignored"
    
    # Timestamps
    detected_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    
    # Relationships
    event: Mapped["ScheduleEvent"] = relationship("ScheduleEvent", foreign_keys=[event_id], back_populates="conflicts")
    conflicting_event: Mapped["ScheduleEvent"] = relationship("ScheduleEvent", foreign_keys=[conflicting_event_id])