import { apiClient, handleApiError } from './api/client';

export interface TempoTrackingEntry {
  actual_tempo: number;
  target_tempo: number;
  is_under_tempo: boolean;
}

export interface TempoTrackingResponse {
  id: string;
  session_id: string;
  timestamp: string;
  actual_tempo: number;
  target_tempo: number;
  is_under_tempo: boolean;
  points_earned: number;
  created_at: string;
}

export interface TempoStats {
  session_id: string;
  average_tempo: number;
  target_tempo: number;
  time_under_tempo_seconds: number;
  time_over_tempo_seconds: number;
  total_points_earned: number;
  compliance_percentage: number;
}

export interface SessionTempoUpdate {
  target_tempo: number;
  practice_mode: 'normal' | 'slow_practice' | 'meditation';
}

export interface TempoAchievement {
  id: string;
  student_id: string;
  achievement_type: string;
  level: number;
  unlocked_at: string;
}

export interface AchievementProgress {
  achievement_type: string;
  current_progress: number;
  required_progress: number;
  percentage_complete: number;
  is_unlocked: boolean;
  level: number;
}

// Achievement type constants
export const TEMPO_ACHIEVEMENTS = {
  FIRST_SLOW_PRACTICE: 'first_slow_practice',
  PATIENCE_PADAWAN: 'patience_padawan',
  ZEN_MASTER: 'zen_master',
  SLOW_AND_STEADY: 'slow_and_steady',
  TEMPO_DISCIPLINE: 'tempo_discipline',
  MEDITATION_MASTER: 'meditation_master',
} as const;

class TempoService {
  /**
   * Record a single tempo tracking entry
   */
  async recordTempoEntry(
    sessionId: string,
    entry: TempoTrackingEntry
  ): Promise<TempoTrackingResponse> {
    try {
      const response = await apiClient.post<TempoTrackingResponse>(
        `/tempo/${sessionId}/tempo-track`,
        entry
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Record multiple tempo entries at once
   */
  async recordTempoBatch(
    sessionId: string,
    entries: TempoTrackingEntry[]
  ): Promise<TempoTrackingResponse[]> {
    try {
      const response = await apiClient.post<TempoTrackingResponse[]>(
        `/tempo/${sessionId}/tempo-track/batch`,
        { entries }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get tempo statistics for a session
   */
  async getSessionTempoStats(sessionId: string): Promise<TempoStats> {
    try {
      const response = await apiClient.get<TempoStats>(
        `/tempo/${sessionId}/tempo-stats`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Update session tempo settings
   */
  async updateSessionTempo(
    sessionId: string,
    update: SessionTempoUpdate
  ): Promise<void> {
    try {
      await apiClient.put(`/tempo/${sessionId}/target-tempo`, update);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get tempo achievements for a student
   */
  async getStudentAchievements(studentId: string): Promise<TempoAchievement[]> {
    try {
      const response = await apiClient.get<TempoAchievement[]>(
        `/tempo/students/${studentId}/tempo-achievements`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get progress towards a specific achievement
   */
  async getAchievementProgress(
    studentId: string,
    achievementType: string
  ): Promise<AchievementProgress> {
    try {
      const response = await apiClient.get<AchievementProgress>(
        `/tempo/students/${studentId}/achievements/${achievementType}/progress`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const tempoService = new TempoService();