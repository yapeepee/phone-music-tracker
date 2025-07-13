// Safe wrapper for notification service that works in Expo Go
import Constants from 'expo-constants';
import { apiClient, handleApiError } from './api/client';

export interface Notification {
  id: string;
  user_id: string;
  type: 'practice_reminder' | 'session_feedback' | 'achievement' | 'system';
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  data?: any;
}

class NotificationServiceSafe {
  private isExpoGo = Constants.appOwnership === 'expo';

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    try {
      const response = await apiClient.get<{ unreadCount: number }>('/notifications/unread-count');
      return response.data.unreadCount || 0;
    } catch (error) {
      // Return 0 if there's an error (e.g., network issues, not authenticated)
      console.warn('Could not fetch unread notification count:', handleApiError(error));
      return 0;
    }
  }

  /**
   * Get all notifications
   */
  async getNotifications(skip = 0, limit = 20): Promise<Notification[]> {
    try {
      const response = await apiClient.get<Notification[]>('/notifications/', {
        params: { skip, limit }
      });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<Notification> {
    try {
      const response = await apiClient.put<Notification>(`/notifications/${notificationId}`);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<number> {
    try {
      const response = await apiClient.put<{ marked_count: number }>('/notifications/mark-all-read');
      return response.data.marked_count;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await apiClient.delete(`/notifications/${notificationId}`);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Register for push notifications (no-op in Expo Go)
   */
  async registerForPushNotifications(): Promise<string | null> {
    if (this.isExpoGo) {
      console.log('Push notifications not supported in Expo Go');
      return null;
    }
    
    // Dynamically import the full notification service only when not in Expo Go
    const { notificationService } = await import('./notification.service.full');
    return notificationService.registerForPushNotifications();
  }

  /**
   * Update push token (no-op in Expo Go)
   */
  async updatePushToken(token: string): Promise<void> {
    if (this.isExpoGo) {
      return;
    }
    
    const { notificationService } = await import('./notification.service.full');
    return notificationService.updatePushToken(token);
  }
}

export const notificationService = new NotificationServiceSafe();