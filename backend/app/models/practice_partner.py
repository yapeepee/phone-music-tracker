from typing import Optional, List
from uuid import UUID
from datetime import datetime, time
from sqlalchemy import (
    Column, String, Boolean, Integer, ForeignKey, Text, 
    Time, CheckConstraint, UniqueConstraint, ARRAY, TIMESTAMP
)
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.sql import func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from app.db.base_class import Base
import enum

class CommunicationPreference(str, enum.Enum):
    IN_APP = "in_app"
    EMAIL = "email"
    VIDEO_CALL = "video_call"

class SkillLevel(str, enum.Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    PROFESSIONAL = "professional"

class MatchStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    CANCELLED = "cancelled"
    ENDED = "ended"

class MatchReason(str, enum.Enum):
    SAME_PIECE = "same_piece"
    SIMILAR_TIMEZONE = "similar_timezone"
    SKILL_LEVEL = "skill_level"
    MANUAL = "manual"

class EndedReason(str, enum.Enum):
    COMPLETED_PIECE = "completed_piece"
    SCHEDULE_CONFLICT = "schedule_conflict"
    USER_REQUEST = "user_request"
    INACTIVE = "inactive"
    OTHER = "other"


class UserAvailability(Base):
    """User's weekly availability schedule for practice partner matching."""
    __tablename__ = "user_availability"
    
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    user_id = Column(PostgresUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0=Sunday, 6=Saturday
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    timezone = Column(String(50), nullable=False, default="UTC")
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="availability_slots")
    
    # Constraints
    __table_args__ = (
        CheckConstraint('day_of_week >= 0 AND day_of_week <= 6', name='valid_day_of_week'),
        CheckConstraint('end_time > start_time', name='valid_time_range'),
        UniqueConstraint('user_id', 'day_of_week', 'start_time', name='unique_user_day_time'),
    )


class UserPracticePreferences(Base):
    """User preferences for practice partner discovery."""
    __tablename__ = "user_practice_preferences"
    
    user_id = Column(PostgresUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    is_available_for_partners = Column(Boolean, default=False)
    preferred_communication = Column(String(50), default=CommunicationPreference.IN_APP.value)
    skill_level = Column(String(20))
    practice_goals = Column(Text)
    languages = Column(ARRAY(String), default=["English"])
    max_partners = Column(Integer, default=5)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="practice_preferences")


class PracticePartnerMatch(Base):
    """Practice partner requests and active partnerships."""
    __tablename__ = "practice_partner_matches"
    
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    requester_id = Column(PostgresUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    partner_id = Column(PostgresUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    piece_id = Column(PostgresUUID(as_uuid=True), ForeignKey("tags.id", ondelete="CASCADE"))
    status = Column(String(20), nullable=False, default=MatchStatus.PENDING.value)
    match_reason = Column(String(50))
    requester_message = Column(Text)
    partner_message = Column(Text)
    matched_at = Column(TIMESTAMP(timezone=True))
    ended_at = Column(TIMESTAMP(timezone=True))
    ended_reason = Column(String(50))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    requester = relationship("User", foreign_keys=[requester_id], back_populates="partner_requests_sent")
    partner = relationship("User", foreign_keys=[partner_id], back_populates="partner_requests_received")
    piece = relationship("Tag", back_populates="partner_matches")
    practice_sessions = relationship("PartnerPracticeSession", back_populates="match", cascade="all, delete-orphan")
    
    # Constraints
    __table_args__ = (
        CheckConstraint('requester_id != partner_id', name='different_users'),
        UniqueConstraint('requester_id', 'partner_id', 'piece_id', name='unique_partner_piece_request'),
    )


class PartnerPracticeSession(Base):
    """Links practice sessions between partners."""
    __tablename__ = "partner_practice_sessions"
    
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    match_id = Column(PostgresUUID(as_uuid=True), ForeignKey("practice_partner_matches.id", ondelete="CASCADE"), nullable=False)
    session_id = Column(PostgresUUID(as_uuid=True), ForeignKey("practice_sessions.id", ondelete="CASCADE"), nullable=False)
    partner_session_id = Column(PostgresUUID(as_uuid=True), ForeignKey("practice_sessions.id", ondelete="SET NULL"))
    is_synchronized = Column(Boolean, default=False)
    notes = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    
    # Relationships
    match = relationship("PracticePartnerMatch", back_populates="practice_sessions")
    session = relationship("PracticeSession", foreign_keys=[session_id])
    partner_session = relationship("PracticeSession", foreign_keys=[partner_session_id])

