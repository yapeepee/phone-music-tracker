"""Service for generating iCal/WebCal calendar feeds."""
from typing import List, Optional
from datetime import datetime, timezone
from uuid import UUID
import hashlib

from app.models.schedule import ScheduleEvent, RecurrenceType


class ICalService:
    """Service for generating iCalendar format data."""
    
    PRODID = "-//Music Practice Tracker//Schedule//EN"
    VERSION = "2.0"
    
    @staticmethod
    def escape_text(text: str) -> str:
        """Escape special characters for iCal format."""
        if not text:
            return ""
        # Escape commas, semicolons, and backslashes
        text = text.replace("\\", "\\\\")
        text = text.replace(",", "\\,")
        text = text.replace(";", "\\;")
        text = text.replace("\n", "\\n")
        return text
    
    @staticmethod
    def format_datetime(dt: datetime, timezone_str: Optional[str] = None) -> str:
        """Format datetime for iCal format."""
        # Convert to UTC if no timezone specified
        if not dt.tzinfo:
            dt = dt.replace(tzinfo=timezone.utc)
        
        # Format as UTC time with Z suffix
        return dt.strftime("%Y%m%dT%H%M%SZ")
    
    @staticmethod
    def generate_uid(event_id: UUID, domain: str = "music-tracker.local") -> str:
        """Generate a unique identifier for an event."""
        return f"{event_id}@{domain}"
    
    def generate_vevent(self, event: ScheduleEvent, domain: str = "music-tracker.local") -> List[str]:
        """Generate VEVENT component for a single event."""
        lines = []
        
        # Begin event
        lines.append("BEGIN:VEVENT")
        
        # Required fields
        lines.append(f"UID:{self.generate_uid(event.id, domain)}")
        lines.append(f"DTSTAMP:{self.format_datetime(datetime.now(timezone.utc))}")
        lines.append(f"DTSTART:{self.format_datetime(event.start_datetime)}")
        lines.append(f"DTEND:{self.format_datetime(event.end_datetime)}")
        lines.append(f"SUMMARY:{self.escape_text(event.title)}")
        
        # Optional fields
        if event.description:
            lines.append(f"DESCRIPTION:{self.escape_text(event.description)}")
        
        if event.location:
            lines.append(f"LOCATION:{self.escape_text(event.location)}")
        elif event.is_online and event.meeting_url:
            lines.append(f"LOCATION:{self.escape_text(event.meeting_url)}")
        
        # Status
        if event.status == "cancelled":
            lines.append("STATUS:CANCELLED")
        elif event.status == "confirmed":
            lines.append("STATUS:CONFIRMED")
        else:
            lines.append("STATUS:TENTATIVE")
        
        # Categories (event type)
        lines.append(f"CATEGORIES:{event.event_type.upper()}")
        
        # Reminder/Alarm
        if event.reminder_minutes > 0:
            lines.append("BEGIN:VALARM")
            lines.append("TRIGGER:-PT{}M".format(event.reminder_minutes))
            lines.append("ACTION:DISPLAY")
            lines.append(f"DESCRIPTION:Reminder: {self.escape_text(event.title)}")
            lines.append("END:VALARM")
        
        # Recurrence rules
        if event.recurrence_rule:
            rrule = self._generate_rrule(event.recurrence_rule)
            if rrule:
                lines.append(f"RRULE:{rrule}")
            
            # Exception dates
            if event.recurrence_rule.exception_dates:
                exdates = ";".join([
                    self.format_datetime(datetime.combine(d, datetime.min.time()))
                    for d in event.recurrence_rule.exception_dates
                ])
                lines.append(f"EXDATE:{exdates}")
        
        # Organizer (teacher)
        if hasattr(event, 'teacher') and event.teacher:
            lines.append(f"ORGANIZER;CN={self.escape_text(event.teacher.full_name)}:mailto:{event.teacher.email}")
        
        # Attendees (participants)
        if hasattr(event, 'participants'):
            for participant in event.participants:
                lines.append(f"ATTENDEE;CN={self.escape_text(participant.full_name)}:mailto:{participant.email}")
        
        # URL (for online events)
        if event.is_online and event.meeting_url:
            lines.append(f"URL:{event.meeting_url}")
        
        # Color (X-property for calendar apps that support it)
        if event.color:
            lines.append(f"X-APPLE-CALENDAR-COLOR:{event.color}")
            lines.append(f"X-OUTLOOK-COLOR:{event.color}")
        
        # End event
        lines.append("END:VEVENT")
        
        return lines
    
    def _generate_rrule(self, recurrence_rule) -> Optional[str]:
        """Generate RRULE string from recurrence rule."""
        if not recurrence_rule or recurrence_rule.recurrence_type == RecurrenceType.NONE:
            return None
        
        parts = []
        
        # Frequency
        if recurrence_rule.recurrence_type == RecurrenceType.DAILY:
            parts.append("FREQ=DAILY")
        elif recurrence_rule.recurrence_type == RecurrenceType.WEEKLY:
            parts.append("FREQ=WEEKLY")
        elif recurrence_rule.recurrence_type == RecurrenceType.BIWEEKLY:
            parts.append("FREQ=WEEKLY")
            parts.append("INTERVAL=2")
        elif recurrence_rule.recurrence_type == RecurrenceType.MONTHLY:
            parts.append("FREQ=MONTHLY")
        
        # Interval (if not already set)
        if recurrence_rule.interval > 1 and "INTERVAL" not in " ".join(parts):
            parts.append(f"INTERVAL={recurrence_rule.interval}")
        
        # End condition
        if recurrence_rule.end_date:
            parts.append(f"UNTIL={self.format_datetime(datetime.combine(recurrence_rule.end_date, datetime.max.time()))}")
        elif recurrence_rule.occurrences:
            parts.append(f"COUNT={recurrence_rule.occurrences}")
        
        # Days of week (for weekly recurrence)
        if recurrence_rule.days_of_week and recurrence_rule.recurrence_type in [RecurrenceType.WEEKLY, RecurrenceType.BIWEEKLY]:
            days_map = {0: "MO", 1: "TU", 2: "WE", 3: "TH", 4: "FR", 5: "SA", 6: "SU"}
            days = [days_map[d] for d in recurrence_rule.days_of_week if d in days_map]
            if days:
                parts.append(f"BYDAY={','.join(days)}")
        
        # Day of month (for monthly recurrence)
        if recurrence_rule.day_of_month and recurrence_rule.recurrence_type == RecurrenceType.MONTHLY:
            parts.append(f"BYMONTHDAY={recurrence_rule.day_of_month}")
        
        return ";".join(parts) if parts else None
    
    def generate_calendar(
        self,
        events: List[ScheduleEvent],
        calendar_name: str = "Music Practice Schedule",
        calendar_description: Optional[str] = None,
        domain: str = "music-tracker.local"
    ) -> str:
        """Generate complete iCalendar file content."""
        lines = []
        
        # Calendar header
        lines.append("BEGIN:VCALENDAR")
        lines.append(f"VERSION:{self.VERSION}")
        lines.append(f"PRODID:{self.PRODID}")
        lines.append(f"X-WR-CALNAME:{self.escape_text(calendar_name)}")
        
        if calendar_description:
            lines.append(f"X-WR-CALDESC:{self.escape_text(calendar_description)}")
        
        # Timezone identifier (using UTC for simplicity)
        lines.append("CALSCALE:GREGORIAN")
        lines.append("METHOD:PUBLISH")
        
        # Add all events
        for event in events:
            lines.extend(self.generate_vevent(event, domain))
        
        # Calendar footer
        lines.append("END:VCALENDAR")
        
        # Join with CRLF as per iCal spec
        return "\r\n".join(lines)