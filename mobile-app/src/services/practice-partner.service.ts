import { apiClient, handleApiError } from './api/client';
import {
  UserAvailability,
  UserAvailabilityCreate,
  UserPracticePreferences,
  UserPracticePreferencesUpdate,
  PracticePartnerMatch,
  PracticePartnerMatchWithUsers,
  PracticePartnerMatchCreate,
  PracticePartnerMatchUpdate,
  CompatiblePartner,
  PartnerSearchFilters,
  CompatibleTimeSlot,
  MatchStatus,
} from '../types/practicePartner';

class PracticePartnerService {
  // User Availability Methods
  /**
   * Get current user's availability schedule
   */
  async getUserAvailability(): Promise<UserAvailability[]> {
    try {
      const response = await apiClient.get<UserAvailability[]>('/practice-partners/availability');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Add a new availability slot
   */
  async addAvailabilitySlot(data: UserAvailabilityCreate): Promise<UserAvailability> {
    try {
      const response = await apiClient.post<UserAvailability>(
        '/practice-partners/availability',
        data
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Delete an availability slot
   */
  async deleteAvailabilitySlot(availabilityId: string): Promise<void> {
    try {
      await apiClient.delete(`/practice-partners/availability/${availabilityId}`);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Practice Preferences Methods
  /**
   * Get current user's practice partner preferences
   */
  async getPracticePreferences(): Promise<UserPracticePreferences> {
    try {
      const response = await apiClient.get<UserPracticePreferences>(
        '/practice-partners/preferences'
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Update practice partner preferences
   */
  async updatePracticePreferences(
    data: UserPracticePreferencesUpdate
  ): Promise<UserPracticePreferences> {
    try {
      const response = await apiClient.put<UserPracticePreferences>(
        '/practice-partners/preferences',
        data
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Partner Discovery Methods
  /**
   * Discover compatible practice partners
   */
  async discoverPartners(
    filters: PartnerSearchFilters,
    skip = 0,
    limit = 20
  ): Promise<CompatiblePartner[]> {
    try {
      const response = await apiClient.post<CompatiblePartner[]>(
        '/practice-partners/discover',
        filters,
        {
          params: { skip, limit }
        }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Practice Partner Matching Methods
  /**
   * Get all practice partner matches
   */
  async getMatches(
    status?: MatchStatus,
    skip = 0,
    limit = 50
  ): Promise<PracticePartnerMatchWithUsers[]> {
    try {
      const response = await apiClient.get<PracticePartnerMatchWithUsers[]>(
        '/practice-partners/matches',
        {
          params: { status, skip, limit }
        }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Send a practice partner request
   */
  async createPartnerRequest(
    data: PracticePartnerMatchCreate
  ): Promise<PracticePartnerMatch> {
    try {
      const response = await apiClient.post<PracticePartnerMatch>(
        '/practice-partners/matches',
        data
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Update a practice partner match (accept/decline/end)
   */
  async updateMatch(
    matchId: string,
    data: PracticePartnerMatchUpdate
  ): Promise<PracticePartnerMatch> {
    try {
      const response = await apiClient.put<PracticePartnerMatch>(
        `/practice-partners/matches/${matchId}`,
        data
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Accept a practice partner request
   */
  async acceptMatch(matchId: string, message?: string): Promise<PracticePartnerMatch> {
    return this.updateMatch(matchId, {
      status: MatchStatus.ACCEPTED,
      partner_message: message
    });
  }

  /**
   * Decline a practice partner request
   */
  async declineMatch(matchId: string, message?: string): Promise<PracticePartnerMatch> {
    return this.updateMatch(matchId, {
      status: MatchStatus.DECLINED,
      partner_message: message
    });
  }

  /**
   * End a practice partnership
   */
  async endMatch(matchId: string): Promise<PracticePartnerMatch> {
    return this.updateMatch(matchId, {
      status: MatchStatus.ENDED
    });
  }

  /**
   * Get compatible practice times between matched partners
   */
  async getCompatibleTimes(matchId: string): Promise<CompatibleTimeSlot[]> {
    try {
      const response = await apiClient.get<CompatibleTimeSlot[]>(
        `/practice-partners/matches/${matchId}/compatible-times`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Helper methods
  /**
   * Get pending partner requests for the current user
   */
  async getPendingRequests(): Promise<PracticePartnerMatchWithUsers[]> {
    return this.getMatches(MatchStatus.PENDING);
  }

  /**
   * Get active partnerships
   */
  async getActivePartnerships(): Promise<PracticePartnerMatchWithUsers[]> {
    return this.getMatches(MatchStatus.ACCEPTED);
  }

  /**
   * Format day of week for display
   */
  formatDayOfWeek(dayNumber: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNumber] || '';
  }

  /**
   * Format time for display (24h to 12h format)
   */
  formatTime(time: string): string {
    try {
      const [hours, minutes] = time.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch {
      return time;
    }
  }
}

export const practicePartnerService = new PracticePartnerService();