"""Challenge and achievement models for practice gamification."""
from typing import Optional, Dict, Any, TYPE_CHECKING
from datetime import datetime, date
from sqlalchemy import Column, String, Integer, Text, ForeignKey, Boolean, JSON, Enum, Date, Float, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP
from sqlalchemy.orm import relationship, Mapped, mapped_column
import uuid
import enum

from app.db.base_class import Base

if TYPE_CHECKING:
    from app.models.user import User


class ChallengeType(str, enum.Enum):
    """Types of challenges available."""
    STREAK = "STREAK"  # Practice X days in a row
    TOTAL_SESSIONS = "TOTAL_SESSIONS"  # Complete X sessions
    SCORE_THRESHOLD = "SCORE_THRESHOLD"  # Achieve X score in a metric
    DURATION = "DURATION"  # Practice for X minutes total
    FOCUS_SPECIFIC = "FOCUS_SPECIFIC"  # Practice X sessions with specific focus
    TIME_OF_DAY = "TIME_OF_DAY"  # Practice at specific times
    WEEKLY_GOAL = "WEEKLY_GOAL"  # Complete X sessions per week


class ChallengeStatus(str, enum.Enum):
    """Status of a user's challenge."""
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    EXPIRED = "EXPIRED"


class AchievementTier(str, enum.Enum):
    """Tiers for achievements."""
    BRONZE = "BRONZE"
    SILVER = "SILVER"
    GOLD = "GOLD"
    PLATINUM = "PLATINUM"


class Challenge(Base):
    """Definition of a practice challenge."""
    __tablename__ = "challenges"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[ChallengeType] = mapped_column(Enum(ChallengeType), nullable=False)
    
    # Challenge requirements
    target_value: Mapped[int] = mapped_column(Integer, nullable=False)  # e.g., 7 for 7-day streak
    target_metric: Mapped[Optional[str]] = mapped_column(String(50))  # e.g., "tempo_score" for score challenges
    target_focus: Mapped[Optional[str]] = mapped_column(String(50))  # e.g., "technique" for focus-specific
    
    # Rewards
    reputation_reward: Mapped[int] = mapped_column(Integer, default=10)
    achievement_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("achievements.id")
    )
    
    # Display
    icon: Mapped[str] = mapped_column(String(50), default="trophy")  # Icon name
    color: Mapped[str] = mapped_column(String(7), default="#6366F1")  # Hex color
    order_index: Mapped[int] = mapped_column(Integer, default=0)  # Display order
    
    # Availability
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    start_date: Mapped[Optional[date]] = mapped_column(Date)  # When challenge becomes available
    end_date: Mapped[Optional[date]] = mapped_column(Date)  # When challenge expires
    is_repeatable: Mapped[bool] = mapped_column(Boolean, default=True)  # Can be completed multiple times
    cooldown_days: Mapped[Optional[int]] = mapped_column(Integer)  # Days before can repeat
    
    # Metadata
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    achievement: Mapped[Optional["Achievement"]] = relationship("Achievement", back_populates="challenges")
    user_challenges: Mapped[list["UserChallenge"]] = relationship("UserChallenge", back_populates="challenge")
    
    def __repr__(self) -> str:
        return f"<Challenge {self.name}>"


class Achievement(Base):
    """Achievements that can be earned."""
    __tablename__ = "achievements"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    tier: Mapped[AchievementTier] = mapped_column(Enum(AchievementTier), nullable=False)
    
    # Display
    icon: Mapped[str] = mapped_column(String(50), default="medal")
    badge_image_url: Mapped[Optional[str]] = mapped_column(String(500))  # Optional badge image
    
    # Stats
    total_earned: Mapped[int] = mapped_column(Integer, default=0)  # How many users earned this
    
    # Metadata
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    
    # Relationships
    challenges: Mapped[list["Challenge"]] = relationship("Challenge", back_populates="achievement")
    user_achievements: Mapped[list["UserAchievement"]] = relationship("UserAchievement", back_populates="achievement")
    
    def __repr__(self) -> str:
        return f"<Achievement {self.name} ({self.tier})>"


class UserChallenge(Base):
    """Tracks user progress on challenges."""
    __tablename__ = "user_challenges"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    challenge_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("challenges.id"), nullable=False)
    
    # Progress
    status: Mapped[ChallengeStatus] = mapped_column(
        Enum(ChallengeStatus), 
        nullable=False, 
        default=ChallengeStatus.NOT_STARTED
    )
    current_value: Mapped[int] = mapped_column(Integer, default=0)
    progress_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON)  # Additional progress tracking
    
    # Dates
    started_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True))
    completed_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True))
    expires_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True))
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="user_challenges")
    challenge: Mapped["Challenge"] = relationship("Challenge", back_populates="user_challenges")
    
    # Ensure user can only have one active instance of each challenge
    __table_args__ = (
        UniqueConstraint('user_id', 'challenge_id',
                        name='unique_user_challenge'),
    )
    
    def __repr__(self) -> str:
        return f"<UserChallenge {self.user_id} - {self.challenge_id}: {self.status}>"


class UserAchievement(Base):
    """Tracks achievements earned by users."""
    __tablename__ = "user_achievements"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    achievement_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("achievements.id"), nullable=False)
    
    # When earned
    earned_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)
    
    # How it was earned (which challenge completed)
    earned_from_challenge_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("challenges.id")
    )
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="user_achievements")
    achievement: Mapped["Achievement"] = relationship("Achievement", back_populates="user_achievements")
    
    # Ensure user can only earn each achievement once
    __table_args__ = (
        UniqueConstraint('user_id', 'achievement_id', name='unique_user_achievement'),
    )
    
    def __repr__(self) -> str:
        return f"<UserAchievement {self.user_id} - {self.achievement_id}>"