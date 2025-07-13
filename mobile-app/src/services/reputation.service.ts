import { apiClient, handleApiError } from './api/client';

export interface UserReputation {
  userId: string;
  fullName: string;
  reputationPoints: number;
  reputationLevel: string;
  createdAt: string;
}

export interface ReputationHistory {
  id: string;
  userId: string;
  reason: string;
  referenceId?: string;
  pointsChange: number;
  totalPoints: number;
  description?: string;
  createdAt: string;
}

export interface ReputationHistoryResponse {
  items: ReputationHistory[];
  total: number;
  page: number;
  pageSize: number;
}

export interface LeaderboardEntry {
  userId: string;
  fullName: string;
  email: string;
  reputationPoints: number;
  reputationLevel: string;
  rank: number;
}

class ReputationService {
  async getUserReputation(userId: string): Promise<UserReputation> {
    try {
      const response = await apiClient.get(
        `/reputation/users/${userId}/reputation`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getReputationHistory(
    userId: string,
    skip = 0,
    limit = 50
  ): Promise<ReputationHistoryResponse> {
    try {
      const response = await apiClient.get(
        `/reputation/users/${userId}/reputation/history`,
        {
          params: { skip, limit }
        }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getLeaderboard(
    skip = 0,
    limit = 20
  ): Promise<LeaderboardEntry[]> {
    try {
      const response = await apiClient.get('/reputation/leaderboard', {
        params: { skip, limit }
      });
      // Backend returns array directly, add rank numbers
      const entries: LeaderboardEntry[] = response.data.map((user: any, index: number) => ({
        userId: user.userId,
        fullName: user.fullName,
        email: user.email || '',
        reputationPoints: user.reputationPoints,
        reputationLevel: user.reputationLevel,
        rank: skip + index + 1
      }));
      return entries;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Helper to get level color
  getLevelColor(level: string | undefined | null): string {
    if (!level) {
      return '#9CA3AF'; // default gray
    }
    switch (level.toLowerCase()) {
      case 'newcomer':
        return '#9CA3AF'; // gray
      case 'contributor':
        return '#10B981'; // green
      case 'intermediate':
        return '#3B82F6'; // blue
      case 'advanced':
        return '#8B5CF6'; // purple
      case 'veteran':
        return '#F59E0B'; // amber
      case 'expert':
        return '#EF4444'; // red
      default:
        return '#9CA3AF';
    }
  }

  // Helper to get level icon name
  getLevelIcon(level: string | undefined | null): string {
    if (!level) {
      return 'account-circle-outline'; // default icon
    }
    switch (level.toLowerCase()) {
      case 'newcomer':
        return 'account-circle-outline';
      case 'contributor':
        return 'account-circle';
      case 'intermediate':
        return 'star-outline';
      case 'advanced':
        return 'star';
      case 'veteran':
        return 'medal-outline';
      case 'expert':
        return 'medal';
      default:
        return 'account-circle-outline';
    }
  }

  // Helper to format reputation points
  formatPoints(points: number | undefined | null): string {
    if (points === undefined || points === null) {
      return '0';
    }
    if (points >= 10000) {
      return `${(points / 1000).toFixed(1)}k`;
    }
    return points.toString();
  }
}

export const reputationService = new ReputationService();