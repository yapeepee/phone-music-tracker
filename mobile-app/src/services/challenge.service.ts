import { apiClient, handleApiError } from './api/client';

// Enums
export enum ChallengeType {
  STREAK = 'STREAK',
  TOTAL_SESSIONS = 'TOTAL_SESSIONS',
  SCORE_THRESHOLD = 'SCORE_THRESHOLD',
  DURATION = 'DURATION',
  FOCUS_SPECIFIC = 'FOCUS_SPECIFIC',
  TIME_OF_DAY = 'TIME_OF_DAY',
  WEEKLY_GOAL = 'WEEKLY_GOAL'
}

export enum ChallengeStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED'
}

export enum AchievementTier {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM'
}

// Types
export interface Achievement {
  id: string;
  name: string;
  description: string;
  tier: AchievementTier;
  icon: string;
  badgeImageUrl?: string;      // was badge_image_url
  totalEarned: number;         // was total_earned
  createdAt: string;           // was created_at
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  type: ChallengeType;
  targetValue: number;           // was target_value
  targetMetric?: string;         // was target_metric
  targetFocus?: string;          // was target_focus
  reputationReward: number;      // was reputation_reward
  achievementId?: string;        // was achievement_id
  icon: string;
  color: string;
  orderIndex: number;            // was order_index
  isActive: boolean;             // was is_active
  startDate?: string;            // was start_date
  endDate?: string;              // was end_date
  isRepeatable: boolean;         // was is_repeatable
  cooldownDays?: number;         // was cooldown_days
  createdAt: string;             // was created_at
  updatedAt: string;             // was updated_at
  achievement?: Achievement;
}

export interface ChallengeWithProgress extends Challenge {
  userStatus?: ChallengeStatus;          // was user_status
  userProgress?: number;                 // was user_progress
  userProgressPercentage?: number;       // was user_progress_percentage
  canStart: boolean;                     // was can_start
  cooldownRemainingDays?: number;        // was cooldown_remaining_days
}

export interface UserChallenge {
  id: string;
  userId: string;                      // was user_id
  challengeId: string;                 // was challenge_id
  status: ChallengeStatus;
  currentValue: number;                // was current_value
  progressData?: Record<string, any>;  // was progress_data
  startedAt?: string;                  // was started_at
  completedAt?: string;                // was completed_at
  expiresAt?: string;                  // was expires_at
  challenge: Challenge;
  progressPercentage: number;          // was progress_percentage
}

export interface UserAchievement {
  id: string;
  userId: string;                        // was user_id
  achievementId: string;                 // was achievement_id
  earnedFromChallengeId?: string;        // was earned_from_challenge_id
  earnedAt: string;                      // was earned_at
  achievement: Achievement;
}

export interface ChallengeListResponse {
  items: ChallengeWithProgress[];
  total: number;
  page: number;
  page_size: number;
}

export interface AchievementListResponse {
  items: Achievement[];
  total: number;
}

export interface UserAchievementListResponse {
  items: UserAchievement[];
  total: number;
  total_points_earned: number;
}

export interface StartChallengeRequest {
  challenge_id: string;
}

class ChallengeService {
  async getChallenges(
    skip = 0,
    limit = 20,
    onlyActive = true
  ): Promise<ChallengeListResponse> {
    try {
      const response = await apiClient.get('/challenges/', {
        params: { skip, limit, only_active: onlyActive }
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getChallenge(challengeId: string): Promise<ChallengeWithProgress> {
    try {
      const response = await apiClient.get(`/challenges/${challengeId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async startChallenge(challengeId: string): Promise<UserChallenge> {
    try {
      const response = await apiClient.post('/challenges/start', {
        challenge_id: challengeId
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getActiveChallenges(): Promise<UserChallenge[]> {
    try {
      const response = await apiClient.get('/challenges/user/active');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getCompletedChallenges(
    skip = 0,
    limit = 20
  ): Promise<UserChallenge[]> {
    try {
      const response = await apiClient.get('/challenges/user/completed', {
        params: { skip, limit }
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getAllAchievements(): Promise<AchievementListResponse> {
    try {
      const response = await apiClient.get('/challenges/achievements/all');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getUserAchievements(): Promise<UserAchievementListResponse> {
    try {
      const response = await apiClient.get('/challenges/achievements/earned');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getUserAchievementsByUserId(
    userId: string
  ): Promise<UserAchievementListResponse> {
    try {
      const response = await apiClient.get(
        `/challenges/achievements/${userId}`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Helper methods
  getChallengeIcon(type: ChallengeType): string {
    switch (type) {
      case ChallengeType.STREAK:
        return 'fire';
      case ChallengeType.TOTAL_SESSIONS:
        return 'counter';
      case ChallengeType.SCORE_THRESHOLD:
        return 'trophy';
      case ChallengeType.DURATION:
        return 'timer';
      case ChallengeType.FOCUS_SPECIFIC:
        return 'target';
      case ChallengeType.TIME_OF_DAY:
        return 'clock-outline';
      case ChallengeType.WEEKLY_GOAL:
        return 'calendar-week';
      default:
        return 'trophy';
    }
  }

  getAchievementColor(tier: AchievementTier): string {
    switch (tier) {
      case AchievementTier.BRONZE:
        return '#CD7F32'; // Bronze
      case AchievementTier.SILVER:
        return '#C0C0C0'; // Silver
      case AchievementTier.GOLD:
        return '#FFD700'; // Gold
      case AchievementTier.PLATINUM:
        return '#E5E4E2'; // Platinum
      default:
        return '#CD7F32';
    }
  }

  formatProgress(current: number, target: number): string {
    const percentage = Math.min((current / target) * 100, 100);
    return `${current}/${target} (${percentage.toFixed(0)}%)`;
  }

  getChallengeStatusColor(status: ChallengeStatus): string {
    switch (status) {
      case ChallengeStatus.NOT_STARTED:
        return '#9CA3AF'; // Gray
      case ChallengeStatus.IN_PROGRESS:
        return '#3B82F6'; // Blue
      case ChallengeStatus.COMPLETED:
        return '#10B981'; // Green
      case ChallengeStatus.EXPIRED:
        return '#EF4444'; // Red
      default:
        return '#9CA3AF';
    }
  }
}

export const challengeService = new ChallengeService();