"""Analytics API endpoints for practice session metrics and analysis results."""
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.analytics import PracticeMetrics, AnalysisResult, MetricType
from app.models.practice import PracticeSession
from app.schemas.analytics import (
    AnalysisResultResponse,
    MetricsResponse,
    MetricDataPoint,
    AnalyticsSummary,
    TrendAnalysis
)

router = APIRouter()


@router.get("/sessions/{session_id}/analytics", response_model=AnalysisResultResponse)
async def get_session_analytics(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> AnalysisResultResponse:
    """Get the analysis result for a specific practice session."""
    # First verify the user has access to this session
    session_query = select(PracticeSession).where(
        and_(
            PracticeSession.id == session_id,
            PracticeSession.student_id == current_user.id
        )
    )
    session = await db.scalar(session_query)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or access denied"
        )
    
    # Get the analysis result
    analysis_query = select(AnalysisResult).where(
        AnalysisResult.session_id == session_id
    )
    analysis = await db.scalar(analysis_query)
    
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found for this session"
        )
    
    return AnalysisResultResponse.model_validate(analysis)


@router.get("/sessions/{session_id}/metrics", response_model=MetricsResponse)
async def get_session_metrics(
    session_id: UUID,
    metric_type: Optional[MetricType] = Query(None, description="Filter by metric type"),
    start_time: Optional[datetime] = Query(None, description="Start time for time range"),
    end_time: Optional[datetime] = Query(None, description="End time for time range"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> MetricsResponse:
    """Get time-series metrics for a specific practice session."""
    # Verify access to session
    session_query = select(PracticeSession).where(
        and_(
            PracticeSession.id == session_id,
            PracticeSession.student_id == current_user.id
        )
    )
    session = await db.scalar(session_query)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or access denied"
        )
    
    # Build metrics query
    metrics_query = select(PracticeMetrics).where(
        PracticeMetrics.session_id == session_id
    )
    
    # Apply filters
    if metric_type:
        metrics_query = metrics_query.where(PracticeMetrics.metric_type == metric_type)
    
    if start_time:
        metrics_query = metrics_query.where(PracticeMetrics.time >= start_time)
    
    if end_time:
        metrics_query = metrics_query.where(PracticeMetrics.time <= end_time)
    
    # Order by time
    metrics_query = metrics_query.order_by(PracticeMetrics.time)
    
    result = await db.execute(metrics_query)
    metrics = result.scalars().all()
    
    # Group metrics by type
    metrics_by_type: Dict[str, List[MetricDataPoint]] = {}
    for metric in metrics:
        if metric.metric_type.value not in metrics_by_type:
            metrics_by_type[metric.metric_type.value] = []
        
        metrics_by_type[metric.metric_type.value].append(
            MetricDataPoint(
                time=metric.time,
                value=metric.value,
                confidence=metric.confidence,
                extra_data=metric.extra_data
            )
        )
    
    return MetricsResponse(
        session_id=session_id,
        metrics=metrics_by_type,
        total_points=len(metrics)
    )


@router.get("/analytics/summary", response_model=AnalyticsSummary)
async def get_analytics_summary(
    days: int = Query(30, ge=1, le=365, description="Number of days to include"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> AnalyticsSummary:
    """Get analytics summary for the current user over a time period."""
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Get all sessions with analysis results for the time period
    sessions_query = select(PracticeSession).options(
        selectinload(PracticeSession.analysis_result)
    ).where(
        and_(
            PracticeSession.student_id == current_user.id,
            PracticeSession.created_at >= start_date,
            PracticeSession.analysis_result.has()
        )
    )
    
    result = await db.execute(sessions_query)
    sessions = result.scalars().all()
    
    if not sessions:
        # Return empty summary
        return AnalyticsSummary(
            total_sessions=0,
            average_scores={},
            improvement_percentages={},
            total_practice_minutes=0,
            days_practiced=0
        )
    
    # Calculate summary statistics
    total_sessions = len(sessions)
    
    # Calculate average scores
    score_sums = {
        "overall_consistency": 0.0,
        "tempo": 0.0,
        "pitch": 0.0,
        "dynamics": 0.0,
        "vibrato": 0.0,
        "technical_proficiency": 0.0,
        "musical_expression": 0.0
    }
    
    for session in sessions:
        if session.analysis_result:
            score_sums["overall_consistency"] += session.analysis_result.overall_consistency_score
            score_sums["tempo"] += session.analysis_result.tempo_score
            score_sums["pitch"] += session.analysis_result.pitch_score
            score_sums["dynamics"] += session.analysis_result.dynamics_score
            score_sums["vibrato"] += session.analysis_result.vibrato_score
            score_sums["technical_proficiency"] += session.analysis_result.technical_proficiency_score
            score_sums["musical_expression"] += session.analysis_result.musical_expression_score
    
    average_scores = {k: v / total_sessions for k, v in score_sums.items()}
    
    # Calculate improvement (compare first and last quarter of sessions)
    quarter_size = max(1, total_sessions // 4)
    first_quarter = sessions[:quarter_size]
    last_quarter = sessions[-quarter_size:]
    
    improvement_percentages = {}
    for score_type in score_sums.keys():
        first_avg = sum(getattr(s.analysis_result, f"{score_type}_score", 0) 
                       for s in first_quarter) / len(first_quarter)
        last_avg = sum(getattr(s.analysis_result, f"{score_type}_score", 0) 
                      for s in last_quarter) / len(last_quarter)
        
        if first_avg > 0:
            improvement_percentages[score_type] = ((last_avg - first_avg) / first_avg) * 100
        else:
            improvement_percentages[score_type] = 0
    
    # Calculate total practice time and days
    total_minutes = sum(s.duration_minutes or 0 for s in sessions)
    practice_days = len(set(s.created_at.date() for s in sessions))
    
    return AnalyticsSummary(
        total_sessions=total_sessions,
        average_scores=average_scores,
        improvement_percentages=improvement_percentages,
        total_practice_minutes=total_minutes,
        days_practiced=practice_days
    )


@router.get("/analytics/trends", response_model=TrendAnalysis)
async def get_analytics_trends(
    metric_type: MetricType = Query(..., description="Metric type to analyze"),
    days: int = Query(30, ge=7, le=365, description="Number of days to analyze"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> TrendAnalysis:
    """Get trend analysis for a specific metric type over time."""
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Query for daily averages of the specified metric
    daily_avg_query = select(
        func.date_trunc('day', PracticeMetrics.time).label('day'),
        func.avg(PracticeMetrics.value).label('avg_value'),
        func.count(PracticeMetrics.value).label('count')
    ).join(
        PracticeSession,
        PracticeMetrics.session_id == PracticeSession.id
    ).where(
        and_(
            PracticeSession.student_id == current_user.id,
            PracticeMetrics.metric_type == metric_type,
            PracticeMetrics.time >= start_date
        )
    ).group_by(
        'day'
    ).order_by('day')
    
    result = await db.execute(daily_avg_query)
    daily_data = result.all()
    
    if not daily_data:
        return TrendAnalysis(
            metric_type=metric_type,
            daily_averages=[],
            weekly_averages=[],
            trend_direction="neutral",
            trend_strength=0.0
        )
    
    # Format daily averages
    daily_averages = [
        {
            "date": row.day,
            "value": float(row.avg_value),
            "sample_count": row.count
        }
        for row in daily_data
    ]
    
    # Calculate weekly averages
    weekly_avg_query = select(
        func.date_trunc('week', PracticeMetrics.time).label('week'),
        func.avg(PracticeMetrics.value).label('avg_value'),
        func.count(PracticeMetrics.value).label('count')
    ).join(
        PracticeSession,
        PracticeMetrics.session_id == PracticeSession.id
    ).where(
        and_(
            PracticeSession.student_id == current_user.id,
            PracticeMetrics.metric_type == metric_type,
            PracticeMetrics.time >= start_date
        )
    ).group_by(
        'week'
    ).order_by('week')
    
    weekly_result = await db.execute(weekly_avg_query)
    weekly_data = weekly_result.all()
    
    weekly_averages = [
        {
            "week_start": row.week,
            "value": float(row.avg_value),
            "sample_count": row.count
        }
        for row in weekly_data
    ]
    
    # Calculate trend direction and strength
    if len(daily_averages) >= 7:
        # Simple linear regression on daily values
        x_values = list(range(len(daily_averages)))
        y_values = [d["value"] for d in daily_averages]
        
        # Calculate slope
        n = len(x_values)
        x_mean = sum(x_values) / n
        y_mean = sum(y_values) / n
        
        numerator = sum((x - x_mean) * (y - y_mean) for x, y in zip(x_values, y_values))
        denominator = sum((x - x_mean) ** 2 for x in x_values)
        
        if denominator > 0:
            slope = numerator / denominator
            
            # Normalize slope to percentage change per day
            if y_mean > 0:
                trend_strength = (slope / y_mean) * 100
            else:
                trend_strength = 0
            
            if trend_strength > 0.5:
                trend_direction = "improving"
            elif trend_strength < -0.5:
                trend_direction = "declining"
            else:
                trend_direction = "stable"
        else:
            trend_direction = "neutral"
            trend_strength = 0.0
    else:
        trend_direction = "insufficient_data"
        trend_strength = 0.0
    
    return TrendAnalysis(
        metric_type=metric_type,
        daily_averages=daily_averages,
        weekly_averages=weekly_averages,
        trend_direction=trend_direction,
        trend_strength=trend_strength
    )