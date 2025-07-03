"""Forum media models for storing uploaded images and videos."""
from typing import Optional, TYPE_CHECKING
from datetime import datetime
from sqlalchemy import Column, String, Integer, ForeignKey, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP, ARRAY
from sqlalchemy.orm import relationship, Mapped, mapped_column
import uuid
import enum

from app.db.base_class import Base

if TYPE_CHECKING:
    from app.models.forum import Post, Comment
    from app.models.user import User


class MediaType(str, enum.Enum):
    IMAGE = "image"
    VIDEO = "video"


class ForumMedia(Base):
    """Media files uploaded for forum posts and comments."""
    __tablename__ = "forum_media"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Owner of the media - either post or comment
    post_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("forum_posts.id"))
    comment_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("forum_comments.id"))
    
    # Uploader info
    uploader_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Media details
    media_type: Mapped[MediaType] = mapped_column(String, nullable=False)
    s3_key: Mapped[str] = mapped_column(String, nullable=False)  # S3/MinIO object key
    original_filename: Mapped[str] = mapped_column(String, nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    content_type: Mapped[str] = mapped_column(String, nullable=False)  # MIME type
    
    # Image specific metadata
    width: Mapped[Optional[int]] = mapped_column(Integer)
    height: Mapped[Optional[int]] = mapped_column(Integer)
    
    # Video specific metadata
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer)
    
    # Processing status
    processed: Mapped[bool] = mapped_column(Boolean, default=False)
    thumbnail_s3_key: Mapped[Optional[str]] = mapped_column(String)  # For videos
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    post: Mapped[Optional["Post"]] = relationship("Post", back_populates="media_files")
    comment: Mapped[Optional["Comment"]] = relationship("Comment", back_populates="media_files")
    uploader: Mapped["User"] = relationship("User", back_populates="forum_media")
    
    def __repr__(self) -> str:
        return f"<ForumMedia {self.id} - {self.media_type} - {self.original_filename}>"