"""Reputation system endpoints."""
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.models.user import User
from app.schemas.reputation import ReputationHistoryResponse, UserReputationResponse
from app.services.community.reputation_service import ReputationService

router = APIRouter()


@router.get("/users/{user_id}/reputation", response_model=UserReputationResponse)
async def get_user_reputation(
    user_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user_optional)
) -> UserReputationResponse:
    """
    Get reputation information for a user.
    
    Returns the user's current reputation points and level.
    """
    # Get user from database
    from sqlalchemy import select
    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserReputationResponse(
        user_id=user.id,
        full_name=user.full_name,
        reputation_points=user.reputation_points,
        reputation_level=user.reputation_level
    )


@router.get("/users/{user_id}/reputation/history", response_model=List[ReputationHistoryResponse])
async def get_reputation_history(
    user_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> List[ReputationHistoryResponse]:
    """
    Get reputation history for a user.
    
    Users can only view their own reputation history.
    """
    # Check if user is viewing their own history or is an admin
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="You can only view your own reputation history"
        )
    
    reputation_service = ReputationService(db)
    
    history = await reputation_service.get_user_reputation_history(
        user_id=user_id,
        skip=skip,
        limit=limit
    )
    
    return [
        ReputationHistoryResponse(
            id=h.id,
            reason=h.reason,
            points_change=h.points_change,
            total_points=h.total_points,
            description=h.description,
            created_at=h.created_at
        )
        for h in history
    ]


@router.get("/leaderboard", response_model=List[UserReputationResponse])
async def get_reputation_leaderboard(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user_optional)
) -> List[UserReputationResponse]:
    """
    Get the reputation leaderboard.
    
    Returns top users by reputation points.
    """
    from sqlalchemy import select, desc
    
    query = (
        select(User)
        .where(User.reputation_points > 0)
        .order_by(desc(User.reputation_points))
        .offset(skip)
        .limit(limit)
    )
    
    result = await db.execute(query)
    users = result.scalars().all()
    
    return [
        UserReputationResponse(
            user_id=u.id,
            full_name=u.full_name,
            reputation_points=u.reputation_points,
            reputation_level=u.reputation_level
        )
        for u in users
    ]