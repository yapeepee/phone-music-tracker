from typing import List, Annotated
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, update
from sqlalchemy.orm import selectinload

from app.api import deps
from app.models.user import User
from app.models.practice import Tag, user_current_pieces
from app.schemas.practice import (
    CurrentPieceAdd,
    CurrentPieceUpdate,
    CurrentPieceWithDetails,
    UserCurrentPieces,
    Tag as TagSchema
)

router = APIRouter()


@router.get("/", response_model=List[CurrentPieceWithDetails])
async def get_current_pieces(
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
) -> List[CurrentPieceWithDetails]:
    """
    Get all current pieces for the authenticated user.
    Returns pieces ordered by priority (ascending) and started_at (descending).
    """
    # Query the association table with piece details
    query = (
        select(
            user_current_pieces.c.piece_id,
            user_current_pieces.c.started_at,
            user_current_pieces.c.notes,
            user_current_pieces.c.priority,
            user_current_pieces.c.last_practiced_at,
            user_current_pieces.c.practice_session_count,
            user_current_pieces.c.created_at,
            user_current_pieces.c.updated_at,
            Tag
        )
        .join(Tag, Tag.id == user_current_pieces.c.piece_id)
        .where(
            and_(
                user_current_pieces.c.user_id == current_user.id,
                Tag.tag_type == "piece",
                Tag.is_archived == False
            )
        )
        .order_by(
            user_current_pieces.c.priority.asc(),
            user_current_pieces.c.started_at.desc()
        )
        .offset(skip)
        .limit(limit)
    )
    
    result = await db.execute(query)
    rows = result.all()
    
    # Convert to response format
    current_pieces = []
    for row in rows:
        piece_data = {
            "piece_id": row.piece_id,
            "started_at": row.started_at,
            "notes": row.notes,
            "priority": row.priority,
            "last_practiced_at": row.last_practiced_at,
            "practice_session_count": row.practice_session_count,
            "created_at": row.created_at,
            "updated_at": row.updated_at,
            "piece": TagSchema.model_validate(row.Tag)
        }
        current_pieces.append(CurrentPieceWithDetails(**piece_data))
    
    return current_pieces


@router.get("/piece-user-counts", response_model=dict)
async def get_piece_user_counts(
    db: Annotated[AsyncSession, Depends(deps.get_db)],
) -> dict:
    """
    Get count of users currently working on each piece.
    Returns a dictionary mapping piece_id to user count.
    """
    from sqlalchemy import func
    
    # Query to count users per piece
    query = (
        select(
            user_current_pieces.c.piece_id,
            func.count(user_current_pieces.c.user_id).label('user_count')
        )
        .group_by(user_current_pieces.c.piece_id)
    )
    
    result = await db.execute(query)
    counts = {str(row.piece_id): row.user_count for row in result}
    
    return counts




@router.post("/{piece_id}", response_model=CurrentPieceWithDetails)
async def add_current_piece(
    piece_id: UUID,
    piece_data: CurrentPieceAdd,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
) -> CurrentPieceWithDetails:
    """
    Add a piece to the user's current pieces list.
    """
    # Verify the piece exists and is a piece type
    piece_query = select(Tag).where(
        and_(
            Tag.id == piece_id,
            Tag.tag_type == "piece",
            Tag.is_archived == False
        )
    )
    result = await db.execute(piece_query)
    piece = result.scalar_one_or_none()
    
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")
    
    # Check if already in current pieces
    check_query = select(user_current_pieces).where(
        and_(
            user_current_pieces.c.user_id == current_user.id,
            user_current_pieces.c.piece_id == piece_id
        )
    )
    existing = await db.execute(check_query)
    if existing.first():
        raise HTTPException(status_code=400, detail="Piece already in current pieces")
    
    # Add to current pieces
    insert_stmt = user_current_pieces.insert().values(
        user_id=current_user.id,
        piece_id=piece_id,
        notes=piece_data.notes,
        priority=piece_data.priority,
        started_at=datetime.now(timezone.utc)
    )
    await db.execute(insert_stmt)
    await db.commit()
    
    # Fetch and return the created record
    return await get_current_piece(piece_id, db, current_user)


@router.get("/{piece_id}", response_model=CurrentPieceWithDetails)
async def get_current_piece(
    piece_id: UUID,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
) -> CurrentPieceWithDetails:
    """
    Get a specific current piece for the user.
    """
    query = (
        select(
            user_current_pieces.c.piece_id,
            user_current_pieces.c.started_at,
            user_current_pieces.c.notes,
            user_current_pieces.c.priority,
            user_current_pieces.c.last_practiced_at,
            user_current_pieces.c.practice_session_count,
            user_current_pieces.c.created_at,
            user_current_pieces.c.updated_at,
            Tag
        )
        .join(Tag, Tag.id == user_current_pieces.c.piece_id)
        .where(
            and_(
                user_current_pieces.c.user_id == current_user.id,
                user_current_pieces.c.piece_id == piece_id
            )
        )
    )
    
    result = await db.execute(query)
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=404, detail="Current piece not found")
    
    piece_data = {
        "piece_id": row.piece_id,
        "started_at": row.started_at,
        "notes": row.notes,
        "priority": row.priority,
        "last_practiced_at": row.last_practiced_at,
        "practice_session_count": row.practice_session_count,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
        "piece": TagSchema.model_validate(row.Tag)
    }
    
    return CurrentPieceWithDetails(**piece_data)


@router.put("/{piece_id}", response_model=CurrentPieceWithDetails)
async def update_current_piece(
    piece_id: UUID,
    updates: CurrentPieceUpdate,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
) -> CurrentPieceWithDetails:
    """
    Update notes or priority for a current piece.
    """
    # Check if the piece is in user's current pieces
    check_query = select(user_current_pieces).where(
        and_(
            user_current_pieces.c.user_id == current_user.id,
            user_current_pieces.c.piece_id == piece_id
        )
    )
    existing = await db.execute(check_query)
    if not existing.first():
        raise HTTPException(status_code=404, detail="Current piece not found")
    
    # Build update values
    update_values = {"updated_at": datetime.now(timezone.utc)}
    if updates.notes is not None:
        update_values["notes"] = updates.notes
    if updates.priority is not None:
        update_values["priority"] = updates.priority
    
    # Update the record
    update_stmt = (
        update(user_current_pieces)
        .where(
            and_(
                user_current_pieces.c.user_id == current_user.id,
                user_current_pieces.c.piece_id == piece_id
            )
        )
        .values(**update_values)
    )
    await db.execute(update_stmt)
    await db.commit()
    
    # Return updated record
    return await get_current_piece(piece_id, db, current_user)


@router.delete("/{piece_id}")
async def remove_current_piece(
    piece_id: UUID,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
) -> dict:
    """
    Remove a piece from the user's current pieces list.
    """
    # Check if the piece is in user's current pieces
    check_query = select(user_current_pieces).where(
        and_(
            user_current_pieces.c.user_id == current_user.id,
            user_current_pieces.c.piece_id == piece_id
        )
    )
    existing = await db.execute(check_query)
    if not existing.first():
        raise HTTPException(status_code=404, detail="Current piece not found")
    
    # Delete the record
    delete_stmt = user_current_pieces.delete().where(
        and_(
            user_current_pieces.c.user_id == current_user.id,
            user_current_pieces.c.piece_id == piece_id
        )
    )
    await db.execute(delete_stmt)
    await db.commit()
    
    return {"message": "Piece removed from current pieces"}



@router.get("/stats/summary", response_model=dict)
async def get_current_pieces_summary(
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
) -> dict:
    """
    Get summary statistics for user's current pieces.
    """
    # Count total current pieces
    count_query = (
        select(user_current_pieces)
        .where(user_current_pieces.c.user_id == current_user.id)
    )
    result = await db.execute(count_query)
    total_count = len(result.all())
    
    # Get pieces by priority
    priority_query = (
        select(
            user_current_pieces.c.priority,
            Tag.name
        )
        .join(Tag, Tag.id == user_current_pieces.c.piece_id)
        .where(
            and_(
                user_current_pieces.c.user_id == current_user.id,
                Tag.is_archived == False
            )
        )
        .order_by(user_current_pieces.c.priority.asc())
    )
    priority_result = await db.execute(priority_query)
    
    pieces_by_priority = {}
    for row in priority_result:
        priority = row.priority
        if priority not in pieces_by_priority:
            pieces_by_priority[priority] = []
        pieces_by_priority[priority].append(row.name)
    
    return {
        "total_current_pieces": total_count,
        "pieces_by_priority": pieces_by_priority,
        "last_updated": datetime.now(timezone.utc)
    }