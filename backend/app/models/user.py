from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import Column, String, Boolean, Enum, ForeignKey, JSON, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, Mapped, mapped_column
import uuid
import enum

from app.db.base_class import Base

if TYPE_CHECKING:
    from app.models.practice import PracticeSession, Tag, Feedback
    from app.models.practice_segment import PracticeSegment
    from app.models.forum import Post, Comment, PostVote, CommentVote
    from app.models.forum_media import ForumMedia
    from app.models.notification import Notification
    from app.models.notification_preferences import NotificationPreferences
    from app.models.reputation import ReputationHistory
    from app.models.schedule import ScheduleEvent
    from app.models.tempo import TempoAchievement
    from app.models.practice_partner import (
        UserAvailability, UserPracticePreferences, PracticePartnerMatch
    )


class UserRole(str, enum.Enum):
    STUDENT = "student"
    TEACHER = "teacher"
    ADMIN = "admin"


class StudentLevel(str, enum.Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class ReputationLevel(str, enum.Enum):
    NEWCOMER = "newcomer"
    CONTRIBUTOR = "contributor"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    VETERAN = "veteran"
    EXPERT = "expert"


class User(Base):
    __tablename__ = "users"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False)
    timezone: Mapped[str] = mapped_column(String(50), default="UTC")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Reputation system
    reputation_points: Mapped[int] = mapped_column(Integer, default=0)
    reputation_level: Mapped[str] = mapped_column(String(20), default="newcomer")
    
    # Push notification fields
    push_token: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    push_platform: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    
    # Relationships
    teacher_profile: Mapped[Optional["Teacher"]] = relationship("Teacher", back_populates="user", uselist=False)
    student_profile: Mapped[Optional["Student"]] = relationship("Student", back_populates="user", uselist=False)
    notifications: Mapped[List["Notification"]] = relationship("Notification", back_populates="user")
    notification_preferences: Mapped[Optional["NotificationPreferences"]] = relationship("NotificationPreferences", back_populates="user", uselist=False)
    forum_posts: Mapped[List["Post"]] = relationship("Post", back_populates="author")
    user_challenges: Mapped[List["UserChallenge"]] = relationship("UserChallenge", back_populates="user")
    user_achievements: Mapped[List["UserAchievement"]] = relationship("UserAchievement", back_populates="user")
    forum_comments: Mapped[List["Comment"]] = relationship("Comment", back_populates="author")
    post_votes: Mapped[List["PostVote"]] = relationship("PostVote", back_populates="user")
    comment_votes: Mapped[List["CommentVote"]] = relationship("CommentVote", back_populates="user")
    forum_media: Mapped[List["ForumMedia"]] = relationship("ForumMedia", back_populates="uploader")
    reputation_history: Mapped[List["ReputationHistory"]] = relationship("ReputationHistory", back_populates="user")
    
    # Schedule relationships
    taught_events: Mapped[List["ScheduleEvent"]] = relationship(
        "ScheduleEvent", 
        foreign_keys="ScheduleEvent.teacher_id",
        back_populates="teacher"
    )
    scheduled_events: Mapped[List["ScheduleEvent"]] = relationship(
        "ScheduleEvent",
        secondary="event_participants",
        back_populates="participants"
    )
    
    # Current pieces relationship
    current_pieces: Mapped[List["Tag"]] = relationship(
        "Tag",
        secondary="user_current_pieces",
        back_populates="current_users"
    )
    
    # Practice partner relationships
    availability_slots: Mapped[List["UserAvailability"]] = relationship(
        "UserAvailability", 
        back_populates="user",
        cascade="all, delete-orphan"
    )
    practice_preferences: Mapped[Optional["UserPracticePreferences"]] = relationship(
        "UserPracticePreferences", 
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan"
    )
    partner_requests_sent: Mapped[List["PracticePartnerMatch"]] = relationship(
        "PracticePartnerMatch",
        foreign_keys="PracticePartnerMatch.requester_id",
        back_populates="requester"
    )
    partner_requests_received: Mapped[List["PracticePartnerMatch"]] = relationship(
        "PracticePartnerMatch",
        foreign_keys="PracticePartnerMatch.partner_id",
        back_populates="partner"
    )
    
    def __repr__(self) -> str:
        return f"<User {self.email}>"


class Teacher(Base):
    __tablename__ = "teachers"
    
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    bio: Mapped[Optional[str]] = mapped_column(String(1000))
    specialties: Mapped[List[str]] = mapped_column(JSON, default=list)
    default_tags: Mapped[List[dict]] = mapped_column(JSON, default=list)
    years_experience: Mapped[Optional[int]] = mapped_column()
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="teacher_profile")
    students: Mapped[List["Student"]] = relationship("Student", back_populates="teacher")
    tags: Mapped[List["Tag"]] = relationship("Tag", back_populates="owner")
    feedback: Mapped[List["Feedback"]] = relationship("Feedback", back_populates="teacher")
    
    def __repr__(self) -> str:
        return f"<Teacher {self.user_id}>"


class Student(Base):
    __tablename__ = "students"
    
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    primary_teacher_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("teachers.user_id"))
    level: Mapped[StudentLevel] = mapped_column(Enum(StudentLevel), default=StudentLevel.BEGINNER)
    instrument: Mapped[Optional[str]] = mapped_column(String(100))
    practice_goal_minutes: Mapped[int] = mapped_column(default=30)
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="student_profile")
    teacher: Mapped[Optional["Teacher"]] = relationship("Teacher", back_populates="students")
    practice_sessions: Mapped[List["PracticeSession"]] = relationship("PracticeSession", back_populates="student")
    practice_segments: Mapped[List["PracticeSegment"]] = relationship("PracticeSegment", back_populates="student")
    tempo_achievements: Mapped[List["TempoAchievement"]] = relationship("TempoAchievement", back_populates="student")
    
    def __repr__(self) -> str:
        return f"<Student {self.user_id}>"