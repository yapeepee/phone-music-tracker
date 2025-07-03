from typing import List, Optional, Annotated
from datetime import datetime, date, timedelta
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.models.user import User
from app.models.schedule import EventType, EventStatus
from app.schemas.schedule import (
    ScheduleEvent,
    ScheduleEventCreate,
    ScheduleEventUpdate,
    ScheduleEventWithParticipants,
    ScheduleEventWithConflicts,
    CalendarRequest,
    CalendarDayEvents,
    ScheduleConflict,
    ConflictResolution,
)
from app.services.scheduling.schedule_service import ScheduleService
from app.services.scheduling.ical_service import ICalService

router = APIRouter()


@router.post("/", response_model=ScheduleEventWithParticipants)
async def create_event(
    event_data: ScheduleEventCreate,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_teacher)]
) -> ScheduleEventWithParticipants:
    """
    Create a new scheduled event.
    
    Only teachers can create events.
    """
    service = ScheduleService(db)
    event = await service.create_event(
        teacher_id=current_user.id,
        event_data=event_data
    )
    return ScheduleEventWithParticipants.model_validate(event)


@router.get("/", response_model=List[ScheduleEvent])
async def get_events(
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
    start_date: Optional[date] = Query(None, description="Filter events starting after this date"),
    end_date: Optional[date] = Query(None, description="Filter events ending before this date"),
    event_type: Optional[EventType] = Query(None, description="Filter by event type"),
    status: Optional[EventStatus] = Query(None, description="Filter by event status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100)
) -> List[ScheduleEvent]:
    """
    Get scheduled events.
    
    - Teachers see their own events
    - Students see events they're participating in
    """
    service = ScheduleService(db)
    
    # Convert date to datetime if provided
    start_datetime = None
    end_datetime = None
    if start_date:
        start_datetime = datetime.combine(start_date, datetime.min.time())
    if end_date:
        end_datetime = datetime.combine(end_date, datetime.max.time())
    
    if current_user.role == "teacher":
        events = await service.get_events(
            teacher_id=current_user.id,
            start_date=start_datetime,
            end_date=end_datetime,
            event_type=event_type,
            status=status,
            skip=skip,
            limit=limit
        )
    else:
        # Students see events they're participating in
        events = await service.get_events(
            student_id=current_user.id,
            start_date=start_datetime,
            end_date=end_datetime,
            event_type=event_type,
            status=status,
            skip=skip,
            limit=limit
        )
    
    return [ScheduleEvent.model_validate(event) for event in events]


@router.get("/calendar", response_model=List[CalendarDayEvents])
async def get_calendar_view(
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
    start_date: date = Query(..., description="Start date for calendar view"),
    end_date: date = Query(..., description="End date for calendar view"),
    include_cancelled: bool = Query(False, description="Include cancelled events")
) -> List[CalendarDayEvents]:
    """
    Get calendar view of events grouped by day.
    
    Useful for rendering calendar UI components.
    """
    service = ScheduleService(db)
    
    # Create CalendarRequest object from query parameters
    request = CalendarRequest(
        start_date=start_date,
        end_date=end_date,
        include_cancelled=include_cancelled
    )
    
    if current_user.role == "teacher":
        calendar_days = await service.get_calendar_view(
            request=request,
            teacher_id=current_user.id
        )
    else:
        calendar_days = await service.get_calendar_view(
            request=request,
            student_id=current_user.id
        )
    
    return calendar_days


@router.get("/{event_id}", response_model=ScheduleEventWithConflicts)
async def get_event(
    event_id: UUID,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
    include_conflicts: bool = Query(False, description="Include conflict information")
) -> ScheduleEventWithConflicts:
    """
    Get a specific event by ID.
    
    Users can only see events they have access to.
    """
    service = ScheduleService(db)
    event = await service.get_event(event_id, include_conflicts=include_conflicts)
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    # Check access
    has_access = False
    if current_user.role == "teacher" and event.teacher_id == current_user.id:
        has_access = True
    elif current_user.role == "student" and any(p.id == current_user.id for p in event.participants):
        has_access = True
    
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this event"
        )
    
    return ScheduleEventWithConflicts.model_validate(event)


@router.put("/{event_id}", response_model=ScheduleEventWithParticipants)
async def update_event(
    event_id: UUID,
    event_update: ScheduleEventUpdate,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_teacher)],
    update_series: bool = Query(False, description="Update all events in the series")
) -> ScheduleEventWithParticipants:
    """
    Update a scheduled event.
    
    Only the teacher who created the event can update it.
    """
    service = ScheduleService(db)
    event = await service.update_event(
        event_id=event_id,
        teacher_id=current_user.id,
        event_update=event_update,
        update_series=update_series
    )
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found or you don't have permission to update it"
        )
    
    return ScheduleEventWithParticipants.model_validate(event)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: UUID,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_teacher)],
    delete_series: bool = Query(False, description="Delete all events in the series")
) -> None:
    """
    Cancel a scheduled event.
    
    Only the teacher who created the event can cancel it.
    """
    service = ScheduleService(db)
    success = await service.delete_event(
        event_id=event_id,
        teacher_id=current_user.id,
        delete_series=delete_series
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found or you don't have permission to delete it"
        )


@router.post("/conflicts/{conflict_id}/resolve", response_model=ScheduleConflict)
async def resolve_conflict(
    conflict_id: UUID,
    resolution: ConflictResolution,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_teacher)]
) -> ScheduleConflict:
    """
    Resolve or ignore a scheduling conflict.
    
    Only teachers can resolve conflicts for their events.
    """
    service = ScheduleService(db)
    
    # First get the conflict to check ownership
    conflict_query = await service.db.execute(
        select(ScheduleConflict).where(ScheduleConflict.id == conflict_id)
    )
    conflict = conflict_query.scalar_one_or_none()
    
    if not conflict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conflict not found"
        )
    
    # Check if the current user owns the event
    event = await service.get_event(conflict.event_id)
    if not event or event.teacher_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to resolve this conflict"
        )
    
    resolved_conflict = await service.resolve_conflict(conflict_id, resolution)
    if not resolved_conflict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Failed to resolve conflict"
        )
    
    return ScheduleConflict.model_validate(resolved_conflict)


# Student-specific endpoints
@router.get("/my/upcoming", response_model=List[ScheduleEvent])
async def get_my_upcoming_events(
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_student)],
    days_ahead: int = Query(7, ge=1, le=30, description="Number of days to look ahead")
) -> List[ScheduleEvent]:
    """
    Get upcoming events for the current student.
    
    Shows events in the next N days that the student is participating in.
    """
    service = ScheduleService(db)
    
    start_date = datetime.utcnow()
    end_date = start_date + timedelta(days=days_ahead)
    
    events = await service.get_events(
        student_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
        status=EventStatus.SCHEDULED,
        limit=50
    )
    
    return [ScheduleEvent.model_validate(event) for event in events]


# Teacher-specific endpoints
@router.get("/students/{student_id}/events", response_model=List[ScheduleEvent])
async def get_student_events(
    student_id: UUID,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_teacher)],
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100)
) -> List[ScheduleEvent]:
    """
    Get events for a specific student.
    
    Teachers can only see events for their own students.
    """
    # Verify the student belongs to this teacher
    from app.services.auth.user_service import UserService
    user_service = UserService(db)
    student = await user_service.get_student_profile(student_id)
    
    if not student or student.primary_teacher_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this student's events"
        )
    
    service = ScheduleService(db)
    
    # Convert date to datetime if provided
    start_datetime = None
    end_datetime = None
    if start_date:
        start_datetime = datetime.combine(start_date, datetime.min.time())
    if end_date:
        end_datetime = datetime.combine(end_date, datetime.max.time())
    
    events = await service.get_events(
        student_id=student_id,
        start_date=start_datetime,
        end_date=end_datetime,
        skip=skip,
        limit=limit
    )
    
    return [ScheduleEvent.model_validate(event) for event in events]


# Import necessary models for the endpoint
from sqlalchemy import select
from app.models.schedule import ScheduleConflict


@router.get("/calendar/export", response_class=Response)
async def export_calendar(
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
    start_date: Optional[date] = Query(None, description="Start date for events"),
    end_date: Optional[date] = Query(None, description="End date for events"),
    include_cancelled: bool = Query(False, description="Include cancelled events")
) -> Response:
    """
    Export schedule as iCal/WebCal format.
    
    Returns a .ics file that can be imported into calendar applications
    or subscribed to as a WebCal feed.
    """
    service = ScheduleService(db)
    ical_service = ICalService()
    
    # Convert dates to datetime if provided
    start_datetime = None
    end_datetime = None
    if start_date:
        start_datetime = datetime.combine(start_date, datetime.min.time())
    if end_date:
        end_datetime = datetime.combine(end_date, datetime.max.time())
    
    # Get events based on user role
    if current_user.role == "teacher":
        # Teachers see all their events
        events = await service.get_events(
            teacher_id=current_user.id,
            start_date=start_datetime,
            end_date=end_datetime,
            status=None if include_cancelled else EventStatus.SCHEDULED
        )
    else:
        # Students see their own events
        events = await service.get_events(
            student_id=current_user.id,
            start_date=start_datetime,
            end_date=end_datetime,
            status=None if include_cancelled else EventStatus.SCHEDULED
        )
    
    # Generate calendar name based on user
    calendar_name = f"{current_user.full_name} - Music Practice Schedule"
    calendar_description = "Music practice sessions and lessons"
    
    # Generate iCal content
    ical_content = ical_service.generate_calendar(
        events=events,
        calendar_name=calendar_name,
        calendar_description=calendar_description,
        domain="music-tracker.app"
    )
    
    # Return as calendar file
    return Response(
        content=ical_content,
        media_type="text/calendar",
        headers={
            "Content-Disposition": f'attachment; filename="music-schedule-{current_user.id}.ics"',
            "Content-Type": "text/calendar; charset=utf-8"
        }
    )