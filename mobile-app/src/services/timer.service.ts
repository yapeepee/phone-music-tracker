import { apiClient, handleApiError } from './api/client';

export interface TimerEvent {
  id?: string;
  session_timer_id?: string;
  event_type: 'start' | 'pause' | 'resume' | 'stop';
  event_timestamp: string;
}

export interface SessionTimer {
  id: string;
  session_id: string;
  total_seconds: number;
  is_paused: boolean;
  created_at: string;
  updated_at: string;
  events: TimerEvent[];
}

export interface SessionTimerCreate {
  session_id: string;
  total_seconds?: number;
  is_paused?: boolean;
  events?: TimerEvent[];
}

export interface SessionTimerUpdate {
  total_seconds?: number;
  is_paused?: boolean;
}

export interface TimerSummary {
  total_seconds: number;
  pause_count: number;
  total_pause_seconds: number;
  events: TimerEvent[];
}

class TimerService {
  /**
   * Create a timer for a practice session
   */
  async createSessionTimer(sessionId: string, data: SessionTimerCreate): Promise<SessionTimer> {
    try {
      const response = await apiClient.post<SessionTimer>(
        `/timer/sessions/${sessionId}/timer`,
        { ...data, session_id: sessionId }
      );
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Get timer for a specific session
   */
  async getSessionTimer(sessionId: string): Promise<SessionTimer | null> {
    try {
      const response = await apiClient.get<SessionTimer>(
        `/timer/sessions/${sessionId}/timer`
      );
      return response.data;
    } catch (error) {
      // If 404, return null (no timer exists yet)
      if (error.response?.status === 404) {
        return null;
      }
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Update timer for a session
   */
  async updateSessionTimer(sessionId: string, data: SessionTimerUpdate): Promise<SessionTimer> {
    try {
      const response = await apiClient.put<SessionTimer>(
        `/timer/sessions/${sessionId}/timer`,
        data
      );
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Add a timer event (pause/resume)
   */
  async addTimerEvent(sessionId: string, event: TimerEvent): Promise<TimerEvent> {
    try {
      const response = await apiClient.post<TimerEvent>(
        `/timer/sessions/${sessionId}/timer/events`,
        event
      );
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Get timer summary for a session
   */
  async getTimerSummary(sessionId: string): Promise<TimerSummary | null> {
    try {
      const response = await apiClient.get<TimerSummary>(
        `/timer/sessions/${sessionId}/timer/summary`
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw new Error(handleApiError(error));
    }
  }
}

export const timerService = new TimerService();