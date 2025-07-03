from typing import Optional, List, TYPE_CHECKING
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, ForeignKey, Boolean, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP
from sqlalchemy.orm import relationship, Mapped, mapped_column
import uuid

from app.db.base_class import Base

if TYPE_CHECKING:
    from app.models.user import Student
    from app.models.practice import Tag, PracticeSession


class PracticeSegment(Base):
    """Model for tracking practice segments within musical pieces"""
    __tablename__ = "practice_segments"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    piece_tag_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tags.id"), nullable=False)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.user_id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True))
    total_click_count: Mapped[int] = mapped_column(Integer, default=0)
    last_clicked_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True))
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    
    # Relationships
    piece: Mapped["Tag"] = relationship("Tag", back_populates="practice_segments")
    student: Mapped["Student"] = relationship("Student", back_populates="practice_segments")
    clicks: Mapped[List["SegmentClick"]] = relationship("SegmentClick", back_populates="segment", cascade="all, delete-orphan")
    
    # Unique constraint
    __table_args__ = (
        UniqueConstraint('piece_tag_id', 'student_id', 'name', name='uq_practice_segment_piece_student_name'),
    )
    
    def __repr__(self) -> str:
        return f"<PracticeSegment {self.name} for piece {self.piece_tag_id}>"


class SegmentClick(Base):
    """Model for tracking individual click events on practice segments"""
    __tablename__ = "segment_clicks"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    segment_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("practice_segments.id"), nullable=False)
    session_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("practice_sessions.id"))
    clicked_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    click_count: Mapped[int] = mapped_column(Integer, default=1)
    
    # Relationships
    segment: Mapped["PracticeSegment"] = relationship("PracticeSegment", back_populates="clicks")
    session: Mapped[Optional["PracticeSession"]] = relationship("PracticeSession", back_populates="segment_clicks")
    
    def __repr__(self) -> str:
        return f"<SegmentClick {self.id} for segment {self.segment_id}>"