from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.models.user import User
from app.schemas.practice import Tag, TagCreate, TagUpdate
from app.services.practice.tag_service import TagService

router = APIRouter()


@router.get("/", response_model=List[Tag])
async def get_tags(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> List[Tag]:
    """
    Get all tags accessible to the current user.
    
    For teachers: returns their custom tags + global tags
    For students: returns only global tags
    """
    tag_service = TagService(db)
    
    # Teachers can see their own tags + global tags
    teacher_id = current_user.id if current_user.role == "teacher" else None
    
    tags = await tag_service.get_tags(
        teacher_id=teacher_id,
        skip=skip,
        limit=limit
    )
    
    return tags


@router.get("/popular", response_model=List[dict])
async def get_popular_tags(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> List[dict]:
    """
    Get most popular tags with usage count.
    
    For teachers: returns popular tags from their students
    For students: returns globally popular tags
    """
    tag_service = TagService(db)
    
    teacher_id = current_user.id if current_user.role == "teacher" else None
    
    popular_tags = await tag_service.get_popular_tags(
        teacher_id=teacher_id,
        limit=limit
    )
    
    return [
        {
            "tag": Tag.model_validate(tag),
            "usage_count": count
        }
        for tag, count in popular_tags
    ]


@router.get("/pieces", response_model=List[Tag])
async def get_piece_tags(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    tag_type: Optional[str] = Query("piece", description="Filter by tag type"),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> List[Tag]:
    """Get all piece-type tags (musical pieces)"""
    tag_service = TagService(db)
    
    teacher_id = current_user.id if current_user.role == "teacher" else None
    
    tags = await tag_service.get_tags(
        teacher_id=teacher_id,
        tag_type=tag_type,
        skip=skip,
        limit=limit
    )
    
    return tags


@router.get("/{tag_id}", response_model=Tag)
async def get_tag(
    tag_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Tag:
    """Get a specific tag by ID"""
    tag_service = TagService(db)
    
    teacher_id = current_user.id if current_user.role == "teacher" else None
    
    tag = await tag_service.get_tag(tag_id, teacher_id)
    
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    return tag


@router.post("/", response_model=Tag)
async def create_tag(
    tag_data: TagCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Tag:
    """
    Create a new tag.
    
    Teachers can create any tags.
    Students can only create tags with tag_type='piece'.
    """
    # Allow students to create pieces
    if current_user.role == "student" and tag_data.tag_type != "piece":
        raise HTTPException(
            status_code=403,
            detail="Students can only create musical pieces"
        )
    elif current_user.role not in ["teacher", "student"]:
        raise HTTPException(
            status_code=403,
            detail="Only teachers and students can create tags"
        )
    
    tag_service = TagService(db)
    
    try:
        # For students creating pieces, don't set teacher_id
        teacher_id = current_user.id if current_user.role == "teacher" else None
        
        tag = await tag_service.create_tag(
            tag_data=tag_data,
            teacher_id=teacher_id
        )
        return tag
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{tag_id}", response_model=Tag)
async def update_tag(
    tag_id: UUID,
    tag_data: TagUpdate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Tag:
    """
    Update a tag.
    
    Only the owner teacher can update their tags.
    """
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=403,
            detail="Only teachers can update tags"
        )
    
    tag_service = TagService(db)
    
    try:
        tag = await tag_service.update_tag(
            tag_id=tag_id,
            tag_data=tag_data,
            teacher_id=current_user.id
        )
        
        if not tag:
            raise HTTPException(status_code=404, detail="Tag not found")
        
        return tag
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.delete("/{tag_id}")
async def delete_tag(
    tag_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> dict:
    """
    Delete a tag.
    
    Only the owner teacher can delete their tags.
    Cannot delete tags that are in use.
    """
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=403,
            detail="Only teachers can delete tags"
        )
    
    tag_service = TagService(db)
    
    try:
        success = await tag_service.delete_tag(
            tag_id=tag_id,
            teacher_id=current_user.id
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Tag not found")
        
        return {"detail": "Tag deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{tag_id}/usage-count", response_model=dict)
async def get_tag_usage_count(
    tag_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> dict:
    """Get the number of sessions using this tag"""
    tag_service = TagService(db)
    
    teacher_id = current_user.id if current_user.role == "teacher" else None
    
    count = await tag_service.get_tag_usage_count(tag_id, teacher_id)
    
    return {"tag_id": tag_id, "usage_count": count}