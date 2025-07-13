from typing import List, Annotated, Optional
from uuid import UUID
from datetime import datetime, timezone as tz, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, text
from sqlalchemy.orm import selectinload, joinedload

from app.api import deps
from app.models.user import User as UserModel
from app.models.practice import Tag as TagModel, user_current_pieces
from app.models.practice_partner import (
    UserAvailability, UserPracticePreferences, 
    PracticePartnerMatch, PartnerPracticeSession,
    MatchStatus
)
from app.services.notification_service import NotificationService
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
    # Build base query using SQLAlchemy ORM
    from sqlalchemy import exists
    
    # Start with user_current_pieces join
    query = (
        select(
            UserModel.id.label("user_id"),
            UserModel.full_name,
            UserModel.timezone,
            TagModel.id.label("piece_id"),
            TagModel.name.label("piece_name"),
            TagModel.composer.label("piece_composer"),
            UserPracticePreferences.skill_level,
            UserPracticePreferences.languages,
            UserPracticePreferences.preferred_communication
        )
        .select_from(user_current_pieces)
        .join(UserModel, UserModel.id == user_current_pieces.c.user_id)
        .join(TagModel, TagModel.id == user_current_pieces.c.piece_id)
        .outerjoin(UserPracticePreferences, UserPracticePreferences.user_id == UserModel.id)
        .where(
            # User must be active and not the current user
            UserModel.is_active == True,
            UserModel.id != current_user.id,
            # Piece must not be archived
            TagModel.is_archived == False,
            # User must be available for partners (or no preference set)
            or_(
                UserPracticePreferences.is_available_for_partners == True,
                UserPracticePreferences.is_available_for_partners == None
            )
        )
    )
    
    # Apply filters
    if filters.piece_id:
        query = query.where(TagModel.id == filters.piece_id)
    
    if filters.skill_level:
        query = query.where(UserPracticePreferences.skill_level == filters.skill_level.value)
    
    if filters.language:
        # Using func.any() for array contains check
        query = query.where(
            func.array_position(UserPracticePreferences.languages, filters.language) != None
        )
    
    # Exclude existing matches
    existing_match_subquery = (
        exists()
        .where(
            or_(
                and_(
                    PracticePartnerMatch.requester_id == current_user.id,
                    PracticePartnerMatch.partner_id == UserModel.id
                ),
                and_(
                    PracticePartnerMatch.requester_id == UserModel.id,
                    PracticePartnerMatch.partner_id == current_user.id
                )
            ),
            PracticePartnerMatch.piece_id == TagModel.id,
            PracticePartnerMatch.status.in_([MatchStatus.PENDING.value, MatchStatus.ACCEPTED.value])
        )
    )
    query = query.where(~existing_match_subquery)
    
    # Apply ordering and pagination
    query = query.order_by(UserModel.full_name).offset(skip).limit(limit)
    
    # Execute query
    result = await db.execute(query)
    rows = result.all()
    
    # Convert to response model
    partners = []
    for row in rows:
        # Calculate timezone difference (simplified for now)
        # TODO: Implement proper timezone calculation
        timezone_diff_hours = 0
        
        # Skip if timezone difference filter is applied and exceeds limit
        if filters.max_timezone_diff_hours is not None and timezone_diff_hours > filters.max_timezone_diff_hours:
            continue
        
        partners.append(CompatiblePartner(
            user_id=row.user_id,
            full_name=row.full_name,
            timezone=row.timezone or "UTC",
            timezone_diff_hours=timezone_diff_hours,
            skill_level=row.skill_level,
            common_languages=row.languages or [],
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
        select(UserModel)
        .join(UserPracticePreferences)
        .where(
            and_(
                UserModel.id == request.partner_id,
                UserModel.is_active == True,
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
    
    # Get piece information for notification
    piece_query = select(TagModel).where(TagModel.id == request.piece_id)
    piece_result = await db.execute(piece_query)
    piece = piece_result.scalar_one()
    
    # Send notification to partner
    notification_service = NotificationService(db)
    await notification_service.create_partner_request_notification(
        partner_id=request.partner_id,
        requester_name=current_user.full_name,
        piece_name=piece.name,
        match_id=db_match.id,
        message=request.requester_message
    )
    
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
    
    # Send notifications based on status change
    if update.status:
        # Get piece and user information
        piece_query = select(TagModel).where(TagModel.id == match.piece_id)
        piece_result = await db.execute(piece_query)
        piece = piece_result.scalar_one()
        
        notification_service = NotificationService(db)
        
        if update.status == MatchStatus.ACCEPTED:
            # Get partner name (the person accepting)
            partner_query = select(UserModel).where(UserModel.id == match.partner_id)
            partner_result = await db.execute(partner_query)
            partner = partner_result.scalar_one()
            
            await notification_service.create_partner_accepted_notification(
                requester_id=match.requester_id,
                partner_name=partner.full_name,
                piece_name=piece.name,
                match_id=match.id,
                message=update.partner_message
            )
        elif update.status == MatchStatus.DECLINED:
            # Get partner name (the person declining)
            partner_query = select(UserModel).where(UserModel.id == match.partner_id)
            partner_result = await db.execute(partner_query)
            partner = partner_result.scalar_one()
            
            await notification_service.create_partner_declined_notification(
                requester_id=match.requester_id,
                partner_name=partner.full_name,
                piece_name=piece.name,
                match_id=match.id
            )
    
    return match


@router.get("/matches/{match_id}/compatible-times", response_model=List[dict])
async def get_compatible_practice_times(
    match_id: UUID,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
) -> List[dict]:
    """Find compatible practice times between matched partners with timezone conversion."""
    from datetime import datetime, date, time
    import pytz
    
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
    
    # Get both users with their timezone info
    partner_id = match.partner_id if match.requester_id == current_user.id else match.requester_id
    
    # Get user timezones
    users_query = select(UserModel.id, UserModel.timezone).where(
        UserModel.id.in_([current_user.id, partner_id])
    )
    users_result = await db.execute(users_query)
    user_timezones = {row[0]: row[1] for row in users_result}
    
    # Get availability for both users
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
    
    compatible_times = []
    
    if len(user_availability) == 2:
        # Get a reference date (next Monday) to work with actual datetimes
        today = date.today()
        days_until_monday = (7 - today.weekday()) % 7
        if days_until_monday == 0:
            days_until_monday = 7
        next_monday = today + timedelta(days=days_until_monday)
        
        user1_slots = user_availability[current_user.id]
        user2_slots = user_availability[partner_id]
        
        # Get timezones
        user1_tz = pytz.timezone(user_timezones.get(current_user.id, 'UTC'))
        user2_tz = pytz.timezone(user_timezones.get(partner_id, 'UTC'))
        
        for slot1 in user1_slots:
            for slot2 in user2_slots:
                # Convert availability to actual datetimes for the week
                slot1_date = next_monday + timedelta(days=slot1.day_of_week)
                slot2_date = next_monday + timedelta(days=slot2.day_of_week)
                
                # Create timezone-aware datetimes
                slot1_start = user1_tz.localize(datetime.combine(slot1_date, slot1.start_time))
                slot1_end = user1_tz.localize(datetime.combine(slot1_date, slot1.end_time))
                slot2_start = user2_tz.localize(datetime.combine(slot2_date, slot2.start_time))
                slot2_end = user2_tz.localize(datetime.combine(slot2_date, slot2.end_time))
                
                # Convert to UTC for comparison
                slot1_start_utc = slot1_start.astimezone(pytz.UTC)
                slot1_end_utc = slot1_end.astimezone(pytz.UTC)
                slot2_start_utc = slot2_start.astimezone(pytz.UTC)
                slot2_end_utc = slot2_end.astimezone(pytz.UTC)
                
                # Check for overlap in UTC
                overlap_start_utc = max(slot1_start_utc, slot2_start_utc)
                overlap_end_utc = min(slot1_end_utc, slot2_end_utc)
                
                if overlap_start_utc < overlap_end_utc:
                    # Convert back to both users' local times
                    overlap_start_user1 = overlap_start_utc.astimezone(user1_tz)
                    overlap_end_user1 = overlap_end_utc.astimezone(user1_tz)
                    overlap_start_user2 = overlap_start_utc.astimezone(user2_tz)
                    overlap_end_user2 = overlap_end_utc.astimezone(user2_tz)
                    
                    duration_minutes = int((overlap_end_utc - overlap_start_utc).total_seconds() / 60)
                    
                    compatible_times.append({
                        "day_of_week": overlap_start_user1.weekday(),
                        "start_time_utc": overlap_start_utc.isoformat(),
                        "end_time_utc": overlap_end_utc.isoformat(),
                        "current_user_time": {
                            "timezone": user_timezones.get(current_user.id),
                            "day": overlap_start_user1.strftime("%A"),
                            "start_time": overlap_start_user1.strftime("%I:%M %p"),
                            "end_time": overlap_end_user1.strftime("%I:%M %p"),
                        },
                        "partner_time": {
                            "timezone": user_timezones.get(partner_id),
                            "day": overlap_start_user2.strftime("%A"),
                            "start_time": overlap_start_user2.strftime("%I:%M %p"),
                            "end_time": overlap_end_user2.strftime("%I:%M %p"),
                        },
                        "duration_minutes": duration_minutes
                    })
    
    return compatible_times