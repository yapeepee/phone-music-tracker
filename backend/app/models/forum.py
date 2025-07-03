"""Forum models for community Q&A feature."""
from typing import Optional, List, Dict, TYPE_CHECKING
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, ForeignKey, Table, Boolean, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP
from sqlalchemy.orm import relationship, Mapped, mapped_column
import uuid
import enum

from app.db.base_class import Base

if TYPE_CHECKING:
    from app.models.forum_media import ForumMedia
    from app.models.user import User
    from app.models.practice import Tag


class PostStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    CLOSED = "closed"  # No more answers accepted
    DELETED = "deleted"


class VoteType(int, enum.Enum):
    UPVOTE = 1
    DOWNVOTE = -1


class Post(Base):
    """Forum posts - questions or discussions."""
    __tablename__ = "forum_posts"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    author_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)  # Markdown content
    status: Mapped[PostStatus] = mapped_column(String, default=PostStatus.PUBLISHED)
    
    # Stats - denormalized for performance
    vote_score: Mapped[int] = mapped_column(Integer, default=0)
    comment_count: Mapped[int] = mapped_column(Integer, default=0)
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    
    # Best answer (for Q&A posts)
    accepted_answer_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("forum_comments.id"))
    
    # Related musical piece (for piece-specific discussions)
    related_piece_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("tags.id"))
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    last_activity_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    
    # Relationships
    author: Mapped["User"] = relationship("User", back_populates="forum_posts")
    comments: Mapped[List["Comment"]] = relationship("Comment", back_populates="post", foreign_keys="Comment.post_id")
    accepted_answer: Mapped[Optional["Comment"]] = relationship("Comment", foreign_keys=[accepted_answer_id], post_update=True)
    votes: Mapped[List["PostVote"]] = relationship("PostVote", back_populates="post", cascade="all, delete-orphan")
    tags: Mapped[List["Tag"]] = relationship("Tag", secondary="post_tags", back_populates="posts")
    media_files: Mapped[List["ForumMedia"]] = relationship("ForumMedia", back_populates="post", cascade="all, delete-orphan")
    related_piece: Mapped[Optional["Tag"]] = relationship("Tag", foreign_keys=[related_piece_id], overlaps="tags")
    
    def __repr__(self) -> str:
        return f"<Post {self.id} - {self.title[:30]}>"


class Comment(Base):
    """Comments on forum posts - can be nested for threading."""
    __tablename__ = "forum_comments"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("forum_posts.id"), nullable=False)
    author_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("forum_comments.id"))
    
    content: Mapped[str] = mapped_column(Text, nullable=False)  # Markdown content
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Stats - denormalized for performance
    vote_score: Mapped[int] = mapped_column(Integer, default=0)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    post: Mapped["Post"] = relationship("Post", back_populates="comments", foreign_keys=[post_id])
    author: Mapped["User"] = relationship("User", back_populates="forum_comments")
    parent: Mapped[Optional["Comment"]] = relationship("Comment", remote_side=[id], back_populates="children")
    children: Mapped[List["Comment"]] = relationship("Comment", back_populates="parent")
    votes: Mapped[List["CommentVote"]] = relationship("CommentVote", back_populates="comment", cascade="all, delete-orphan")
    media_files: Mapped[List["ForumMedia"]] = relationship("ForumMedia", back_populates="comment", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        return f"<Comment {self.id} on Post {self.post_id}>"


class PostVote(Base):
    """Votes on forum posts."""
    __tablename__ = "post_votes"
    __table_args__ = (
        UniqueConstraint('post_id', 'user_id', name='unique_post_vote'),
    )
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("forum_posts.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    vote_type: Mapped[int] = mapped_column(Integer, nullable=False)  # 1 for upvote, -1 for downvote
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    
    # Relationships
    post: Mapped["Post"] = relationship("Post", back_populates="votes")
    user: Mapped["User"] = relationship("User", back_populates="post_votes")


class CommentVote(Base):
    """Votes on forum comments."""
    __tablename__ = "comment_votes"
    __table_args__ = (
        UniqueConstraint('comment_id', 'user_id', name='unique_comment_vote'),
    )
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    comment_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("forum_comments.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    vote_type: Mapped[int] = mapped_column(Integer, nullable=False)  # 1 for upvote, -1 for downvote
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    
    # Relationships
    comment: Mapped["Comment"] = relationship("Comment", back_populates="votes")
    user: Mapped["User"] = relationship("User", back_populates="comment_votes")


# Association table for many-to-many relationship between posts and tags
post_tags = Table(
    "post_tags",
    Base.metadata,
    Column("post_id", UUID(as_uuid=True), ForeignKey("forum_posts.id"), primary_key=True),
    Column("tag_id", UUID(as_uuid=True), ForeignKey("tags.id"), primary_key=True),
)