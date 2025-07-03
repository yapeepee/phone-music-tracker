from typing import Optional, List, Dict, Any, TYPE_CHECKING
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, ForeignKey, Table, Enum, Float, Boolean, JSON, func
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP
from sqlalchemy.orm import relationship, Mapped, mapped_column
import uuid
import enum

from app.db.base_class import Base

if TYPE_CHECKING:
    from app.models.user import Student, Teacher, User
    from app.models.forum import Post
    from app.models.practice_segment import PracticeSegment, SegmentClick
    from app.models.tempo import TempoTracking
    from app.models.timer import SessionTimer
    from app.models.practice_partner import PracticePartnerMatch


class PracticeFocus(str, enum.Enum):
    TECHNIQUE = "technique"
    MUSICALITY = "musicality"
    RHYTHM = "rhythm"
    INTONATION = "intonation"
    OTHER = "other"


class VideoQuality(str, enum.Enum):
    LOW = "low"          # 360p
    MEDIUM = "medium"    # 720p
    HIGH = "high"        # 1080p
    ORIGINAL = "original"


class ProcessingStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# Association table for many-to-many relationship between sessions and tags
session_tags = Table(
    "session_tags",
    Base.metadata,
    Column("session_id", UUID(as_uuid=True), ForeignKey("practice_sessions.id"), primary_key=True),
    Column("tag_id", UUID(as_uuid=True), ForeignKey("tags.id"), primary_key=True),
)

# Association table for users' current pieces
user_current_pieces = Table(
    "user_current_pieces",
    Base.metadata,
    Column("user_id", UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True),
    Column("piece_id", UUID(as_uuid=True), ForeignKey("tags.id"), primary_key=True),
    Column("started_at", TIMESTAMP(timezone=True), default=func.now()),
    Column("notes", Text),
    Column("priority", Integer, default=3),
    Column("last_practiced_at", TIMESTAMP(timezone=True)),
    Column("practice_session_count", Integer, default=0),
    Column("created_at", TIMESTAMP(timezone=True), default=func.now()),
    Column("updated_at", TIMESTAMP(timezone=True), default=func.now()),
)


class PracticeSession(Base):
    __tablename__ = "practice_sessions"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.user_id"), nullable=False)
    focus: Mapped[Optional[PracticeFocus]] = mapped_column(Enum(PracticeFocus), nullable=True)
    start_time: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    end_time: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True))
    self_rating: Mapped[Optional[int]] = mapped_column(Integer)
    note: Mapped[Optional[str]] = mapped_column(Text)
    is_synced: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Video processing fields
    video_url: Mapped[Optional[str]] = mapped_column(String(500))  # Original video S3 key
    processing_status: Mapped[Optional[ProcessingStatus]] = mapped_column(Enum(ProcessingStatus))
    processing_progress: Mapped[Optional[float]] = mapped_column(Float, default=0.0)
    processing_error: Mapped[Optional[str]] = mapped_column(Text)
    processing_result: Mapped[Optional[Dict]] = mapped_column(JSON)  # Stores paths to processed files
    processing_started_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True))
    processing_completed_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True))
    
    # Primary piece tracking
    primary_piece_tag_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("tags.id"))
    
    # Tempo tracking fields
    target_tempo: Mapped[Optional[int]] = mapped_column(Integer)
    practice_mode: Mapped[str] = mapped_column(String(20), default="normal")
    
    # Relationships
    student: Mapped["Student"] = relationship("Student", back_populates="practice_sessions")
    tags: Mapped[List["Tag"]] = relationship("Tag", secondary=session_tags, back_populates="sessions")
    videos: Mapped[List["Video"]] = relationship("Video", back_populates="session")
    metrics: Mapped[List["Metric"]] = relationship("Metric", back_populates="session")
    feedback: Mapped[List["Feedback"]] = relationship("Feedback", back_populates="session")
    analytics_metrics: Mapped[List["PracticeMetrics"]] = relationship("PracticeMetrics", back_populates="session")
    analysis_result: Mapped[Optional["AnalysisResult"]] = relationship("AnalysisResult", back_populates="session", uselist=False)
    primary_piece: Mapped[Optional["Tag"]] = relationship("Tag", foreign_keys=[primary_piece_tag_id], overlaps="tags")
    segment_clicks: Mapped[List["SegmentClick"]] = relationship("SegmentClick", back_populates="session")
    tempo_tracking: Mapped[List["TempoTracking"]] = relationship("TempoTracking", back_populates="session")
    timer: Mapped[Optional["SessionTimer"]] = relationship("SessionTimer", back_populates="session", uselist=False)
    
    @property
    def duration_minutes(self) -> Optional[int]:
        if self.start_time and self.end_time:
            return int((self.end_time - self.start_time).total_seconds() / 60)
        return None
    
    def __repr__(self) -> str:
        return f"<PracticeSession {self.id}>"


class Tag(Base):
    __tablename__ = "tags"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_teacher_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("teachers.user_id"))
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    color: Mapped[Optional[str]] = mapped_column(String(7))  # Hex color
    
    # New fields for piece tracking
    tag_type: Mapped[str] = mapped_column(String(20), default="general")  # 'piece', 'technique', 'general'
    composer: Mapped[Optional[str]] = mapped_column(String(100))
    opus_number: Mapped[Optional[str]] = mapped_column(String(50))
    difficulty_level: Mapped[Optional[int]] = mapped_column(Integer)  # 1-10
    estimated_mastery_sessions: Mapped[Optional[int]] = mapped_column(Integer)
    
    # Archive fields
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    archived_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True))
    
    # Relationships
    owner: Mapped[Optional["Teacher"]] = relationship("Teacher", back_populates="tags")
    sessions: Mapped[List["PracticeSession"]] = relationship(
        "PracticeSession", 
        secondary=session_tags, 
        back_populates="tags"
    )
    posts: Mapped[List["Post"]] = relationship(
        "Post",
        secondary="post_tags",
        back_populates="tags",
        overlaps="sessions"
    )
    practice_segments: Mapped[List["PracticeSegment"]] = relationship(
        "PracticeSegment",
        back_populates="piece",
        cascade="all, delete-orphan",
        overlaps="sessions,posts"
    )
    
    # Users currently working on this piece
    current_users: Mapped[List["User"]] = relationship(
        "User",
        secondary=user_current_pieces,
        back_populates="current_pieces"
    )
    
    # Practice partner matches for this piece
    partner_matches: Mapped[List["PracticePartnerMatch"]] = relationship(
        "PracticePartnerMatch",
        back_populates="piece"
    )
    
    def __repr__(self) -> str:
        return f"<Tag {self.name} ({self.tag_type})>"


class Video(Base):
    __tablename__ = "videos"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("practice_sessions.id"), nullable=False)
    s3_key: Mapped[str] = mapped_column(String(500), nullable=False)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    thumbnail_s3_key: Mapped[Optional[str]] = mapped_column(String(500))
    processed: Mapped[bool] = mapped_column(Boolean, default=False)
    processing_error: Mapped[Optional[str]] = mapped_column(Text)
    
    # TUS upload fields
    upload_id: Mapped[Optional[str]] = mapped_column(String(100), unique=True, index=True)
    upload_offset: Mapped[int] = mapped_column(Integer, default=0)
    upload_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    upload_metadata: Mapped[Optional[Dict]] = mapped_column(JSON)  # JSON metadata
    upload_expires_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True))
    
    # Relationships
    session: Mapped["PracticeSession"] = relationship("PracticeSession", back_populates="videos")
    feedback: Mapped[List["Feedback"]] = relationship("Feedback", back_populates="video")
    
    def __repr__(self) -> str:
        return f"<Video {self.id}>"


class Metric(Base):
    __tablename__ = "metrics"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("practice_sessions.id"), nullable=False)
    metric_key: Mapped[str] = mapped_column(String(50), nullable=False)
    metric_value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[Optional[str]] = mapped_column(String(20))
    timestamp: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    
    # Relationships
    session: Mapped["PracticeSession"] = relationship("PracticeSession", back_populates="metrics")
    
    def __repr__(self) -> str:
        return f"<Metric {self.metric_key}: {self.metric_value}>"


class Feedback(Base):
    __tablename__ = "feedback"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("teachers.user_id"), nullable=False)
    session_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("practice_sessions.id"))
    video_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("videos.id"))
    text: Mapped[str] = mapped_column(Text, nullable=False)
    rating: Mapped[Optional[int]] = mapped_column(Integer)
    timestamp_seconds: Mapped[Optional[int]] = mapped_column(Integer)  # For video-specific feedback
    
    # Relationships
    teacher: Mapped["Teacher"] = relationship("Teacher", back_populates="feedback")
    session: Mapped[Optional["PracticeSession"]] = relationship("PracticeSession", back_populates="feedback")
    video: Mapped[Optional["Video"]] = relationship("Video", back_populates="feedback")
    
    def __repr__(self) -> str:
        return f"<Feedback {self.id}>"