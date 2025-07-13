import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiClient, handleApiError } from './api/client';

// Configure notification handler (only if not in Expo Go)
if (Constants.appOwnership !== 'expo') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'video_processing' | 'feedback_received' | 'session_reminder' | 'achievement_unlocked' | 'system_announcement' | 'event_invitation' | 'event_cancelled';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  read_at?: string;
  created_at: string;
}

export interface NotificationList {
  items: Notification[];
  total: number;
  unread_count: number;
}

class NotificationService {
  private pushToken: string | null = null;

  /**
   * Register for push notifications and get push token
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      // Check if running in Expo Go
      const isExpoGo = Constants.appOwnership === 'expo';
      if (isExpoGo) {
        console.log('Push notifications are not supported in Expo Go. Use a development build.');
        return null;
      }

      // Check if device supports notifications
      if (!Device.isDevice) {
        console.log('Must use physical device for Push Notifications');
        return null;
      }

      // Get existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }

      // Get push token
      const token = await Notifications.getExpoPushTokenAsync();
      this.pushToken = token.data;
      console.log('Push token:', this.pushToken);

      // Configure Android channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      // Send token to backend
      await this.updatePushToken(this.pushToken);

      return this.pushToken;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Update push token on backend
   */
  async updatePushToken(token: string): Promise<void> {
    try {
      await apiClient.put('/auth/push-token', { 
        push_token: token,
        platform: Platform.OS,
      });
    } catch (error) {
      console.error('Error updating push token:', error);
    }
  }
  /**
   * Get notifications for the current user
   */
  async getNotifications(params?: {
    skip?: number;
    limit?: number;
    unread_only?: boolean;
  }): Promise<NotificationList> {
    try {
      const response = await apiClient.get<NotificationList>('/notifications/', { params });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    try {
      const response = await apiClient.get<{ unread_count: number }>('/notifications/unread-count');
      return response.data.unread_count;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Get a specific notification
   */
  async getNotification(notificationId: string): Promise<Notification> {
    try {
      const response = await apiClient.get<Notification>(`/notifications/${notificationId}`);
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
   * Handle notification response (when user taps notification)
   */
  handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const data = response.notification.request.content.data;
    
    // Navigate based on notification type
    if (data?.session_id) {
      // Navigate to session details
      // This will be handled by navigation service
      console.log('Navigate to session:', data.session_id);
    } else if (data?.event_id) {
      // Navigate to event details
      console.log('Navigate to event:', data.event_id);
    } else if (data?.feedback_id) {
      // Navigate to feedback
      console.log('Navigate to feedback:', data.feedback_id);
    }
  }

  /**
   * Schedule a local notification
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: Record<string, any>,
    trigger?: Notifications.NotificationTriggerInput
  ): Promise<string> {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: trigger || null, // null = immediate
    });

    return notificationId;
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelScheduledNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  /**
   * Get all scheduled notifications
   */
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  }
}

export const notificationService = new NotificationService();