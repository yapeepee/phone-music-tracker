"""Challenge and achievement endpoints."""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api import deps
from app.models.user import User
from app.schemas.challenge import (
    Challenge,
    ChallengeWithProgress,
    ChallengeListResponse,
    UserChallenge,
    UserChallengeCreate,
    Achievement,
    AchievementListResponse,
    UserAchievement,
    UserAchievementListResponse
)
from app.services.practice.challenge_service import ChallengeService

router = APIRouter()


@router.get("/", response_model=ChallengeListResponse)
async def get_challenges(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    only_active: bool = Query(True),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> ChallengeListResponse:
    """
    Get available challenges for the current user.
    
    Includes progress information for each challenge.
    """
    challenge_service = ChallengeService(db)
    
    challenges = await challenge_service.get_challenges(
        user=current_user,
        only_active=only_active,
        include_progress=True
    )
    
    # Convert to response format with progress
    challenges_with_progress = []
    for challenge in challenges:
        challenge_dict = {
            "id": challenge.id,
            "name": challenge.name,
            "description": challenge.description,
            "type": challenge.type,
            "target_value": challenge.target_value,
            "target_metric": challenge.target_metric,
            "target_focus": challenge.target_focus,
            "reputation_reward": challenge.reputation_reward,
            "achievement_id": challenge.achievement_id,
            "icon": challenge.icon,
            "color": challenge.color,
            "order_index": challenge.order_index,
            "is_active": challenge.is_active,
            "start_date": challenge.start_date,
            "end_date": challenge.end_date,
            "is_repeatable": challenge.is_repeatable,
            "cooldown_days": challenge.cooldown_days,
            "created_at": challenge.created_at,
            "updated_at": challenge.updated_at,
            "achievement": challenge.achievement,
            "user_status": getattr(challenge, 'user_status', None),
            "user_progress": getattr(challenge, 'user_progress', 0),
            "user_progress_percentage": getattr(challenge, 'user_progress_percentage', 0.0),
            "can_start": getattr(challenge, 'can_start', True),
            "cooldown_remaining_days": getattr(challenge, 'cooldown_remaining_days', None)
        }
        challenges_with_progress.append(ChallengeWithProgress(**challenge_dict))
    
    # Apply pagination
    total = len(challenges_with_progress)
    challenges_page = challenges_with_progress[skip:skip + limit]
    
    return ChallengeListResponse(
        items=challenges_page,
        total=total,
        page=(skip // limit) + 1,
        page_size=limit
    )


@router.get("/{challenge_id}", response_model=ChallengeWithProgress)
async def get_challenge(
    challenge_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> ChallengeWithProgress:
    """
    Get details for a specific challenge.
    
    Includes user's progress if they have started the challenge.
    """
    challenge_service = ChallengeService(db)
    
    challenge = await challenge_service.get_challenge(challenge_id)
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    # Get user progress
    challenges = await challenge_service.get_challenges(
        user=current_user,
        only_active=False,
        include_progress=True
    )
    
    # Find this challenge in the list
    for c in challenges:
        if c.id == challenge_id:
            return ChallengeWithProgress(
                id=c.id,
                name=c.name,
                description=c.description,
                type=c.type,
                target_value=c.target_value,
                target_metric=c.target_metric,
                target_focus=c.target_focus,
                reputation_reward=c.reputation_reward,
                achievement_id=c.achievement_id,
                icon=c.icon,
                color=c.color,
                order_index=c.order_index,
                is_active=c.is_active,
                start_date=c.start_date,
                end_date=c.end_date,
                is_repeatable=c.is_repeatable,
                cooldown_days=c.cooldown_days,
                created_at=c.created_at,
                updated_at=c.updated_at,
                achievement=c.achievement,
                user_status=getattr(c, 'user_status', None),
                user_progress=getattr(c, 'user_progress', 0),
                user_progress_percentage=getattr(c, 'user_progress_percentage', 0.0),
                can_start=getattr(c, 'can_start', True),
                cooldown_remaining_days=getattr(c, 'cooldown_remaining_days', None)
            )
    
    # No progress found
    return ChallengeWithProgress(
        id=challenge.id,
        name=challenge.name,
        description=challenge.description,
        type=challenge.type,
        target_value=challenge.target_value,
        target_metric=challenge.target_metric,
        target_focus=challenge.target_focus,
        reputation_reward=challenge.reputation_reward,
        achievement_id=challenge.achievement_id,
        icon=challenge.icon,
        color=challenge.color,
        order_index=challenge.order_index,
        is_active=challenge.is_active,
        start_date=challenge.start_date,
        end_date=challenge.end_date,
        is_repeatable=challenge.is_repeatable,
        cooldown_days=challenge.cooldown_days,
        created_at=challenge.created_at,
        updated_at=challenge.updated_at,
        achievement=challenge.achievement
    )


@router.post("/start", response_model=UserChallenge)
async def start_challenge(
    challenge_data: UserChallengeCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> UserChallenge:
    """
    Start a challenge for the current user.
    
    Returns error if:
    - Challenge not found or not active
    - User already has this challenge in progress
    - Challenge is on cooldown
    """
    challenge_service = ChallengeService(db)
    
    try:
        user_challenge = await challenge_service.start_challenge(
            user=current_user,
            challenge_id=challenge_data.challenge_id
        )
        
        # Load relationships for response
        await db.refresh(user_challenge, ['challenge', 'challenge.achievement'])
        
        # Calculate progress percentage
        user_challenge.progress_percentage = min(
            (user_challenge.current_value / user_challenge.challenge.target_value) * 100,
            100
        )
        
        return user_challenge
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/user/active", response_model=List[UserChallenge])
async def get_active_challenges(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> List[UserChallenge]:
    """
    Get user's active challenges (in progress).
    """
    from sqlalchemy import select, and_
    from app.models.challenge import UserChallenge, ChallengeStatus, Challenge
    
    query = select(UserChallenge).options(
        selectinload(UserChallenge.challenge).selectinload(Challenge.achievement)
    ).where(
        and_(
            UserChallenge.user_id == current_user.id,
            UserChallenge.status == ChallengeStatus.IN_PROGRESS
        )
    )
    
    result = await db.execute(query)
    challenges = result.scalars().all()
    
    # Add progress percentage
    for uc in challenges:
        uc.progress_percentage = min(
            (uc.current_value / uc.challenge.target_value) * 100,
            100
        )
    
    return challenges


@router.get("/user/completed", response_model=List[UserChallenge])
async def get_completed_challenges(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> List[UserChallenge]:
    """
    Get user's completed challenges.
    """
    from sqlalchemy import select, and_, desc
    from app.models.challenge import UserChallenge, ChallengeStatus, Challenge
    
    query = select(UserChallenge).options(
        selectinload(UserChallenge.challenge).selectinload(Challenge.achievement)
    ).where(
        and_(
            UserChallenge.user_id == current_user.id,
            UserChallenge.status == ChallengeStatus.COMPLETED
        )
    ).order_by(desc(UserChallenge.completed_at)).offset(skip).limit(limit)
    
    result = await db.execute(query)
    challenges = result.scalars().all()
    
    # Add progress percentage (always 100 for completed)
    for uc in challenges:
        uc.progress_percentage = 100.0
    
    return challenges


# Achievement endpoints
@router.get("/achievements/all", response_model=AchievementListResponse)
async def get_all_achievements(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user_optional)
) -> AchievementListResponse:
    """
    Get all available achievements.
    
    Can be viewed without authentication.
    """
    challenge_service = ChallengeService(db)
    
    achievements = await challenge_service.get_all_achievements()
    
    return AchievementListResponse(
        items=achievements,
        total=len(achievements)
    )


@router.get("/achievements/earned", response_model=UserAchievementListResponse)
async def get_user_achievements(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> UserAchievementListResponse:
    """
    Get achievements earned by the current user.
    """
    challenge_service = ChallengeService(db)
    
    user_achievements = await challenge_service.get_user_achievements(current_user.id)
    
    # Calculate total reputation points earned from challenges
    total_points = 0
    for ua in user_achievements:
        # Get challenges that award this achievement
        from sqlalchemy import select
        from app.models.challenge import Challenge
        
        challenges_query = select(Challenge).where(
            Challenge.achievement_id == ua.achievement_id
        )
        challenges_result = await db.execute(challenges_query)
        challenges = challenges_result.scalars().all()
        
        for challenge in challenges:
            total_points += challenge.reputation_reward
    
    return UserAchievementListResponse(
        items=user_achievements,
        total=len(user_achievements),
        total_points_earned=total_points
    )


@router.get("/achievements/{user_id}", response_model=UserAchievementListResponse)
async def get_user_achievements_by_id(
    user_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user_optional)
) -> UserAchievementListResponse:
    """
    Get achievements earned by a specific user.
    
    Can be viewed without authentication.
    """
    challenge_service = ChallengeService(db)
    
    user_achievements = await challenge_service.get_user_achievements(user_id)
    
    # Calculate total reputation points earned from challenges
    total_points = 0
    for ua in user_achievements:
        # Get challenges that award this achievement
        from sqlalchemy import select
        from app.models.challenge import Challenge
        
        challenges_query = select(Challenge).where(
            Challenge.achievement_id == ua.achievement_id
        )
        challenges_result = await db.execute(challenges_query)
        challenges = challenges_result.scalars().all()
        
        for challenge in challenges:
            total_points += challenge.reputation_reward
    
    return UserAchievementListResponse(
        items=user_achievements,
        total=len(user_achievements),
        total_points_earned=total_points
    )