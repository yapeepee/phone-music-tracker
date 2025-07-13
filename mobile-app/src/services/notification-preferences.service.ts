import { apiClient } from './api/client';

export interface NotificationTypes {
  practiceReminders: boolean;
  sessionFeedback: boolean;
  videoProcessing: boolean;
  achievements: boolean;
  eventReminders: boolean;
  systemAnnouncements: boolean;
}

export interface QuietHours {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

export interface NotificationPreferences {
  globalEnabled: boolean;
  types: NotificationTypes;
  quietHours: QuietHours;
}

class NotificationPreferencesService {
  private readonly baseUrl = '/notification-preferences';

  async getPreferences(): Promise<NotificationPreferences> {
    const response = await apiClient.get<NotificationPreferences>(this.baseUrl);
    return response.data;
  }

  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const response = await apiClient.put<NotificationPreferences>(
      this.baseUrl,
      preferences
    );
    return response.data;
  }

  async resetPreferences(): Promise<NotificationPreferences> {
    const response = await apiClient.post<NotificationPreferences>(
      `${this.baseUrl}/reset`
    );
    return response.data;
  }
}

export const notificationPreferencesService = new NotificationPreferencesService();