from typing import List, Annotated, Optional
from uuid import UUID
from datetime import datetime, timezone as tz
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, text
from sqlalchemy.orm import selectinload, joinedload

from app.api import deps
from app.models.user import User
from app.models.practice import Tag, user_current_pieces
from app.models.practice_partner import (
    UserAvailability, UserPracticePreferences, 
    PracticePartnerMatch, PartnerPracticeSession,
    MatchStatus
)
from app.schemas.practice_partner import (
    UserAvailability as UserAvailabilitySchema,
    UserAvailabilityCreate,
    UserAvailabilityUpdate,
    UserPracticePreferences as UserPracticePreferencesSchema,
    UserPracticePreferencesCreate,
    UserPracticePreferencesUpdate,
    PracticePartnerMatch as PracticePartnerMatchSchema,
    PracticePartnerMatchCreate,
    PracticePartnerMatchUpdate,
    PracticePartnerMatchWithUsers,
    CompatiblePartner,
    PartnerSearchFilters
)
from app.schemas.user import User
from app.schemas.practice import Tag as TagSchema

router = APIRouter()


# User Availability Endpoints
@router.get("/availability", response_model=List[UserAvailabilitySchema])
async def get_user_availability(
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
) -> List[UserAvailabilitySchema]:
    """Get current user's availability schedule."""
    query = (
        select(UserAvailability)
        .where(UserAvailability.user_id == current_user.id)
        .order_by(UserAvailability.day_of_week, UserAvailability.start_time)
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/availability", response_model=UserAvailabilitySchema)
async def add_availability_slot(
    availability: UserAvailabilityCreate,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
) -> UserAvailabilitySchema:
    """Add a new availability slot for the current user."""
    # Check for overlapping slots
    overlap_query = select(UserAvailability).where(
        and_(
            UserAvailability.user_id == current_user.id,
            UserAvailability.day_of_week == availability.day_of_week,
            UserAvailability.is_active == True,
            or_(
                and_(
                    UserAvailability.start_time <= availability.start_time,
                    UserAvailability.end_time > availability.start_time
                ),
                and_(
                    UserAvailability.start_time < availability.end_time,
                    UserAvailability.end_time >= availability.end_time
                )
            )
        )
    )
    existing = await db.execute(overlap_query)
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This time slot overlaps with an existing availability"
        )
    
    db_availability = UserAvailability(
        user_id=current_user.id,
        **availability.model_dump()
    )
    db.add(db_availability)
    await db.commit()
    await db.refresh(db_availability)
    return db_availability


@router.delete("/availability/{availability_id}")
async def delete_availability_slot(
    availability_id: UUID,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
) -> dict:
    """Delete an availability slot."""
    query = select(UserAvailability).where(
        and_(
            UserAvailability.id == availability_id,
            UserAvailability.user_id == current_user.id
        )
    )
    result = await db.execute(query)
    availability = result.scalar_one_or_none()
    
    if not availability:
        raise HTTPException(status_code=404, detail="Availability slot not found")
    
    await db.delete(availability)
    await db.commit()
    return {"message": "Availability slot deleted"}


# Practice Preferences Endpoints
@router.get("/preferences", response_model=UserPracticePreferencesSchema)
async def get_practice_preferences(
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
) -> UserPracticePreferencesSchema:
    """Get current user's practice partner preferences."""
    query = select(UserPracticePreferences).where(
        UserPracticePreferences.user_id == current_user.id
    )
    result = await db.execute(query)
    preferences = result.scalar_one_or_none()
    
    if not preferences:
        # Create default preferences
        preferences = UserPracticePreferences(user_id=current_user.id)
        db.add(preferences)
        await db.commit()
        await db.refresh(preferences)
    
    return preferences


@router.put("/preferences", response_model=UserPracticePreferencesSchema)
async def update_practice_preferences(
    preferences: UserPracticePreferencesUpdate,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
) -> UserPracticePreferencesSchema:
    """Update practice partner preferences."""
    # Get existing preferences
    query = select(UserPracticePreferences).where(
        UserPracticePreferences.user_id == current_user.id
    )
    result = await db.execute(query)
    db_preferences = result.scalar_one_or_none()
    
    if not db_preferences:
        # Create new preferences
        db_preferences = UserPracticePreferences(
            user_id=current_user.id,
            **preferences.model_dump(exclude_unset=True)
        )
        db.add(db_preferences)
    else:
        # Update existing preferences
        for field, value in preferences.model_dump(exclude_unset=True).items():
            setattr(db_preferences, field, value)
    
    await db.commit()
    await db.refresh(db_preferences)
    return db_preferences


# Partner Discovery Endpoints
@router.post("/discover", response_model=List[CompatiblePartner])
async def discover_practice_partners(
    filters: PartnerSearchFilters,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
) -> List[CompatiblePartner]:
    """Discover compatible practice partners based on filters."""
    # Base query to find users working on the same pieces
    query = text("""
        WITH user_pieces AS (
            SELECT 
                ucp.user_id,
                ucp.piece_id,
                u.full_name,
                u.timezone as user_timezone,
                upp.skill_level,
                upp.languages,
                upp.preferred_communication,
                t.name as piece_name,
                t.composer
            FROM user_current_pieces ucp
            JOIN users u ON u.id = ucp.user_id
            LEFT JOIN user_practice_preferences upp ON upp.user_id = u.id
            JOIN tags t ON t.id = ucp.piece_id
            WHERE (upp.is_available_for_partners = true OR upp.is_available_for_partners IS NULL)
              AND u.is_active = true
              AND u.id != :current_user_id
              AND t.is_archived = false
        ),
        compatible_partners AS (
            SELECT 
                up.user_id,
                up.full_name,
                up.user_timezone,
                up.piece_id,
                up.piece_name,
                up.composer,
                up.skill_level,
                up.languages,
                up.preferred_communication,
                -- For now, set timezone difference to 0 (we'll implement proper timezone calculation later)
                0 as timezone_diff_hours
            FROM user_pieces up
            WHERE (CAST(:piece_id AS UUID) IS NULL OR up.piece_id = CAST(:piece_id AS UUID))
              AND (CAST(:skill_level AS TEXT) IS NULL OR up.skill_level = CAST(:skill_level AS TEXT))
              AND (CAST(:language AS TEXT) IS NULL OR CAST(:language AS TEXT) = ANY(up.languages))
              -- Exclude existing matches
              AND NOT EXISTS (
                  SELECT 1 FROM practice_partner_matches ppm
                  WHERE ((ppm.requester_id = :current_user_id AND ppm.partner_id = up.user_id)
                     OR (ppm.requester_id = up.user_id AND ppm.partner_id = :current_user_id))
                    AND ppm.piece_id = up.piece_id
                    AND ppm.status IN ('pending', 'accepted')
              )
        )
        SELECT 
            user_id,
            full_name,
            user_timezone as timezone,
            timezone_diff_hours,
            skill_level,
            COALESCE(languages, ARRAY[]::text[]) as common_languages,
            piece_id,
            piece_name,
            composer as piece_composer
        FROM compatible_partners
        WHERE (CAST(:max_timezone_diff AS INTEGER) IS NULL OR timezone_diff_hours <= CAST(:max_timezone_diff AS INTEGER))
        ORDER BY timezone_diff_hours, full_name
        OFFSET :skip
        LIMIT :limit
    """)
    
    result = await db.execute(
        query,
        {
            "current_user_id": current_user.id,
            "piece_id": filters.piece_id,
            "skill_level": filters.skill_level.value if filters.skill_level else None,
            "language": filters.language,
            "max_timezone_diff": filters.max_timezone_diff_hours,
            "skip": skip,
            "limit": limit
        }
    )
    
    partners = []
    for row in result:
        partners.append(CompatiblePartner(
            user_id=row.user_id,
            full_name=row.full_name,
            timezone=row.timezone,
            timezone_diff_hours=int(row.timezone_diff_hours),
            skill_level=row.skill_level,
            common_languages=row.common_languages or [],
            piece_id=row.piece_id,
            piece_name=row.piece_name,
            piece_composer=row.piece_composer
        ))
    
    return partners


# Practice Partner Matching Endpoints
@router.get("/matches", response_model=List[PracticePartnerMatchWithUsers])
async def get_practice_partner_matches(
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
    status: Optional[MatchStatus] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
) -> List[PracticePartnerMatchWithUsers]:
    """Get all practice partner matches for the current user."""
    query = (
        select(PracticePartnerMatch)
        .options(
            joinedload(PracticePartnerMatch.requester),
            joinedload(PracticePartnerMatch.partner),
            joinedload(PracticePartnerMatch.piece)
        )
        .where(
            or_(
                PracticePartnerMatch.requester_id == current_user.id,
                PracticePartnerMatch.partner_id == current_user.id
            )
        )
    )
    
    if status:
        query = query.where(PracticePartnerMatch.status == status.value)
    
    query = query.order_by(PracticePartnerMatch.created_at.desc())
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    matches = result.unique().scalars().all()
    
    # Convert to response model with user details
    response = []
    for match in matches:
        match_dict = {
            "id": match.id,
            "requester_id": match.requester_id,
            "partner_id": match.partner_id,
            "piece_id": match.piece_id,
            "status": match.status,
            "match_reason": match.match_reason,
            "requester_message": match.requester_message,
            "partner_message": match.partner_message,
            "matched_at": match.matched_at,
            "ended_at": match.ended_at,
            "ended_reason": match.ended_reason,
            "created_at": match.created_at,
            "updated_at": match.updated_at,
            "requester": User.model_validate(match.requester),
            "partner": User.model_validate(match.partner),
            "piece": TagSchema.model_validate(match.piece)
        }
        response.append(PracticePartnerMatchWithUsers(**match_dict))
    
    return response


@router.post("/matches", response_model=PracticePartnerMatchSchema)
async def create_practice_partner_request(
    request: PracticePartnerMatchCreate,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
) -> PracticePartnerMatchSchema:
    """Send a practice partner request."""
    # Validate partner exists and is available
    partner_query = (
        select(User)
        .join(UserPracticePreferences)
        .where(
            and_(
                User.id == request.partner_id,
                User.is_active == True,
                UserPracticePreferences.is_available_for_partners == True
            )
        )
    )
    result = await db.execute(partner_query)
    partner = result.scalar_one_or_none()
    
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found or not available")
    
    # Check if both users are working on the piece
    piece_check = select(user_current_pieces).where(
        and_(
            user_current_pieces.c.piece_id == request.piece_id,
            user_current_pieces.c.user_id.in_([current_user.id, request.partner_id])
        )
    )
    result = await db.execute(piece_check)
    user_pieces = result.all()
    
    if len(user_pieces) != 2:
        raise HTTPException(
            status_code=400, 
            detail="Both users must be currently working on this piece"
        )
    
    # Check for existing match
    existing_query = select(PracticePartnerMatch).where(
        and_(
            or_(
                and_(
                    PracticePartnerMatch.requester_id == current_user.id,
                    PracticePartnerMatch.partner_id == request.partner_id
                ),
                and_(
                    PracticePartnerMatch.requester_id == request.partner_id,
                    PracticePartnerMatch.partner_id == current_user.id
                )
            ),
            PracticePartnerMatch.piece_id == request.piece_id,
            PracticePartnerMatch.status.in_([MatchStatus.PENDING.value, MatchStatus.ACCEPTED.value])
        )
    )
    existing = await db.execute(existing_query)
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="A match already exists for this piece with this partner"
        )
    
    # Create the match request
    db_match = PracticePartnerMatch(
        requester_id=current_user.id,
        partner_id=request.partner_id,
        piece_id=request.piece_id,
        requester_message=request.requester_message,
        match_reason="same_piece"
    )
    db.add(db_match)
    await db.commit()
    await db.refresh(db_match)
    
    # TODO: Send notification to partner
    
    return db_match


@router.put("/matches/{match_id}", response_model=PracticePartnerMatchSchema)
async def update_practice_partner_match(
    match_id: UUID,
    update: PracticePartnerMatchUpdate,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
) -> PracticePartnerMatchSchema:
    """Update a practice partner match (accept/decline/end)."""
    query = select(PracticePartnerMatch).where(
        and_(
            PracticePartnerMatch.id == match_id,
            or_(
                PracticePartnerMatch.requester_id == current_user.id,
                PracticePartnerMatch.partner_id == current_user.id
            )
        )
    )
    result = await db.execute(query)
    match = result.scalar_one_or_none()
    
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Validate status transitions
    if update.status:
        if match.status == MatchStatus.ENDED.value:
            raise HTTPException(status_code=400, detail="Cannot update an ended match")
        
        if update.status == MatchStatus.ACCEPTED and current_user.id != match.partner_id:
            raise HTTPException(status_code=403, detail="Only the partner can accept a request")
        
        if update.status == MatchStatus.DECLINED and current_user.id != match.partner_id:
            raise HTTPException(status_code=403, detail="Only the partner can decline a request")
        
        match.status = update.status.value
        
        if update.status == MatchStatus.ACCEPTED:
            match.matched_at = datetime.now(tz.utc)
        elif update.status == MatchStatus.ENDED:
            match.ended_at = datetime.now(tz.utc)
            match.ended_reason = "user_request"
    
    if update.partner_message and current_user.id == match.partner_id:
        match.partner_message = update.partner_message
    
    await db.commit()
    await db.refresh(match)
    
    # TODO: Send notification to other user
    
    return match


@router.get("/matches/{match_id}/compatible-times", response_model=List[dict])
async def get_compatible_practice_times(
    match_id: UUID,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
) -> List[dict]:
    """Find compatible practice times between matched partners."""
    # Get the match
    query = select(PracticePartnerMatch).where(
        and_(
            PracticePartnerMatch.id == match_id,
            PracticePartnerMatch.status == MatchStatus.ACCEPTED.value,
            or_(
                PracticePartnerMatch.requester_id == current_user.id,
                PracticePartnerMatch.partner_id == current_user.id
            )
        )
    )
    result = await db.execute(query)
    match = result.scalar_one_or_none()
    
    if not match:
        raise HTTPException(status_code=404, detail="Match not found or not accepted")
    
    # Get availability for both users
    partner_id = match.partner_id if match.requester_id == current_user.id else match.requester_id
    
    availability_query = select(UserAvailability).where(
        and_(
            UserAvailability.user_id.in_([current_user.id, partner_id]),
            UserAvailability.is_active == True
        )
    ).order_by(UserAvailability.user_id, UserAvailability.day_of_week, UserAvailability.start_time)
    
    result = await db.execute(availability_query)
    availabilities = result.scalars().all()
    
    # Group by user
    user_availability = {}
    for slot in availabilities:
        if slot.user_id not in user_availability:
            user_availability[slot.user_id] = []
        user_availability[slot.user_id].append(slot)
    
    # Find overlapping times (simplified - assumes same timezone for now)
    # TODO: Implement proper timezone conversion
    compatible_times = []
    
    if len(user_availability) == 2:
        user1_slots = user_availability[current_user.id]
        user2_slots = user_availability[partner_id]
        
        for slot1 in user1_slots:
            for slot2 in user2_slots:
                if slot1.day_of_week == slot2.day_of_week:
                    # Check for time overlap
                    overlap_start = max(slot1.start_time, slot2.start_time)
                    overlap_end = min(slot1.end_time, slot2.end_time)
                    
                    if overlap_start < overlap_end:
                        compatible_times.append({
                            "day_of_week": slot1.day_of_week,
                            "start_time": overlap_start.isoformat(),
                            "end_time": overlap_end.isoformat(),
                            "duration_minutes": (
                                (overlap_end.hour * 60 + overlap_end.minute) -
                                (overlap_start.hour * 60 + overlap_start.minute)
                            )
                        })
    
    return compatible_times