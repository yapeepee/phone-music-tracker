"""Analytics models for storing time-series practice metrics using TimescaleDB."""
from typing import Optional, Dict, Any
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, ForeignKey, Enum, Float, Boolean, JSON, Index
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP
from sqlalchemy.orm import relationship, Mapped, mapped_column
import uuid
import enum

from app.db.base_class import Base


class MetricType(str, enum.Enum):
    """Types of metrics we track for practice sessions."""
    # Tempo metrics
    TEMPO_BPM = "tempo_bpm"
    TEMPO_STABILITY = "tempo_stability"
    BEAT_INTERVAL = "beat_interval"
    
    # Pitch metrics
    PITCH_HZ = "pitch_hz"
    PITCH_STABILITY = "pitch_stability"
    PITCH_CONFIDENCE = "pitch_confidence"
    PITCH_MIDI = "pitch_midi"
    
    # Dynamics metrics
    DYNAMICS_RMS = "dynamics_rms"
    DYNAMICS_DB = "dynamics_db"
    DYNAMICS_RANGE = "dynamics_range"
    DYNAMICS_STABILITY = "dynamics_stability"
    
    # Vibrato metrics
    VIBRATO_RATE = "vibrato_rate"
    VIBRATO_EXTENT = "vibrato_extent"
    VIBRATO_CONSISTENCY = "vibrato_consistency"
    
    # Note onset metrics
    NOTE_ONSET = "note_onset"
    ONSET_STRENGTH = "onset_strength"
    TIMING_CONSISTENCY = "timing_consistency"
    
    # Overall scores
    OVERALL_CONSISTENCY = "overall_consistency"
    TECHNICAL_PROFICIENCY = "technical_proficiency"
    MUSICAL_EXPRESSION = "musical_expression"


class PracticeMetrics(Base):
    """
    Time-series metrics for practice sessions.
    This table is designed to be used with TimescaleDB hypertables.
    """
    __tablename__ = "practice_metrics"
    
    # Time is the primary dimension for TimescaleDB
    time: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), 
        nullable=False,
        primary_key=True
    )
    
    # Session this metric belongs to
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("practice_sessions.id"), 
        nullable=False,
        primary_key=True
    )
    
    # Type of metric
    metric_type: Mapped[MetricType] = mapped_column(
        Enum(MetricType), 
        nullable=False,
        primary_key=True
    )
    
    # Metric value
    value: Mapped[float] = mapped_column(Float, nullable=False)
    
    # Optional confidence score for the measurement (0.0 to 1.0)
    confidence: Mapped[Optional[float]] = mapped_column(Float)
    
    # Additional metadata (e.g., note name for pitch, dynamic marking)
    extra_data: Mapped[Optional[Dict]] = mapped_column(JSON)
    
    # Relationships
    session: Mapped["PracticeSession"] = relationship(
        "PracticeSession",
        back_populates="analytics_metrics"
    )
    
    # Indexes for common queries
    __table_args__ = (
        Index('idx_practice_metrics_session_time', 'session_id', 'time'),
        Index('idx_practice_metrics_type_time', 'metric_type', 'time'),
        Index('idx_practice_metrics_session_type', 'session_id', 'metric_type'),
    )
    
    def __repr__(self) -> str:
        return f"<PracticeMetrics {self.metric_type}: {self.value} at {self.time}>"


class AnalysisResult(Base):
    """
    Stores the complete analysis result for a practice session.
    This is a summary table, while PracticeMetrics stores time-series data.
    """
    __tablename__ = "analysis_results"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    
    # Session this analysis belongs to
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("practice_sessions.id"), 
        nullable=False,
        unique=True
    )
    
    # When the analysis was performed
    analyzed_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), 
        nullable=False,
        default=datetime.utcnow
    )
    
    # Analysis version (for tracking improvements to algorithms)
    analysis_version: Mapped[str] = mapped_column(
        String(20), 
        nullable=False,
        default="1.0.0"
    )
    
    # Overall scores (0-100)
    overall_consistency_score: Mapped[float] = mapped_column(Float, nullable=False)
    tempo_score: Mapped[float] = mapped_column(Float, nullable=False)
    pitch_score: Mapped[float] = mapped_column(Float, nullable=False)
    dynamics_score: Mapped[float] = mapped_column(Float, nullable=False)
    vibrato_score: Mapped[float] = mapped_column(Float, nullable=False)
    technical_proficiency_score: Mapped[float] = mapped_column(Float, nullable=False)
    musical_expression_score: Mapped[float] = mapped_column(Float, nullable=False)
    
    # Summary statistics
    average_tempo_bpm: Mapped[Optional[float]] = mapped_column(Float)
    tempo_stability: Mapped[Optional[float]] = mapped_column(Float)
    pitch_range_min_hz: Mapped[Optional[float]] = mapped_column(Float)
    pitch_range_max_hz: Mapped[Optional[float]] = mapped_column(Float)
    pitch_stability: Mapped[Optional[float]] = mapped_column(Float)
    dynamic_range_db: Mapped[Optional[float]] = mapped_column(Float)
    dynamics_stability: Mapped[Optional[float]] = mapped_column(Float)
    vibrato_rate_hz: Mapped[Optional[float]] = mapped_column(Float)
    vibrato_extent_percent: Mapped[Optional[float]] = mapped_column(Float)
    note_onset_count: Mapped[Optional[int]] = mapped_column(Integer)
    timing_consistency: Mapped[Optional[float]] = mapped_column(Float)
    
    # Full analysis data (for detailed views)
    full_analysis_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON)
    
    # Processing metadata
    processing_time_seconds: Mapped[Optional[float]] = mapped_column(Float)
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    
    # Relationships
    session: Mapped["PracticeSession"] = relationship(
        "PracticeSession",
        back_populates="analysis_result"
    )
    
    # Indexes
    __table_args__ = (
        Index('idx_analysis_results_scores', 
              'overall_consistency_score', 
              'technical_proficiency_score',
              'musical_expression_score'),
    )
    
    def __repr__(self) -> str:
        return f"<AnalysisResult {self.session_id}: {self.overall_consistency_score:.1f}%>"