from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.models.user import User
from app.schemas.practice_segment import (
    PracticeSegment,
    PracticeSegmentCreate,
    PracticeSegmentUpdate,
    PracticeSegmentWithAnalytics,
    SegmentClick,
    SegmentClickCreate,
    PieceProgress
)
from app.schemas.practice import Tag
from app.services.practice.practice_segment_service import PracticeSegmentService

router = APIRouter()


@router.get("/pieces", response_model=List[dict])
async def get_student_pieces(
    include_completed: bool = Query(True),
    include_archived: bool = Query(False),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> List[dict]:
    """
    Get all musical pieces the student is working on.
    Returns piece tags with segment counts.
    """
    if current_user.role != "student":
        raise HTTPException(
            status_code=403,
            detail="Only students can access their pieces"
        )
    
    segment_service = PracticeSegmentService(db)
    pieces = await segment_service.get_student_pieces(
        student_id=current_user.id,
        include_completed=include_completed,
        include_archived=include_archived
    )
    
    # Get segment counts for each piece
    result = []
    for piece in pieces:
        segments = await segment_service.get_piece_segments(
            piece_tag_id=piece.id,
            student_id=current_user.id
        )
        
        # Convert SQLAlchemy Tag model to Pydantic schema
        result.append({
            "piece": Tag.model_validate(piece),
            "total_segments": len(segments),
            "completed_segments": sum(1 for s in segments if s.is_completed),
            "total_clicks": sum(s.total_click_count for s in segments)
        })
    
    return result


@router.get("/pieces/{piece_tag_id}/segments", response_model=List[PracticeSegment])
async def get_piece_segments(
    piece_tag_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> List[PracticeSegment]:
    """Get all practice segments for a specific piece"""
    if current_user.role != "student":
        raise HTTPException(
            status_code=403,
            detail="Only students can access practice segments"
        )
    
    segment_service = PracticeSegmentService(db)
    segments = await segment_service.get_piece_segments(
        piece_tag_id=piece_tag_id,
        student_id=current_user.id
    )
    
    return segments


@router.post("/segments", response_model=PracticeSegment)
async def create_segment(
    segment_data: PracticeSegmentCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> PracticeSegment:
    """Create a new practice segment for a piece"""
    if current_user.role != "student":
        raise HTTPException(
            status_code=403,
            detail="Only students can create practice segments"
        )
    
    segment_service = PracticeSegmentService(db)
    
    try:
        segment = await segment_service.create_segment(
            segment_data=segment_data,
            student_id=current_user.id
        )
        return segment
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/segments/{segment_id}", response_model=PracticeSegment)
async def update_segment(
    segment_id: UUID,
    segment_data: PracticeSegmentUpdate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> PracticeSegment:
    """Update a practice segment"""
    if current_user.role != "student":
        raise HTTPException(
            status_code=403,
            detail="Only students can update their segments"
        )
    
    segment_service = PracticeSegmentService(db)
    segment = await segment_service.update_segment(
        segment_id=segment_id,
        segment_data=segment_data,
        student_id=current_user.id
    )
    
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")
    
    return segment


@router.delete("/segments/{segment_id}")
async def delete_segment(
    segment_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> dict:
    """Delete a practice segment"""
    if current_user.role != "student":
        raise HTTPException(
            status_code=403,
            detail="Only students can delete their segments"
        )
    
    segment_service = PracticeSegmentService(db)
    success = await segment_service.delete_segment(
        segment_id=segment_id,
        student_id=current_user.id
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Segment not found")
    
    return {"detail": "Segment deleted successfully"}


@router.post("/segments/click", response_model=SegmentClick)
async def record_segment_click(
    click_data: SegmentClickCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> SegmentClick:
    """Record a click on a practice segment"""
    if current_user.role != "student":
        raise HTTPException(
            status_code=403,
            detail="Only students can record clicks"
        )
    
    segment_service = PracticeSegmentService(db)
    
    try:
        click = await segment_service.record_click(click_data)
        return click
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/pieces/{piece_tag_id}/progress", response_model=PieceProgress)
async def get_piece_progress(
    piece_tag_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> PieceProgress:
    """Get detailed progress for a musical piece"""
    if current_user.role != "student":
        raise HTTPException(
            status_code=403,
            detail="Only students can view their progress"
        )
    
    segment_service = PracticeSegmentService(db)
    
    try:
        progress = await segment_service.get_piece_progress(
            piece_tag_id=piece_tag_id,
            student_id=current_user.id
        )
        return progress
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/segments/{segment_id}/analytics", response_model=dict)
async def get_segment_analytics(
    segment_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> dict:
    """Get detailed analytics for a practice segment"""
    if current_user.role != "student":
        raise HTTPException(
            status_code=403,
            detail="Only students can view their analytics"
        )
    
    segment_service = PracticeSegmentService(db)
    analytics = await segment_service.get_segment_analytics(
        segment_id=segment_id,
        student_id=current_user.id
    )
    
    if not analytics:
        raise HTTPException(status_code=404, detail="Segment not found")
    
    return analytics


@router.post("/pieces/{piece_id}/archive")
async def archive_piece(
    piece_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> dict:
    """Archive a musical piece and get summary statistics"""
    if current_user.role != "student":
        raise HTTPException(
            status_code=403,
            detail="Only students can archive their pieces"
        )
    
    segment_service = PracticeSegmentService(db)
    summary = await segment_service.archive_piece(
        piece_id=piece_id,
        student_id=current_user.id
    )
    
    if not summary:
        raise HTTPException(status_code=404, detail="Piece not found")
    
    return summary


@router.post("/pieces/{piece_id}/unarchive")
async def unarchive_piece(
    piece_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> dict:
    """Unarchive a musical piece"""
    if current_user.role != "student":
        raise HTTPException(
            status_code=403,
            detail="Only students can unarchive their pieces"
        )
    
    segment_service = PracticeSegmentService(db)
    result = await segment_service.unarchive_piece(
        piece_id=piece_id,
        student_id=current_user.id
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Piece not found")
    
    return {"message": "Piece unarchived successfully"}


@router.get("/pieces/archived")
async def get_archived_pieces(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> List[dict]:
    """Get all archived pieces with summaries"""
    if current_user.role != "student":
        raise HTTPException(
            status_code=403,
            detail="Only students can view their archived pieces"
        )
    
    segment_service = PracticeSegmentService(db)
    archived_pieces = await segment_service.get_archived_pieces(
        student_id=current_user.id
    )
    
    return archived_pieces


@router.get("/pieces/{piece_id}/archived-details")
async def get_archived_piece_details(
    piece_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> dict:
    """Get full details of an archived piece including all segments"""
    if current_user.role != "student":
        raise HTTPException(
            status_code=403,
            detail="Only students can view their archived pieces"
        )
    
    segment_service = PracticeSegmentService(db)
    piece_details = await segment_service.get_archived_piece_details(
        piece_id=piece_id,
        student_id=current_user.id
    )
    
    if not piece_details:
        raise HTTPException(status_code=404, detail="Archived piece not found")
    
    return piece_details


@router.get("/analytics/overview")
async def get_practice_focus_analytics(
    days: int = Query(30, description="Number of days to analyze"),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> dict:
    """Get overall practice focus analytics for the student"""
    if current_user.role != "student":
        raise HTTPException(
            status_code=403,
            detail="Only students can view their analytics"
        )
    
    segment_service = PracticeSegmentService(db)
    analytics = await segment_service.get_overall_segment_analytics(
        student_id=current_user.id,
        days=days
    )
    
    return analytics