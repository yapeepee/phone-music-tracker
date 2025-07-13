/**
 * Analytics types for practice session metrics and analysis
 */

// Metric types matching backend enum
export enum MetricType {
  // Tempo metrics
  TEMPO_BPM = 'tempo_bpm',
  TEMPO_STABILITY = 'tempo_stability',
  BEAT_INTERVAL = 'beat_interval',
  
  // Pitch metrics
  PITCH_HZ = 'pitch_hz',
  PITCH_STABILITY = 'pitch_stability',
  PITCH_CONFIDENCE = 'pitch_confidence',
  PITCH_MIDI = 'pitch_midi',
  
  // Dynamics metrics
  DYNAMICS_RMS = 'dynamics_rms',
  DYNAMICS_DB = 'dynamics_db',
  DYNAMICS_RANGE = 'dynamics_range',
  DYNAMICS_STABILITY = 'dynamics_stability',
  
  // Vibrato metrics
  VIBRATO_RATE = 'vibrato_rate',
  VIBRATO_EXTENT = 'vibrato_extent',
  VIBRATO_CONSISTENCY = 'vibrato_consistency',
  
  // Note onset metrics
  NOTE_ONSET = 'note_onset',
  ONSET_STRENGTH = 'onset_strength',
  TIMING_CONSISTENCY = 'timing_consistency',
  
  // Overall scores
  OVERALL_CONSISTENCY = 'overall_consistency',
  TECHNICAL_PROFICIENCY = 'technical_proficiency',
  MUSICAL_EXPRESSION = 'musical_expression',
}

// Single metric data point
export interface MetricDataPoint {
  time: string; // ISO datetime
  value: number;
  confidence?: number; // 0.0 to 1.0
  extra_data?: Record<string, any>;
}

// Analysis result for a session
export interface AnalysisResult {
  id: string;
  session_id: string;
  analyzed_at: string;
  analysis_version: string;
  
  // Overall scores (0-100)
  overall_consistency_score: number;
  tempo_score: number;
  pitch_score: number;
  dynamics_score: number;
  vibrato_score: number;
  technical_proficiency_score: number;
  musical_expression_score: number;
  
  // Summary statistics
  average_tempo_bpm?: number;
  tempo_stability?: number;
  pitch_range_min_hz?: number;
  pitch_range_max_hz?: number;
  pitch_stability?: number;
  dynamic_range_db?: number;
  dynamics_stability?: number;
  vibrato_rate_hz?: number;
  vibrato_extent_percent?: number;
  note_onset_count?: number;
  timing_consistency?: number;
  
  // Full analysis data
  full_analysis_data?: Record<string, any>;
  
  // Processing metadata
  processing_time_seconds?: number;
  error_message?: string;
}

// Metrics response for time-series data
export interface MetricsResponse {
  session_id: string;
  metrics: Record<string, MetricDataPoint[]>; // Grouped by metric type
  total_points: number;
}

// Analytics summary over time period
export interface AnalyticsSummary {
  total_sessions: number;
  average_scores: Record<string, number>;
  improvement_percentages: Record<string, number>;
  total_practice_minutes: number;
  days_practiced: number;
}

// Trend analysis for a metric
export interface TrendAnalysis {
  metric_type: MetricType;
  daily_averages: Array<{
    date: string;
    value: number;
    sample_count: number;
  }>;
  weekly_averages: Array<{
    week_start: string;
    value: number;
    sample_count: number;
  }>;
  trend_direction: 'improving' | 'declining' | 'stable' | 'neutral' | 'insufficient_data';
  trend_strength: number; // Percentage change per day
}

// Query parameters for analytics endpoints
export interface AnalyticsQueryParams {
  days?: number;
  metric_type?: MetricType;
  start_time?: string;
  end_time?: string;
}

// Chart data format for Victory Native
export interface ChartDataPoint {
  x: Date | string | number;
  y: number;
  label?: string;
}

// Score comparison data
export interface ScoreComparison {
  metric: string;
  current: number;
  previous: number;
  change: number;
  changePercent: number;
}