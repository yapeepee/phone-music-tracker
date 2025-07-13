import { apiClient, handleApiError } from './api/client';

export interface StudentActivity {
  user_id: string;
  full_name: string;
  email: string;
  instrument?: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  practice_goal_minutes: number;
  last_session_date?: string;
  total_sessions_week: number;
  total_minutes_week: number;
  average_rating_week?: number;
  streak_days: number;
  is_active: boolean;
}

export interface StudentProfile {
  student: {
    user_id: string;
    primary_teacher_id: string;
    level: 'beginner' | 'intermediate' | 'advanced';
    instrument?: string;
    practice_goal_minutes: number;
    created_at: string;
    updated_at: string;
    user: {
      email: string;
      full_name: string;
      role: string;
      timezone: string;
      id: string;
      is_active: boolean;
      is_verified: boolean;
      created_at: string;
      updated_at: string;
    };
  };
  total_sessions: number;
  total_practice_minutes: number;
  average_session_minutes?: number;
  average_self_rating?: number;
  sessions_last_7_days: number;
  minutes_last_7_days: number;
  sessions_last_30_days: number;
  minutes_last_30_days: number;
  improvement_trend?: number;
  consistency_score?: number;
}

class TeacherService {
  /**
   * Get all students assigned to the current teacher
   */
  async getStudents(params?: {
    skip?: number;
    limit?: number;
    activeOnly?: boolean;
  }): Promise<StudentActivity[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params) {
        if (params.skip !== undefined) queryParams.append('skip', params.skip.toString());
        if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
        if (params.activeOnly !== undefined) queryParams.append('active_only', params.activeOnly.toString());
      }
      
      const url = queryParams.toString() ? `/teachers/students?${queryParams.toString()}` : '/teachers/students';
      const response = await apiClient.get<StudentActivity[]>(url);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Get detailed profile for a specific student
   */
  async getStudentProfile(studentId: string): Promise<StudentProfile> {
    try {
      const response = await apiClient.get<StudentProfile>(`/teachers/students/${studentId}`);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Get recent sessions for a specific student
   */
  async getStudentRecentSessions(
    studentId: string,
    params?: {
      days?: number;
      limit?: number;
    }
  ): Promise<any[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params) {
        if (params.days !== undefined) queryParams.append('days', params.days.toString());
        if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
      }
      
      const url = queryParams.toString() 
        ? `/teachers/students/${studentId}/recent-sessions?${queryParams.toString()}`
        : `/teachers/students/${studentId}/recent-sessions`;
      
      const response = await apiClient.get<any[]>(url);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }
}

export default new TeacherService();