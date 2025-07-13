// Practice history types for timeline display
export interface PracticeDay {
  date: string; // YYYY-MM-DD format
  sessions: PracticeSessionSummary[];
  totalMinutes: number;
  hasPracticed: boolean;
}

export interface PracticeSessionSummary {
  id: string;
  start_time: string;
  end_time?: string;
  duration_minutes: number;
  focus?: string;
  self_rating?: number;
  has_video: boolean;
  has_feedback: boolean;
  tags: string[];
}

export interface PracticeMonth {
  year: number;
  month: number; // 0-11
  days: PracticeDay[];
  totalSessions: number;
  totalMinutes: number;
  streakDays: number;
}

export interface CalendarDay {
  date: Date;
  dateString: string; // YYYY-MM-DD
  isCurrentMonth: boolean;
  isToday: boolean;
  hasPractice: boolean;
  sessionCount: number;
  totalMinutes: number;
}