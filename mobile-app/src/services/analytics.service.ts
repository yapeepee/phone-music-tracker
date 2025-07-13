import { apiClient, handleApiError } from './api/client';
import {
  AnalysisResult,
  MetricsResponse,
  AnalyticsSummary,
  TrendAnalysis,
  MetricType,
  AnalyticsQueryParams,
} from '../types/analytics';

class AnalyticsService {
  /**
   * Get analysis result for a specific session
   */
  async getSessionAnalytics(sessionId: string): Promise<AnalysisResult> {
    try {
      const response = await apiClient.get<AnalysisResult>(
        `/sessions/${sessionId}/analytics`
      );
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Get time-series metrics for a specific session
   */
  async getSessionMetrics(
    sessionId: string,
    params?: {
      metric_type?: MetricType;
      start_time?: string;
      end_time?: string;
    }
  ): Promise<MetricsResponse> {
    try {
      const response = await apiClient.get<MetricsResponse>(
        `/sessions/${sessionId}/metrics`,
        { params }
      );
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Get analytics summary for the current user
   */
  async getAnalyticsSummary(days: number = 30): Promise<AnalyticsSummary> {
    try {
      const response = await apiClient.get<AnalyticsSummary>(
        '/analytics/summary',
        { params: { days } }
      );
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Get trend analysis for a specific metric
   */
  async getAnalyticsTrends(
    metricType: MetricType,
    days: number = 30
  ): Promise<TrendAnalysis> {
    try {
      const response = await apiClient.get<TrendAnalysis>(
        '/analytics/trends',
        { params: { metric_type: metricType, days } }
      );
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Get multiple metrics trends at once (for dashboard)
   */
  async getDashboardData(days: number = 30): Promise<{
    summary: AnalyticsSummary;
    trends: Record<string, TrendAnalysis>;
  }> {
    try {
      // Fetch summary and key metric trends in parallel
      const [summary, tempoTrend, pitchTrend, dynamicsTrend] = await Promise.all([
        this.getAnalyticsSummary(days),
        this.getAnalyticsTrends(MetricType.TEMPO_BPM, days),
        this.getAnalyticsTrends(MetricType.PITCH_STABILITY, days),
        this.getAnalyticsTrends(MetricType.DYNAMICS_RANGE, days),
      ]);

      return {
        summary,
        trends: {
          tempo: tempoTrend,
          pitch: pitchTrend,
          dynamics: dynamicsTrend,
        },
      };
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Format score for display (0-100 to percentage or grade)
   */
  formatScore(score: number, format: 'percentage' | 'grade' = 'percentage'): string {
    if (format === 'percentage') {
      return `${Math.round(score)}%`;
    }
    
    // Grade format (A+ to F)
    if (score >= 97) return 'A+';
    if (score >= 93) return 'A';
    if (score >= 90) return 'A-';
    if (score >= 87) return 'B+';
    if (score >= 83) return 'B';
    if (score >= 80) return 'B-';
    if (score >= 77) return 'C+';
    if (score >= 73) return 'C';
    if (score >= 70) return 'C-';
    if (score >= 67) return 'D+';
    if (score >= 63) return 'D';
    if (score >= 60) return 'D-';
    return 'F';
  }

  /**
   * Get improvement color based on percentage change
   */
  getImprovementColor(changePercent: number): string {
    if (changePercent > 5) return '#4CAF50'; // Green for significant improvement
    if (changePercent > 0) return '#8BC34A'; // Light green for slight improvement
    if (changePercent === 0) return '#9E9E9E'; // Gray for no change
    if (changePercent > -5) return '#FFC107'; // Amber for slight decline
    return '#F44336'; // Red for significant decline
  }

  /**
   * Format metric name for display
   */
  formatMetricName(metricType: MetricType): string {
    const nameMap: Record<MetricType, string> = {
      [MetricType.TEMPO_BPM]: 'Tempo',
      [MetricType.TEMPO_STABILITY]: 'Tempo Stability',
      [MetricType.BEAT_INTERVAL]: 'Beat Interval',
      [MetricType.PITCH_HZ]: 'Pitch',
      [MetricType.PITCH_STABILITY]: 'Pitch Stability',
      [MetricType.PITCH_CONFIDENCE]: 'Pitch Confidence',
      [MetricType.PITCH_MIDI]: 'Pitch (MIDI)',
      [MetricType.DYNAMICS_RMS]: 'Dynamics (RMS)',
      [MetricType.DYNAMICS_DB]: 'Dynamics (dB)',
      [MetricType.DYNAMICS_RANGE]: 'Dynamic Range',
      [MetricType.DYNAMICS_STABILITY]: 'Dynamics Stability',
      [MetricType.VIBRATO_RATE]: 'Vibrato Rate',
      [MetricType.VIBRATO_EXTENT]: 'Vibrato Extent',
      [MetricType.VIBRATO_CONSISTENCY]: 'Vibrato Consistency',
      [MetricType.NOTE_ONSET]: 'Note Onset',
      [MetricType.ONSET_STRENGTH]: 'Onset Strength',
      [MetricType.TIMING_CONSISTENCY]: 'Timing Consistency',
      [MetricType.OVERALL_CONSISTENCY]: 'Overall Consistency',
      [MetricType.TECHNICAL_PROFICIENCY]: 'Technical Proficiency',
      [MetricType.MUSICAL_EXPRESSION]: 'Musical Expression',
    };

    return nameMap[metricType] || metricType;
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();