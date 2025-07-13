/**
 * Practice Service - Refactored with automatic variable name transformation
 * 
 * This service extends BaseService which handles:
 * - Automatic camelCase to snake_case conversion for requests
 * - Automatic snake_case to camelCase conversion for responses
 * - Consistent error handling
 */

import { BaseService, PaginatedResponse } from './base.service';
import { PracticeSession, PracticeStatistics } from '../types/practice';

export interface CreateSessionData {
  focus?: string;
  startTime: string;  // Will be converted to start_time
  endTime?: string;   // Will be converted to end_time
  selfRating?: number; // Will be converted to self_rating
  note?: string;
  tags?: string[];
  targetTempo?: number; // Will be converted to target_tempo
  practiceMode?: 'normal' | 'slow_practice' | 'meditation'; // Will be converted to practice_mode
}

export interface UpdateSessionData {
  endTime?: string;   // Will be converted to end_time
  selfRating?: number; // Will be converted to self_rating
  note?: string;
  tags?: string[];
}

export interface GetSessionsParams {
  skip?: number;
  limit?: number;
  startDate?: string;  // Will be converted to start_date
  endDate?: string;    // Will be converted to end_date
}

class PracticeService extends BaseService {
  constructor() {
    super('/sessions');
  }

  /**
   * Create a new practice session
   * The data will be automatically converted from camelCase to snake_case
   */
  async createSession(data: CreateSessionData): Promise<PracticeSession> {
    return this.post<PracticeSession>('', data);
  }

  /**
   * Get all practice sessions for the current user
   */
  async getSessions(params?: GetSessionsParams): Promise<PracticeSession[]> {
    return this.get<PracticeSession[]>('', { params });
  }

  /**
   * Get paginated practice sessions
   */
  async getSessionsPaginated(params?: GetSessionsParams): Promise<PaginatedResponse<PracticeSession>> {
    return this.getPaginated<PracticeSession>('', params);
  }

  /**
   * Get a specific practice session by ID
   */
  async getSession(sessionId: string): Promise<PracticeSession> {
    return this.get<PracticeSession>(`/${sessionId}`);
  }

  /**
   * Update a practice session
   * The data will be automatically converted from camelCase to snake_case
   */
  async updateSession(sessionId: string, data: UpdateSessionData): Promise<PracticeSession> {
    return this.put<PracticeSession>(`/${sessionId}`, data);
  }

  /**
   * End a practice session
   */
  async endSession(
    sessionId: string,
    data: UpdateSessionData & { videoUploadId?: string }
  ): Promise<PracticeSession> {
    // The service will handle the conversion
    return this.updateSession(sessionId, data);
  }

  /**
   * Delete a practice session
   */
  async deleteSession(sessionId: string): Promise<void> {
    return this.delete(`/${sessionId}`);
  }

  /**
   * Get practice statistics
   */
  async getStatistics(days?: number): Promise<PracticeStatistics> {
    return this.get<PracticeStatistics>('/statistics', {
      params: days ? { days } : undefined
    });
  }

  /**
   * Search practice sessions
   */
  async searchSessions(query: string, params?: { skip?: number; limit?: number }): Promise<PracticeSession[]> {
    return this.get<PracticeSession[]>('/search', {
      params: { q: query, ...params }
    });
  }

  /**
   * Sync a session that was created offline
   * @deprecated Offline mode is being removed
   */
  async syncSession(sessionData: CreateSessionData): Promise<PracticeSession> {
    console.warn('syncSession is deprecated. Offline mode is being removed.');
    return this.createSession(sessionData);
  }
}

// Export singleton instance
export const practiceService = new PracticeService();

// Also export the class for testing
export { PracticeService };