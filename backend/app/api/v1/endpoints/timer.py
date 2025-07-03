from typing import Annotated, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.models.user import User
from app.schemas.timer import (
    SessionTimerCreate, SessionTimerUpdate, SessionTimer,
    TimerEventCreate, TimerEvent, TimerSummary
)
from app.services.timer_service import TimerService

router = APIRouter()


@router.post("/sessions/{session_id}/timer", response_model=SessionTimer)
async def create_session_timer(
    session_id: UUID,
    timer_data: SessionTimerCreate,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_user)]
) -> SessionTimer:
    """Create a timer for a practice session"""
    timer_service = TimerService(db)
    
    # Ensure session_id matches
    timer_data.session_id = session_id
    
    try:
        return await timer_service.create_session_timer(timer_data)
    except ValueError as e:
        if "already exists" in str(e):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=str(e)
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/sessions/{session_id}/timer", response_model=Optional[SessionTimer])
async def get_session_timer(
    session_id: UUID,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_user)]
) -> Optional[SessionTimer]:
    """Get timer for a specific session"""
    timer_service = TimerService(db)
    return await timer_service.get_session_timer(session_id)


@router.put("/sessions/{session_id}/timer", response_model=SessionTimer)
async def update_session_timer(
    session_id: UUID,
    update_data: SessionTimerUpdate,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_user)]
) -> SessionTimer:
    """Update timer for a session"""
    timer_service = TimerService(db)
    
    try:
        return await timer_service.update_session_timer(session_id, update_data)
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e)
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/sessions/{session_id}/timer/events", response_model=TimerEvent)
async def add_timer_event(
    session_id: UUID,
    event_data: TimerEventCreate,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_user)]
) -> TimerEvent:
    """Add a timer event (pause/resume)"""
    timer_service = TimerService(db)
    
    try:
        return await timer_service.add_timer_event(session_id, event_data)
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e)
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/sessions/{session_id}/timer/summary", response_model=Optional[TimerSummary])
async def get_timer_summary(
    session_id: UUID,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_user)]
) -> Optional[TimerSummary]:
    """Get a summary of timer data for a session"""
    timer_service = TimerService(db)
    return await timer_service.get_timer_summary(session_id)