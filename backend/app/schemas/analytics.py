"""Pydantic schemas for analytics API responses."""
from typing import List, Dict, Optional, Any
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field

from app.models.analytics import MetricType


class MetricDataPoint(BaseModel):
    """A single metric data point."""
    time: datetime
    value: float
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    extra_data: Optional[Dict[str, Any]] = None


class MetricsResponse(BaseModel):
    """Response for time-series metrics query."""
    session_id: UUID
    metrics: Dict[str, List[MetricDataPoint]] = Field(
        description="Metrics grouped by type"
    )
    total_points: int = Field(description="Total number of data points")


class AnalysisResultResponse(BaseModel):
    """Response for analysis result query."""
    id: UUID
    session_id: UUID
    analyzed_at: datetime
    analysis_version: str
    
    # Overall scores (0-100)
    overall_consistency_score: float
    tempo_score: float
    pitch_score: float
    dynamics_score: float
    vibrato_score: float
    technical_proficiency_score: float
    musical_expression_score: float
    
    # Summary statistics
    average_tempo_bpm: Optional[float] = None
    tempo_stability: Optional[float] = None
    pitch_range_min_hz: Optional[float] = None
    pitch_range_max_hz: Optional[float] = None
    pitch_stability: Optional[float] = None
    dynamic_range_db: Optional[float] = None
    dynamics_stability: Optional[float] = None
    vibrato_rate_hz: Optional[float] = None
    vibrato_extent_percent: Optional[float] = None
    note_onset_count: Optional[int] = None
    timing_consistency: Optional[float] = None
    
    # Full analysis data
    full_analysis_data: Optional[Dict[str, Any]] = None
    
    # Processing metadata
    processing_time_seconds: Optional[float] = None
    error_message: Optional[str] = None
    
    class Config:
        from_attributes = True


class AnalyticsSummary(BaseModel):
    """Summary of analytics over a time period."""
    total_sessions: int
    average_scores: Dict[str, float] = Field(
        description="Average scores for each metric type"
    )
    improvement_percentages: Dict[str, float] = Field(
        description="Percentage improvement for each metric"
    )
    total_practice_minutes: int
    days_practiced: int


class DailyAverage(BaseModel):
    """Daily average for a metric."""
    date: datetime
    value: float
    sample_count: int


class WeeklyAverage(BaseModel):
    """Weekly average for a metric."""
    week_start: datetime
    value: float
    sample_count: int


class TrendAnalysis(BaseModel):
    """Trend analysis for a specific metric."""
    metric_type: MetricType
    daily_averages: List[Dict[str, Any]] = Field(
        description="Daily average values"
    )
    weekly_averages: List[Dict[str, Any]] = Field(
        description="Weekly average values"
    )
    trend_direction: str = Field(
        description="Direction of trend: improving, declining, stable, neutral, insufficient_data"
    )
    trend_strength: float = Field(
        description="Strength of trend as percentage change per day"
    )