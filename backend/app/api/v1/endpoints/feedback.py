"""Feedback endpoints for teacher session and video feedback."""
from typing import List, Optional, Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.api.deps import get_current_teacher
from app.models.user import User
from app.services.feedback.feedback_service import FeedbackService
from app.schemas.practice import (
    Feedback,
    FeedbackCreate,
    FeedbackBase
)


router = APIRouter()


@router.post("/", response_model=Feedback)
async def create_feedback(
    feedback_data: FeedbackCreate,
    current_teacher: Annotated[User, Depends(get_current_teacher)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Feedback:
    """Create new feedback for a session or video"""
    service = FeedbackService(db)
    
    try:
        feedback = await service.create_feedback(
            teacher_id=current_teacher.id,
            feedback_data=feedback_data
        )
        
        # Convert to response model
        return Feedback(
            id=feedback.id,
            teacher_id=feedback.teacher_id,
            session_id=feedback.session_id,
            video_id=feedback.video_id,
            text=feedback.text,
            rating=feedback.rating,
            timestamp_seconds=feedback.timestamp_seconds,
            created_at=feedback.created_at,
            updated_at=feedback.updated_at
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/sessions/{session_id}", response_model=List[Feedback])
async def get_session_feedback(
    session_id: UUID,
    current_teacher: Annotated[User, Depends(get_current_teacher)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> List[Feedback]:
    """Get all feedback for a specific session"""
    service = FeedbackService(db)
    
    feedback_list = await service.get_session_feedback(
        session_id=session_id
    )
    
    # Convert to response models
    return [
        Feedback(
            id=f.id,
            teacher_id=f.teacher_id,
            session_id=f.session_id,
            video_id=f.video_id,
            text=f.text,
            rating=f.rating,
            timestamp_seconds=f.timestamp_seconds,
            created_at=f.created_at,
            updated_at=f.updated_at
        )
        for f in feedback_list
    ]


@router.get("/videos/{video_id}", response_model=List[Feedback])
async def get_video_feedback(
    video_id: UUID,
    current_teacher: Annotated[User, Depends(get_current_teacher)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> List[Feedback]:
    """Get all feedback for a specific video, ordered by timestamp"""
    service = FeedbackService(db)
    
    feedback_list = await service.get_video_feedback(
        video_id=video_id
    )
    
    # Convert to response models
    return [
        Feedback(
            id=f.id,
            teacher_id=f.teacher_id,
            session_id=f.session_id,
            video_id=f.video_id,
            text=f.text,
            rating=f.rating,
            timestamp_seconds=f.timestamp_seconds,
            created_at=f.created_at,
            updated_at=f.updated_at
        )
        for f in feedback_list
    ]


@router.get("/{feedback_id}", response_model=Feedback)
async def get_feedback(
    feedback_id: UUID,
    current_teacher: Annotated[User, Depends(get_current_teacher)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Feedback:
    """Get a specific feedback item"""
    service = FeedbackService(db)
    
    feedback = await service.get_feedback_by_id(
        feedback_id=feedback_id
    )
    
    if not feedback:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback not found"
        )
    
    return Feedback(
        id=feedback.id,
        teacher_id=feedback.teacher_id,
        session_id=feedback.session_id,
        video_id=feedback.video_id,
        text=feedback.text,
        rating=feedback.rating,
        timestamp_seconds=feedback.timestamp_seconds,
        created_at=feedback.created_at,
        updated_at=feedback.updated_at
    )


@router.put("/{feedback_id}", response_model=Feedback)
async def update_feedback(
    feedback_id: UUID,
    feedback_update: FeedbackBase,
    current_teacher: Annotated[User, Depends(get_current_teacher)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Feedback:
    """Update feedback (only by the teacher who created it)"""
    service = FeedbackService(db)
    
    feedback = await service.update_feedback(
        feedback_id=feedback_id,
        teacher_id=current_teacher.id,
        text=feedback_update.text,
        rating=feedback_update.rating
    )
    
    if not feedback:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback not found or you don't have permission to update it"
        )
    
    return Feedback(
        id=feedback.id,
        teacher_id=feedback.teacher_id,
        session_id=feedback.session_id,
        video_id=feedback.video_id,
        text=feedback.text,
        rating=feedback.rating,
        timestamp_seconds=feedback.timestamp_seconds,
        created_at=feedback.created_at,
        updated_at=feedback.updated_at
    )


@router.delete("/{feedback_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_feedback(
    feedback_id: UUID,
    current_teacher: Annotated[User, Depends(get_current_teacher)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> None:
    """Delete feedback (only by the teacher who created it)"""
    service = FeedbackService(db)
    
    deleted = await service.delete_feedback(
        feedback_id=feedback_id,
        teacher_id=current_teacher.id
    )
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback not found or you don't have permission to delete it"
        )


@router.get("/students/{student_id}/all", response_model=List[Feedback])
async def get_student_all_feedback(
    student_id: UUID,
    current_teacher: Annotated[User, Depends(get_current_teacher)],
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100)
) -> List[Feedback]:
    """Get all feedback given by the current teacher to a specific student"""
    service = FeedbackService(db)
    
    feedback_list = await service.get_student_all_feedback(
        student_id=student_id,
        teacher_id=current_teacher.id,
        skip=skip,
        limit=limit
    )
    
    # Convert to response models
    return [
        Feedback(
            id=f.id,
            teacher_id=f.teacher_id,
            session_id=f.session_id,
            video_id=f.video_id,
            text=f.text,
            rating=f.rating,
            timestamp_seconds=f.timestamp_seconds,
            created_at=f.created_at,
            updated_at=f.updated_at
        )
        for f in feedback_list
    ]