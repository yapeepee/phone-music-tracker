from typing import Optional, List, Dict, Any
from datetime import datetime, date, time, timedelta
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload

from app.models.schedule import (
    ScheduleEvent, RecurrenceRule, ScheduleConflict,
    EventType, RecurrenceType, EventStatus, event_participants
)
from app.models.user import User, Student
from app.schemas.schedule import (
    ScheduleEventCreate, ScheduleEventUpdate,
    RecurrenceRuleCreate, ConflictResolution,
    CalendarRequest, CalendarDayEvents, CalendarEventSummary
)
from app.services.notification_service import NotificationService
from app.schemas.notification import NotificationCreate


class ScheduleService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_event(
        self,
        teacher_id: UUID,
        event_data: ScheduleEventCreate
    ) -> ScheduleEvent:
        """Create a new scheduled event"""
        # Create the main event
        db_event = ScheduleEvent(
            teacher_id=teacher_id,
            title=event_data.title,
            description=event_data.description,
            event_type=event_data.event_type,
            start_datetime=event_data.start_datetime,
            end_datetime=event_data.end_datetime,
            timezone=event_data.timezone,
            location=event_data.location,
            is_online=event_data.is_online,
            meeting_url=event_data.meeting_url,
            color=event_data.color,
            reminder_minutes=event_data.reminder_minutes,
            max_participants=event_data.max_participants,
        )
        
        # Add participants
        if event_data.participant_ids:
            participants = await self._get_users_by_ids(event_data.participant_ids)
            db_event.participants = participants
        
        self.db.add(db_event)
        await self.db.flush()  # Get the event ID
        
        # Create recurrence rule if provided
        if event_data.recurrence_rule:
            await self._create_recurrence_rule(db_event.id, event_data.recurrence_rule)
            # Generate recurring instances
            await self._generate_recurring_events(db_event)
        
        # Check for conflicts
        await self._check_and_record_conflicts(db_event)
        
        await self.db.commit()
        
        # Send notifications to participants
        # Skip notifications for now to avoid async issues
        
        # Load with relationships
        return await self.get_event(db_event.id)
    
    async def get_event(
        self,
        event_id: UUID,
        include_conflicts: bool = False
    ) -> Optional[ScheduleEvent]:
        """Get a specific event with details"""
        query = select(ScheduleEvent).where(
            ScheduleEvent.id == event_id
        ).options(
            selectinload(ScheduleEvent.teacher),
            selectinload(ScheduleEvent.participants),
            selectinload(ScheduleEvent.recurrence_rule),
        )
        
        if include_conflicts:
            query = query.options(
                selectinload(ScheduleEvent.conflicts).selectinload(
                    ScheduleConflict.conflicting_event
                )
            )
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_events(
        self,
        teacher_id: Optional[UUID] = None,
        student_id: Optional[UUID] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        event_type: Optional[EventType] = None,
        status: Optional[EventStatus] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[ScheduleEvent]:
        """Get events with filters"""
        query = select(ScheduleEvent).options(
            selectinload(ScheduleEvent.teacher),
            selectinload(ScheduleEvent.participants),
            selectinload(ScheduleEvent.recurrence_rule),
        )
        
        # Filters
        conditions = []
        
        if teacher_id:
            conditions.append(ScheduleEvent.teacher_id == teacher_id)
        
        if student_id:
            # Events where student is a participant
            query = query.join(event_participants).where(
                event_participants.c.student_id == student_id
            )
        
        if start_date:
            conditions.append(ScheduleEvent.end_datetime >= start_date)
        
        if end_date:
            conditions.append(ScheduleEvent.start_datetime <= end_date)
        
        if event_type:
            conditions.append(ScheduleEvent.event_type == event_type)
        
        if status:
            conditions.append(ScheduleEvent.status == status)
        
        if conditions:
            query = query.where(and_(*conditions))
        
        query = query.order_by(ScheduleEvent.start_datetime)
        query = query.offset(skip).limit(limit)
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def update_event(
        self,
        event_id: UUID,
        teacher_id: UUID,
        event_update: ScheduleEventUpdate,
        update_series: bool = False
    ) -> Optional[ScheduleEvent]:
        """Update an event"""
        event = await self.get_event(event_id)
        if not event or event.teacher_id != teacher_id:
            return None
        
        update_data = event_update.model_dump(exclude_unset=True)
        
        # Handle participant updates separately
        if "participant_ids" in update_data:
            participant_ids = update_data.pop("participant_ids")
            if participant_ids is not None:
                participants = await self._get_users_by_ids(participant_ids)
                event.participants = participants
        
        # Update event fields
        for field, value in update_data.items():
            setattr(event, field, value)
        
        # If updating a recurring event series
        if update_series and event.recurrence_rule:
            # Update all future events in the series
            child_events = await self._get_child_events(event_id)
            for child_event in child_events:
                if child_event.start_datetime >= datetime.utcnow():
                    for field, value in update_data.items():
                        # Adjust datetime fields for child events
                        if field in ['start_datetime', 'end_datetime']:
                            time_diff = child_event.start_datetime - event.start_datetime
                            setattr(child_event, field, value + time_diff)
                        else:
                            setattr(child_event, field, value)
        
        # Check for new conflicts
        await self._check_and_record_conflicts(event)
        
        await self.db.commit()
        await self.db.refresh(event)
        return event
    
    async def delete_event(
        self,
        event_id: UUID,
        teacher_id: UUID,
        delete_series: bool = False
    ) -> bool:
        """Delete an event or cancel it"""
        event = await self.get_event(event_id)
        if not event or event.teacher_id != teacher_id:
            return False
        
        if delete_series and event.parent_event_id:
            # Delete/cancel entire series
            parent_event = await self.get_event(event.parent_event_id)
            if parent_event:
                parent_event.status = EventStatus.CANCELLED
                # Cancel all child events
                child_events = await self._get_child_events(parent_event.id)
                for child in child_events:
                    child.status = EventStatus.CANCELLED
        else:
            # Just cancel this event
            event.status = EventStatus.CANCELLED
        
        # Notify participants
        if event.participants:
            notification_service = NotificationService(self.db)
            for participant in event.participants:
                await notification_service.create_notification(
                    user_id=participant.id,
                    title="Event Cancelled",
                    message=f"'{event.title}' has been cancelled",
                    notification_type="event_cancelled",
                    data={"event_id": str(event.id)}
                )
        
        await self.db.commit()
        return True
    
    async def get_calendar_view(
        self,
        request: CalendarRequest,
        teacher_id: Optional[UUID] = None,
        student_id: Optional[UUID] = None
    ) -> List[CalendarDayEvents]:
        """Get events grouped by day for calendar display"""
        # Get events in date range
        events = await self.get_events(
            teacher_id=teacher_id,
            student_id=student_id,
            start_date=datetime.combine(request.start_date, time.min),
            end_date=datetime.combine(request.end_date, time.max),
            status=None if request.include_cancelled else EventStatus.SCHEDULED,
        )
        
        # Group by date
        events_by_date: Dict[date, List[CalendarEventSummary]] = {}
        
        for event in events:
            event_date = event.start_datetime.date()
            if event_date not in events_by_date:
                events_by_date[event_date] = []
            
            summary = CalendarEventSummary(
                id=event.id,
                title=event.title,
                event_type=event.event_type,
                status=event.status,
                start_datetime=event.start_datetime,
                end_datetime=event.end_datetime,
                color=event.color,
                is_online=event.is_online,
                participant_count=len(event.participants),
                is_recurring=event.recurrence_rule is not None
            )
            events_by_date[event_date].append(summary)
        
        # Convert to list of CalendarDayEvents
        result = []
        current_date = request.start_date
        while current_date <= request.end_date:
            day_events = CalendarDayEvents(
                date=current_date,
                events=events_by_date.get(current_date, [])
            )
            result.append(day_events)
            current_date += timedelta(days=1)
        
        return result
    
    async def resolve_conflict(
        self,
        conflict_id: UUID,
        resolution: ConflictResolution
    ) -> Optional[ScheduleConflict]:
        """Resolve or ignore a conflict"""
        query = select(ScheduleConflict).where(
            ScheduleConflict.id == conflict_id
        )
        result = await self.db.execute(query)
        conflict = result.scalar_one_or_none()
        
        if not conflict:
            return None
        
        conflict.resolution_status = resolution.resolution_status
        conflict.resolved_at = datetime.utcnow()
        
        await self.db.commit()
        await self.db.refresh(conflict)
        return conflict
    
    async def _create_recurrence_rule(
        self,
        event_id: UUID,
        rule_data: RecurrenceRuleCreate
    ) -> RecurrenceRule:
        """Create a recurrence rule for an event"""
        db_rule = RecurrenceRule(
            event_id=event_id,
            recurrence_type=rule_data.recurrence_type,
            interval=rule_data.interval,
            days_of_week=rule_data.days_of_week,
            day_of_month=rule_data.day_of_month,
            week_of_month=rule_data.week_of_month,
            end_date=rule_data.end_date,
            occurrences=rule_data.occurrences,
            exception_dates=rule_data.exception_dates,
        )
        
        self.db.add(db_rule)
        return db_rule
    
    async def _generate_recurring_events(
        self,
        parent_event: ScheduleEvent,
        max_occurrences: int = 365
    ) -> List[ScheduleEvent]:
        """Generate recurring event instances"""
        if not parent_event.recurrence_rule:
            return []
        
        rule = parent_event.recurrence_rule
        generated_events = []
        current_date = parent_event.start_datetime
        duration = parent_event.end_datetime - parent_event.start_datetime
        occurrence_count = 0
        
        while occurrence_count < max_occurrences:
            # Calculate next occurrence
            if rule.recurrence_type == RecurrenceType.DAILY:
                current_date += timedelta(days=rule.interval)
            elif rule.recurrence_type == RecurrenceType.WEEKLY:
                # Find next matching day of week
                days_ahead = None
                for i in range(1, 8):
                    next_date = current_date + timedelta(days=i)
                    if next_date.weekday() in (rule.days_of_week or []):
                        days_ahead = i
                        break
                if days_ahead:
                    current_date += timedelta(days=days_ahead)
                else:
                    break
            elif rule.recurrence_type == RecurrenceType.BIWEEKLY:
                current_date += timedelta(weeks=2)
            elif rule.recurrence_type == RecurrenceType.MONTHLY:
                # Simple monthly increment (could be improved)
                if current_date.month == 12:
                    current_date = current_date.replace(year=current_date.year + 1, month=1)
                else:
                    current_date = current_date.replace(month=current_date.month + 1)
            
            # Check end conditions
            if rule.end_date and current_date.date() > rule.end_date:
                break
            
            if rule.occurrences and occurrence_count >= rule.occurrences:
                break
            
            # Skip exception dates
            if rule.exception_dates and current_date.date() in rule.exception_dates:
                continue
            
            # Create child event
            child_event = ScheduleEvent(
                teacher_id=parent_event.teacher_id,
                title=parent_event.title,
                description=parent_event.description,
                event_type=parent_event.event_type,
                start_datetime=current_date,
                end_datetime=current_date + duration,
                timezone=parent_event.timezone,
                location=parent_event.location,
                is_online=parent_event.is_online,
                meeting_url=parent_event.meeting_url,
                color=parent_event.color,
                reminder_minutes=parent_event.reminder_minutes,
                max_participants=parent_event.max_participants,
                parent_event_id=parent_event.id,
            )
            
            # Copy participants
            child_event.participants = parent_event.participants
            
            self.db.add(child_event)
            generated_events.append(child_event)
            occurrence_count += 1
        
        return generated_events
    
    async def _check_and_record_conflicts(
        self,
        event: ScheduleEvent
    ) -> List[ScheduleConflict]:
        """Check for conflicts with other events"""
        conflicts = []
        
        # Check teacher's schedule for time conflicts
        query = select(ScheduleEvent).where(
            and_(
                ScheduleEvent.teacher_id == event.teacher_id,
                ScheduleEvent.id != event.id,
                ScheduleEvent.status.in_([EventStatus.SCHEDULED, EventStatus.CONFIRMED]),
                or_(
                    and_(
                        ScheduleEvent.start_datetime < event.end_datetime,
                        ScheduleEvent.end_datetime > event.start_datetime
                    )
                )
            )
        )
        
        result = await self.db.execute(query)
        conflicting_events = result.scalars().all()
        
        for conflicting_event in conflicting_events:
            conflict = ScheduleConflict(
                event_id=event.id,
                conflicting_event_id=conflicting_event.id,
                conflict_type="time_overlap",
                severity="error",
            )
            self.db.add(conflict)
            conflicts.append(conflict)
        
        # Check participant conflicts
        # First check if the event has participants by querying the association table
        participant_check = await self.db.execute(
            select(event_participants.c.student_id).where(
                event_participants.c.event_id == event.id
            )
        )
        participant_ids = participant_check.scalars().all()
        
        if participant_ids:
            for participant_id in participant_ids:
                # Check if participant has other events at the same time
                participant_query = select(ScheduleEvent).join(
                    event_participants
                ).where(
                    and_(
                        event_participants.c.student_id == participant_id,
                        ScheduleEvent.id != event.id,
                        ScheduleEvent.status.in_([EventStatus.SCHEDULED, EventStatus.CONFIRMED]),
                        or_(
                            and_(
                                ScheduleEvent.start_datetime < event.end_datetime,
                                ScheduleEvent.end_datetime > event.start_datetime
                            )
                        )
                    )
                )
                
                result = await self.db.execute(participant_query)
                participant_conflicts = result.scalars().all()
                
                for conflicting_event in participant_conflicts:
                    conflict = ScheduleConflict(
                        event_id=event.id,
                        conflicting_event_id=conflicting_event.id,
                        conflict_type="participant_conflict",
                        severity="warning",
                    )
                    self.db.add(conflict)
                    conflicts.append(conflict)
        
        return conflicts
    
    async def _get_users_by_ids(self, user_ids: List[UUID]) -> List[User]:
        """Get users by their IDs"""
        query = select(User).where(User.id.in_(user_ids))
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def _get_child_events(self, parent_event_id: UUID) -> List[ScheduleEvent]:
        """Get all child events of a parent recurring event"""
        query = select(ScheduleEvent).where(
            ScheduleEvent.parent_event_id == parent_event_id
        )
        result = await self.db.execute(query)
        return result.scalars().all()