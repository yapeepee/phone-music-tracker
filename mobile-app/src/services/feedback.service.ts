import { apiClient, handleApiError } from './api/client';

export interface FeedbackCreate {
  text: string;
  rating?: number;
  session_id?: string;
  video_id?: string;
  timestamp_seconds?: number;
}

export interface FeedbackUpdate {
  text: string;
  rating?: number;
}

export interface Feedback {
  id: string;
  teacher_id: string;
  session_id?: string;
  video_id?: string;
  text: string;
  rating?: number;
  timestamp_seconds?: number;
  created_at: string;
  updated_at: string;
}

class FeedbackService {
  /**
   * Create new feedback for a session or video
   */
  async createFeedback(feedback: FeedbackCreate): Promise<Feedback> {
    try {
      const response = await apiClient.post<Feedback>('/feedback/', feedback);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Get all feedback for a session
   */
  async getSessionFeedback(sessionId: string): Promise<Feedback[]> {
    try {
      const response = await apiClient.get<Feedback[]>(`/feedback/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Get all feedback for a video
   */
  async getVideoFeedback(videoId: string): Promise<Feedback[]> {
    try {
      const response = await apiClient.get<Feedback[]>(`/feedback/videos/${videoId}`);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Get a specific feedback item
   */
  async getFeedback(feedbackId: string): Promise<Feedback> {
    try {
      const response = await apiClient.get<Feedback>(`/feedback/${feedbackId}`);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Update feedback
   */
  async updateFeedback(feedbackId: string, update: FeedbackUpdate): Promise<Feedback> {
    try {
      const response = await apiClient.put<Feedback>(`/feedback/${feedbackId}`, update);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Delete feedback
   */
  async deleteFeedback(feedbackId: string): Promise<void> {
    try {
      await apiClient.delete(`/feedback/${feedbackId}`);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Get all feedback given to a student by the current teacher
   */
  async getStudentAllFeedback(
    studentId: string,
    params?: {
      skip?: number;
      limit?: number;
    }
  ): Promise<Feedback[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params) {
        if (params.skip !== undefined) queryParams.append('skip', params.skip.toString());
        if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
      }
      
      const url = queryParams.toString()
        ? `/feedback/students/${studentId}/all?${queryParams.toString()}`
        : `/feedback/students/${studentId}/all`;
      
      const response = await apiClient.get<Feedback[]>(url);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }
}

export default new FeedbackService();