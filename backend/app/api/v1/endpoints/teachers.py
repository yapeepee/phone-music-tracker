"""Teacher-specific endpoints for student management."""
from typing import List, Optional, Annotated
from datetime import datetime, timedelta, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.api.deps import get_current_teacher
from app.models.user import User, Student
from app.models.practice import PracticeSession
from app.services.auth.user_service import UserService
from app.services.practice.session_service import SessionService
from app.schemas.user import StudentActivity, StudentProfile, StudentWithUser
from app.schemas.practice import PracticeSession as PracticeSessionSchema


router = APIRouter()


@router.get("/students", response_model=List[StudentActivity])
async def get_teacher_students(
    current_teacher: Annotated[User, Depends(get_current_teacher)],
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    active_only: bool = Query(False, description="Filter to only active students (practiced in last 7 days)"),
) -> List[StudentActivity]:
    """Get all students assigned to the current teacher with activity summaries"""
    user_service = UserService(db)
    students = await user_service.get_teacher_students(
        teacher_id=current_teacher.id,
        skip=skip,
        limit=limit
    )
    
    # Calculate activity data for each student
    student_activities = []
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    
    for student in students:
        # Get recent sessions
        query = select(PracticeSession).where(
            PracticeSession.student_id == student.user_id,
            PracticeSession.start_time >= week_ago
        ).order_by(PracticeSession.start_time.desc())
        
        result = await db.execute(query)
        recent_sessions = result.scalars().all()
        
        # Get last session
        last_session_query = select(PracticeSession).where(
            PracticeSession.student_id == student.user_id
        ).order_by(PracticeSession.start_time.desc()).limit(1)
        
        last_result = await db.execute(last_session_query)
        last_session = last_result.scalar_one_or_none()
        
        # Calculate metrics
        total_sessions_week = len(recent_sessions)
        total_minutes_week = sum(s.duration_minutes or 0 for s in recent_sessions)
        ratings = [s.self_rating for s in recent_sessions if s.self_rating]
        average_rating_week = sum(ratings) / len(ratings) if ratings else None
        
        # Calculate streak
        session_service = SessionService(db)
        streak_days = await session_service._calculate_streak(student.user_id)
        
        # Determine if active
        is_active = bool(last_session and last_session.start_time >= week_ago)
        
        if not active_only or is_active:
            activity = StudentActivity(
                user_id=student.user_id,
                full_name=student.user.full_name,
                email=student.user.email,
                instrument=student.instrument,
                level=student.level,
                practice_goal_minutes=student.practice_goal_minutes,
                last_session_date=last_session.start_time if last_session else None,
                total_sessions_week=total_sessions_week,
                total_minutes_week=total_minutes_week,
                average_rating_week=average_rating_week,
                streak_days=streak_days,
                is_active=is_active
            )
            student_activities.append(activity)
    
    # Sort by last session date (most recent first)
    student_activities.sort(
        key=lambda x: x.last_session_date or datetime.min,
        reverse=True
    )
    
    return student_activities


@router.get("/students/{student_id}", response_model=StudentProfile)
async def get_student_profile(
    student_id: UUID,
    current_teacher: Annotated[User, Depends(get_current_teacher)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StudentProfile:
    """Get detailed profile for a specific student"""
    user_service = UserService(db)
    
    # Get student and verify teacher access
    student = await user_service.get_student_profile(student_id)
    if not student or student.primary_teacher_id != current_teacher.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this student"
        )
    
    # Get all sessions for overall stats
    all_sessions_query = select(PracticeSession).where(
        PracticeSession.student_id == student_id
    )
    all_result = await db.execute(all_sessions_query)
    all_sessions = all_result.scalars().all()
    
    # Calculate overall statistics
    total_sessions = len(all_sessions)
    total_minutes = sum(s.duration_minutes or 0 for s in all_sessions)
    avg_minutes = total_minutes / total_sessions if total_sessions > 0 else None
    
    ratings = [s.self_rating for s in all_sessions if s.self_rating]
    avg_rating = sum(ratings) / len(ratings) if ratings else None
    
    # Get recent activity
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    
    # Last 7 days
    week_sessions_query = select(PracticeSession).where(
        PracticeSession.student_id == student_id,
        PracticeSession.start_time >= week_ago
    )
    week_result = await db.execute(week_sessions_query)
    week_sessions = week_result.scalars().all()
    
    sessions_last_7_days = len(week_sessions)
    minutes_last_7_days = sum(s.duration_minutes or 0 for s in week_sessions)
    
    # Last 30 days
    month_sessions_query = select(PracticeSession).where(
        PracticeSession.student_id == student_id,
        PracticeSession.start_time >= month_ago
    )
    month_result = await db.execute(month_sessions_query)
    month_sessions = month_result.scalars().all()
    
    sessions_last_30_days = len(month_sessions)
    minutes_last_30_days = sum(s.duration_minutes or 0 for s in month_sessions)
    
    # Calculate improvement trend (compare recent ratings to older ones)
    improvement_trend = None
    if len(ratings) >= 10:
        recent_ratings = ratings[:5]
        older_ratings = ratings[-5:]
        recent_avg = sum(recent_ratings) / len(recent_ratings)
        older_avg = sum(older_ratings) / len(older_ratings)
        improvement_trend = (recent_avg - older_avg) / older_avg if older_avg > 0 else 0
    
    # Calculate consistency score (based on practice frequency)
    consistency_score = None
    if sessions_last_30_days > 0:
        expected_sessions = 30 * (student.practice_goal_minutes / 30)  # Assuming 30-min sessions
        consistency_score = min((sessions_last_30_days / expected_sessions) * 100, 100)
    
    # Create StudentWithUser object
    student_with_user = StudentWithUser(
        user_id=student.user_id,
        primary_teacher_id=student.primary_teacher_id,
        level=student.level,
        instrument=student.instrument,
        practice_goal_minutes=student.practice_goal_minutes,
        created_at=student.created_at,
        updated_at=student.updated_at,
        user=student.user
    )
    
    return StudentProfile(
        student=student_with_user,
        total_sessions=total_sessions,
        total_practice_minutes=total_minutes,
        average_session_minutes=avg_minutes,
        average_self_rating=avg_rating,
        sessions_last_7_days=sessions_last_7_days,
        minutes_last_7_days=minutes_last_7_days,
        sessions_last_30_days=sessions_last_30_days,
        minutes_last_30_days=minutes_last_30_days,
        improvement_trend=improvement_trend,
        consistency_score=consistency_score
    )


@router.get("/students/{student_id}/recent-sessions", response_model=List[PracticeSessionSchema])
async def get_student_recent_sessions(
    student_id: UUID,
    current_teacher: Annotated[User, Depends(get_current_teacher)],
    db: Annotated[AsyncSession, Depends(get_db)],
    days: int = Query(7, ge=1, le=90, description="Number of days to look back"),
    limit: int = Query(20, ge=1, le=100),
) -> List[PracticeSessionSchema]:
    """Get recent practice sessions for a specific student"""
    user_service = UserService(db)
    
    # Verify teacher access
    student = await user_service.get_student_profile(student_id)
    if not student or student.primary_teacher_id != current_teacher.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this student"
        )
    
    # Get recent sessions
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    session_service = SessionService(db)
    sessions = await session_service.get_sessions(
        student_id=student_id,
        start_date=start_date,
        limit=limit
    )
    
    # Convert to response format
    result = []
    for s in sessions:
        session_dict = {
            "id": s.id,
            "student_id": s.student_id,
            "focus": s.focus,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "self_rating": s.self_rating,
            "note": s.note,
            "tags": [tag.name for tag in s.tags],
            "is_synced": s.is_synced,
            "created_at": s.created_at,
            "updated_at": s.updated_at,
            "duration_minutes": s.duration_minutes
        }
        result.append(PracticeSessionSchema.model_validate(session_dict))
    
    return result