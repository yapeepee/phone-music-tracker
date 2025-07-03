"""
API endpoints for tempo tracking and slow practice enforcement
"""
from typing import List, Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.models.user import User
from app.schemas.tempo import (
    TempoTracking,
    TempoTrackingCreate,
    TempoTrackingBatch,
    TempoStats,
    TempoAchievement,
    AchievementProgress,
    SessionTempoUpdate
)
from app.services.tempo_service import TempoService
from app.services.practice.session_service import SessionService

router = APIRouter()


@router.post("/{session_id}/tempo-track", response_model=TempoTracking)
async def record_tempo_data(
    session_id: UUID,
    tempo_data: TempoTrackingCreate,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_user)]
) -> TempoTracking:
    """Record tempo tracking data for a practice session"""
    # Verify session belongs to user (if student) or user's student (if teacher)
    session_service = SessionService(db)
    session = await session_service.get_session_by_id(session_id)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Practice session not found"
        )
    
    if current_user.role == "student" and session.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to track tempo for this session"
        )
    
    tempo_service = TempoService(db)
    try:
        return await tempo_service.record_tempo_entry(session_id, tempo_data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{session_id}/tempo-track/batch", response_model=List[TempoTracking])
async def record_tempo_batch(
    session_id: UUID,
    batch: TempoTrackingBatch,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_user)]
) -> List[TempoTracking]:
    """Record multiple tempo tracking entries at once"""
    # Verify session belongs to user
    session_service = SessionService(db)
    session = await session_service.get_session(session_id)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Practice session not found"
        )
    
    if current_user.role == "student" and session.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to track tempo for this session"
        )
    
    tempo_service = TempoService(db)
    try:
        return await tempo_service.record_tempo_batch(session_id, batch)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{session_id}/tempo-stats", response_model=TempoStats)
async def get_tempo_statistics(
    session_id: UUID,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_user)]
) -> TempoStats:
    """Get tempo statistics for a practice session"""
    # Verify access to session
    session_service = SessionService(db)
    session = await session_service.get_session(session_id)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Practice session not found"
        )
    
    # Students can only see their own, teachers can see their students'
    if current_user.role == "student" and session.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this session"
        )
    
    tempo_service = TempoService(db)
    return await tempo_service.get_session_tempo_stats(session_id)


@router.put("/{session_id}/target-tempo")
async def update_session_tempo(
    session_id: UUID,
    tempo_update: SessionTempoUpdate,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_user)]
):
    """Update target tempo and practice mode for a session"""
    # Verify session belongs to user
    session_service = SessionService(db)
    session = await session_service.get_session(session_id)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Practice session not found"
        )
    
    if current_user.role == "student" and session.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this session"
        )
    
    # Update session
    session.target_tempo = tempo_update.target_tempo
    session.practice_mode = tempo_update.practice_mode
    
    await db.commit()
    return {"message": "Session tempo settings updated"}


@router.get("/students/{student_id}/tempo-achievements", response_model=List[TempoAchievement])
async def get_student_tempo_achievements(
    student_id: UUID,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_user)]
) -> List[TempoAchievement]:
    """Get tempo achievements for a student"""
    # Students can only see their own, teachers can see their students'
    if current_user.role == "student" and student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view these achievements"
        )
    
    tempo_service = TempoService(db)
    return await tempo_service.get_student_achievements(student_id)


@router.get("/students/{student_id}/achievements/{achievement_type}/progress", response_model=AchievementProgress)
async def get_achievement_progress(
    student_id: UUID,
    achievement_type: str,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_user)]
) -> AchievementProgress:
    """Get progress towards a specific achievement"""
    # Students can only see their own, teachers can see their students'
    if current_user.role == "student" and student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this progress"
        )
    
    tempo_service = TempoService(db)
    return await tempo_service.get_achievement_progress(student_id, achievement_type)