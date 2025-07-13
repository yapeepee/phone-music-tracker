import { apiClient, handleApiError } from './api/client';
import { PracticeSession } from '../types/practice';

export interface CreateSessionRequest {
  focus?: string;
  startTime: string;
  endTime?: string;
  selfRating?: number;
  note?: string;
  tags?: string[];
  targetTempo?: number;
  practiceMode?: string;
}

export interface SessionResponse {
  id: string;
  studentId: string;
  focus?: string;
  startTime: string;
  endTime?: string;
  selfRating?: number;
  note?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  notes?: string;  // Added for compatibility with SessionDetailsModal
  videoCount?: number;  // Added for compatibility with SessionDetailsModal
  durationMinutes?: number;  // Added for teacher's SessionDetailScreen
  // Also support snake_case versions that might come from API
  duration_minutes?: number;
  student_id?: string;
  start_time?: string;
  end_time?: string;
  self_rating?: number;
  created_at?: string;
  updated_at?: string;
}

class PracticeService {
  /**
   * Create a new practice session
   */
  async createSession(session: CreateSessionRequest): Promise<SessionResponse> {
    try {
      const response = await apiClient.post<SessionResponse>('/sessions', session);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Get all practice sessions for the current user
   */
  async getSessions(params?: {
    skip?: number;
    limit?: number;
    startDate?: string;  // ISO datetime string (e.g., "2025-04-30T00:00:00.000Z")
    endDate?: string;    // ISO datetime string (e.g., "2025-07-30T23:59:59.999Z")
  }): Promise<SessionResponse[]> {
    try {
      // Let the API client interceptor handle the transformation
      const response = await apiClient.get<SessionResponse[]>('/sessions', { params });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Get a specific practice session
   */
  async getSession(sessionId: string): Promise<SessionResponse> {
    try {
      const response = await apiClient.get<SessionResponse>(`/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Update a practice session
   */
  async updateSession(sessionId: string, updates: Partial<CreateSessionRequest>): Promise<SessionResponse> {
    try {
      if (__DEV__) {
        console.log('updateSession called with:', {
          sessionId,
          updates: JSON.stringify(updates, null, 2)
        });
      }
      const response = await apiClient.put<SessionResponse>(`/sessions/${sessionId}`, updates);
      return response.data;
    } catch (error) {
      console.error('updateSession error:', error);
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Delete a practice session
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      await apiClient.delete(`/sessions/${sessionId}`);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Offline sync removed - app now requires internet connection

  /**
   * Get practice statistics for a date range
   */
  async getStatistics(startDate?: string, endDate?: string): Promise<any> {
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      
      const response = await apiClient.get('/sessions/statistics', { params });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

}

export default new PracticeService();