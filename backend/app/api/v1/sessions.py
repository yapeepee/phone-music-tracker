from typing import List, Optional, Annotated
from datetime import datetime
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select

from app.db.session import get_db
from app.api.deps import get_current_active_user, get_current_student, get_current_teacher
from app.models.user import User
from app.services.practice.session_service import SessionService
from app.schemas.practice import (
    PracticeSession,
    PracticeSessionCreate,
    PracticeSessionUpdate,
    PracticeSessionWithDetails,
    PracticeStatistics,
)


router = APIRouter()


@router.post("/", response_model=PracticeSession)
async def create_session(
    session_data: PracticeSessionCreate,
    current_user: Annotated[User, Depends(get_current_student)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> PracticeSession:
    """Create a new practice session"""
    service = SessionService(db)
    session = await service.create_session(
        student_id=current_user.id,
        session_data=session_data
    )
    
    # Convert session to dict and transform tags to string list
    session_dict = {
        "id": session.id,
        "student_id": session.student_id,
        "focus": session.focus,
        "start_time": session.start_time,
        "end_time": session.end_time,
        "self_rating": session.self_rating,
        "note": session.note,
        "tags": [tag.name for tag in session.tags],
        "is_synced": session.is_synced,
        "created_at": session.created_at,
        "updated_at": session.updated_at,
        "duration_minutes": session.duration_minutes
    }
    
    return PracticeSession.model_validate(session_dict)


@router.get("/", response_model=List[PracticeSession])
async def get_sessions(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    search: Optional[str] = Query(None, description="Search in focus, notes, and tags"),
) -> List[PracticeSession]:
    """Get practice sessions for the current user"""
    service = SessionService(db)
    
    # If search query provided, use search functionality
    if search:
        if current_user.role == "student":
            sessions = await service.search_sessions(
                search_query=search,
                student_id=current_user.id,
                skip=skip,
                limit=limit,
            )
        else:
            # For teachers, search across all their students' sessions
            sessions = await service.search_sessions(
                search_query=search,
                student_id=None,  # No filter, will get all sessions then filter by teacher's students
                skip=skip,
                limit=limit,
            )
            # TODO: Filter by teacher's students in search method
    else:
        # Regular get sessions without search
        if current_user.role == "student":
            sessions = await service.get_sessions(
                student_id=current_user.id,
                skip=skip,
                limit=limit,
                start_date=start_date,
                end_date=end_date,
            )
        # Teachers see their students' sessions
        else:
            sessions = await service.get_teacher_student_sessions(
                teacher_id=current_user.id,
                skip=skip,
                limit=limit,
            )
    
    # Convert sessions to dict and transform tags to string list
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
        result.append(PracticeSession.model_validate(session_dict))
    
    return result


@router.get("/statistics", response_model=PracticeStatistics)
async def get_statistics(
    current_user: Annotated[User, Depends(get_current_student)],
    db: Annotated[AsyncSession, Depends(get_db)],
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> PracticeStatistics:
    """Get practice statistics for the current user"""
    service = SessionService(db)
    return await service.get_statistics(
        student_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
    )


@router.get("/{session_id}", response_model=PracticeSession)
async def get_session(
    session_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> PracticeSession:
    """Get a specific practice session"""
    service = SessionService(db)
    
    # Students can only see their own sessions
    student_id = current_user.id if current_user.role == "student" else None
    
    session = await service.get_session_by_id(session_id, student_id)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # For teachers, verify they have access to this student
    if current_user.role == "teacher":
        # Get the session with student relationship loaded
        from app.models.practice import PracticeSession as SessionModel
        
        query = select(SessionModel).where(
            SessionModel.id == session_id
        ).options(selectinload(SessionModel.student))
        
        result = await db.execute(query)
        session_with_student = result.scalar_one_or_none()
        
        if not session_with_student or session_with_student.student.primary_teacher_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this session"
            )
    
    # Convert to response model
    session_dict = {
        "id": session.id,
        "student_id": session.student_id,
        "focus": session.focus,
        "start_time": session.start_time,
        "end_time": session.end_time,
        "self_rating": session.self_rating,
        "note": session.note,
        "tags": [tag.name for tag in session.tags],
        "is_synced": session.is_synced,
        "created_at": session.created_at,
        "updated_at": session.updated_at,
        "duration_minutes": session.duration_minutes
    }
    
    return PracticeSession.model_validate(session_dict)


@router.put("/{session_id}", response_model=PracticeSession)
async def update_session(
    session_id: UUID,
    session_update: PracticeSessionUpdate,
    current_user: Annotated[User, Depends(get_current_student)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> PracticeSession:
    """Update a practice session"""
    service = SessionService(db)
    
    session = await service.update_session(
        session_id=session_id,
        student_id=current_user.id,
        session_update=session_update
    )
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Convert tags to string list for response
    session_dict = {
        "id": session.id,
        "student_id": session.student_id,
        "focus": session.focus,
        "start_time": session.start_time,
        "end_time": session.end_time,
        "self_rating": session.self_rating,
        "note": session.note,
        "tags": [tag.name for tag in session.tags] if session.tags else [],
        "duration_minutes": session.duration_minutes,
        "created_at": session.created_at,
        "updated_at": session.updated_at,
        "is_synced": session.is_synced,
    }
    
    return PracticeSession(**session_dict)


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: UUID,
    current_user: Annotated[User, Depends(get_current_student)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> None:
    """Delete a practice session"""
    service = SessionService(db)
    
    deleted = await service.delete_session(
        session_id=session_id,
        student_id=current_user.id
    )
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )


# Teacher-specific endpoints
@router.get("/students/{student_id}/sessions", response_model=List[PracticeSession])
async def get_student_sessions(
    student_id: UUID,
    current_user: Annotated[User, Depends(get_current_teacher)],
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
) -> List[PracticeSession]:
    """Get practice sessions for a specific student (teacher only)"""
    service = SessionService(db)
    
    sessions = await service.get_teacher_student_sessions(
        teacher_id=current_user.id,
        student_id=student_id,
        skip=skip,
        limit=limit,
    )
    
    if not sessions:
        # Verify the student exists and is assigned to this teacher
        from app.services.auth.user_service import UserService
        user_service = UserService(db)
        student = await user_service.get_student_profile(student_id)
        
        if not student or student.primary_teacher_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this student"
            )
    
    # Convert sessions to dict and transform tags to string list
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
        result.append(PracticeSession.model_validate(session_dict))
    
    return result

@router.get("/search", response_model=List[PracticeSession])
async def search_sessions(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    q: str = Query(..., description="Search query for techniques in focus, notes, and tags"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
) -> List[PracticeSession]:
    """Search practice sessions by technique keywords"""
    service = SessionService(db)
    
    # Students search their own sessions, teachers search all
    student_id = current_user.id if current_user.role == "student" else None
    
    sessions = await service.search_sessions(
        search_query=q,
        student_id=student_id,
        skip=skip,
        limit=limit,
    )
    
    # Convert sessions to dict and transform tags to string list
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
        result.append(PracticeSession.model_validate(session_dict))
    
    return result
