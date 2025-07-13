import { BaseService } from './base.service';

// Enums
export enum EventType {
  LESSON = 'lesson',
  PRACTICE = 'practice',
  MASTERCLASS = 'masterclass',
  RECITAL = 'recital',
  OTHER = 'other'
}

export enum RecurrenceType {
  NONE = 'none',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly'
}

export enum EventStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  RESCHEDULED = 'rescheduled'
}

// Types
export interface RecurrenceRule {
  recurrenceType: RecurrenceType;
  interval: number;
  daysOfWeek?: number[]; // 0=Mon, 1=Tue, ..., 6=Sun
  dayOfMonth?: number;
  weekOfMonth?: number;
  endDate?: string; // ISO date string
  occurrences?: number;
  exceptionDates?: string[]; // Array of ISO date strings
}

export interface ScheduleEvent {
  id: string;
  teacherId: string;
  title: string;
  description?: string;
  eventType: EventType;
  status: EventStatus;
  startDatetime: string; // ISO datetime
  endDatetime: string; // ISO datetime
  timezone: string;
  location?: string;
  isOnline: boolean;
  meetingUrl?: string;
  color: string;
  reminderMinutes: number;
  maxParticipants?: number;
  parentEventId?: string;
  createdAt: string;
  updatedAt: string;
  durationMinutes: number;
}

export interface ScheduleEventWithParticipants extends ScheduleEvent {
  participants: UserBasic[];
  recurrenceRule?: RecurrenceRule;
}

export interface ScheduleEventWithConflicts extends ScheduleEventWithParticipants {
  conflicts: ScheduleConflict[];
}

export interface UserBasic {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

export interface ScheduleConflict {
  id: string;
  eventId: string;
  conflictingEventId: string;
  conflictType: string;
  severity: string;
  resolutionStatus: string;
  detectedAt: string;
  resolvedAt?: string;
  conflictingEvent?: ScheduleEvent;
}

export interface CalendarEventSummary {
  id: string;
  title: string;
  eventType: EventType;
  status: EventStatus;
  startDatetime: string;
  endDatetime: string;
  color: string;
  isOnline: boolean;
  participantCount: number;
  isRecurring: boolean;
}

export interface CalendarDayEvents {
  date: string; // ISO date
  events: CalendarEventSummary[];
}

// Request/Response types
export interface ScheduleEventCreateRequest {
  title: string;
  description?: string;
  eventType: EventType;
  startDatetime: string;
  endDatetime: string;
  timezone?: string;
  location?: string;
  isOnline: boolean;
  meetingUrl?: string;
  color?: string;
  reminderMinutes?: number;
  maxParticipants?: number;
  participantIds: string[];
  recurrenceRule?: RecurrenceRule;
}

export interface ScheduleEventUpdateRequest {
  title?: string;
  description?: string;
  eventType?: EventType;
  status?: EventStatus;
  startDatetime?: string;
  endDatetime?: string;
  timezone?: string;
  location?: string;
  isOnline?: boolean;
  meetingUrl?: string;
  color?: string;
  reminderMinutes?: number;
  maxParticipants?: number;
  participantIds?: string[];
}

export interface CalendarRequest {
  startDate: string; // ISO date
  endDate: string; // ISO date
  includeCancelled?: boolean;
}

export interface ConflictResolution {
  resolutionStatus: 'resolved' | 'ignored';
  resolutionNote?: string;
}

export interface EventsParams {
  startDate?: string;
  endDate?: string;
  eventType?: EventType;
  status?: EventStatus;
  skip?: number;
  limit?: number;
}

class ScheduleService extends BaseService {
  constructor() {
    super('/schedule');
  }
  // Create a new event
  async createEvent(eventData: ScheduleEventCreateRequest): Promise<ScheduleEventWithParticipants> {
    return this.post<ScheduleEventWithParticipants>('/', eventData);
  }

  // Get events with filters
  async getEvents(params?: EventsParams): Promise<ScheduleEvent[]> {
    return this.get<ScheduleEvent[]>('/', { params });
  }

  // Get calendar view
  async getCalendarView(request: CalendarRequest): Promise<CalendarDayEvents[]> {
    return this.get<CalendarDayEvents[]>('/calendar', { params: request });
  }

  // Get single event
  async getEvent(eventId: string, includeConflicts = false): Promise<ScheduleEventWithConflicts> {
    return this.get<ScheduleEventWithConflicts>(
      `/${eventId}`,
      { params: { includeConflicts } }
    );
  }

  // Update event
  async updateEvent(
    eventId: string,
    updateData: ScheduleEventUpdateRequest,
    updateSeries = false
  ): Promise<ScheduleEventWithParticipants> {
    return this.put<ScheduleEventWithParticipants>(
      `/${eventId}`,
      updateData,
      { params: { updateSeries } }
    );
  }

  // Delete/cancel event
  async deleteEvent(eventId: string, deleteSeries = false): Promise<void> {
    return this.delete(`/${eventId}`, {
      params: { deleteSeries }
    });
  }

  // Resolve conflict
  async resolveConflict(
    conflictId: string,
    resolution: ConflictResolution
  ): Promise<ScheduleConflict> {
    return this.post<ScheduleConflict>(
      `/conflicts/${conflictId}/resolve`,
      resolution
    );
  }

  // Get upcoming events (student)
  async getMyUpcomingEvents(daysAhead = 7): Promise<ScheduleEvent[]> {
    return this.get<ScheduleEvent[]>('/my/upcoming', {
      params: { daysAhead }
    });
  }

  // Get student events (teacher)
  async getStudentEvents(
    studentId: string,
    params?: EventsParams
  ): Promise<ScheduleEvent[]> {
    return this.get<ScheduleEvent[]>(
      `/students/${studentId}/events`,
      { params }
    );
  }

  // Helper: Format event time for display
  formatEventTime(event: ScheduleEvent | CalendarEventSummary): string {
    const start = new Date(event.startDatetime);
    const end = new Date(event.endDatetime);
    
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    };
    
    const startTime = start.toLocaleTimeString('en-US', timeOptions);
    const endTime = end.toLocaleTimeString('en-US', timeOptions);
    
    return `${startTime} - ${endTime}`;
  }

  // Helper: Format event date for display
  formatEventDate(event: ScheduleEvent | CalendarEventSummary): string {
    const date = new Date(event.startDatetime);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  // Helper: Check if event is happening today
  isToday(event: ScheduleEvent | CalendarEventSummary): boolean {
    const eventDate = new Date(event.startDatetime);
    const today = new Date();
    return (
      eventDate.getDate() === today.getDate() &&
      eventDate.getMonth() === today.getMonth() &&
      eventDate.getFullYear() === today.getFullYear()
    );
  }

  // Helper: Check if event is in the past
  isPast(event: ScheduleEvent | CalendarEventSummary): boolean {
    return new Date(event.endDatetime) < new Date();
  }

  // Helper: Get event type icon
  getEventTypeIcon(eventType: EventType): string {
    const icons: Record<EventType, string> = {
      [EventType.LESSON]: 'school',
      [EventType.PRACTICE]: 'piano',
      [EventType.MASTERCLASS]: 'star',
      [EventType.RECITAL]: 'music-note',
      [EventType.OTHER]: 'calendar'
    };
    return icons[eventType] || 'calendar';
  }

  // Helper: Get event status color
  getEventStatusColor(status: EventStatus): string {
    const colors: Record<EventStatus, string> = {
      [EventStatus.SCHEDULED]: '#6366F1',
      [EventStatus.CONFIRMED]: '#10B981',
      [EventStatus.CANCELLED]: '#EF4444',
      [EventStatus.COMPLETED]: '#6B7280',
      [EventStatus.RESCHEDULED]: '#F59E0B'
    };
    return colors[status] || '#6366F1';
  }
}

export const scheduleService = new ScheduleService();