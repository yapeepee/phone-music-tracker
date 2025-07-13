import { apiClient, handleApiError } from './api/client';
import { 
  Tag,
  PracticeSegment, 
  PieceProgress,
  SegmentClick,
  CreatePracticeSegmentInput,
  UpdatePracticeSegmentInput,
  SegmentClickInput,
  PieceArchiveSummary,
  ArchivedPieceInfo
} from '../types/practice';

export interface PieceWithSegmentInfo {
  piece: Tag;
  totalSegments: number;      // was total_segments from API
  completedSegments: number;  // was completed_segments from API
  totalClicks: number;        // was total_clicks from API
}

class PracticeSegmentService {
  /**
   * Get all musical pieces the student is working on
   */
  async getStudentPieces(
    include_completed: boolean = true,
    include_archived: boolean = false
  ): Promise<PieceWithSegmentInfo[]> {
    try {
      const response = await apiClient.get<PieceWithSegmentInfo[]>('/practice-segments/pieces', {
        params: { include_completed, include_archived }
      });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Get all practice segments for a specific piece
   */
  async getPieceSegments(pieceTagId: string): Promise<PracticeSegment[]> {
    try {
      const response = await apiClient.get<PracticeSegment[]>(
        `/practice-segments/pieces/${pieceTagId}/segments`
      );
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Create a new practice segment for a piece
   */
  async createSegment(segmentData: CreatePracticeSegmentInput): Promise<PracticeSegment> {
    try {
      const response = await apiClient.post<PracticeSegment>(
        '/practice-segments/segments',
        segmentData
      );
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Update a practice segment
   */
  async updateSegment(
    segmentId: string, 
    updates: UpdatePracticeSegmentInput
  ): Promise<PracticeSegment> {
    try {
      const response = await apiClient.put<PracticeSegment>(
        `/practice-segments/segments/${segmentId}`,
        updates
      );
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Delete a practice segment
   */
  async deleteSegment(segmentId: string): Promise<void> {
    try {
      await apiClient.delete(`/practice-segments/segments/${segmentId}`);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Record a click on a practice segment
   */
  async recordSegmentClick(clickData: SegmentClickInput): Promise<SegmentClick> {
    try {
      const response = await apiClient.post<SegmentClick>(
        '/practice-segments/segments/click',
        clickData
      );
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Get detailed progress for a musical piece
   */
  async getPieceProgress(pieceTagId: string): Promise<PieceProgress> {
    try {
      const response = await apiClient.get<PieceProgress>(
        `/practice-segments/pieces/${pieceTagId}/progress`
      );
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Get detailed analytics for a practice segment
   */
  async getSegmentAnalytics(segmentId: string): Promise<any> {
    try {
      const response = await apiClient.get<any>(
        `/practice-segments/segments/${segmentId}/analytics`
      );
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Archive a musical piece and get summary statistics
   */
  async archivePiece(pieceId: string): Promise<PieceArchiveSummary> {
    try {
      const response = await apiClient.post<PieceArchiveSummary>(
        `/practice-segments/pieces/${pieceId}/archive`
      );
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Unarchive a musical piece
   */
  async unarchivePiece(pieceId: string): Promise<void> {
    try {
      await apiClient.post(`/practice-segments/pieces/${pieceId}/unarchive`);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Get all archived pieces with summaries
   */
  async getArchivedPieces(): Promise<ArchivedPieceInfo[]> {
    try {
      const response = await apiClient.get<ArchivedPieceInfo[]>(
        '/practice-segments/pieces/archived'
      );
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Get full details of an archived piece including all segments
   */
  async getArchivedPieceDetails(pieceId: string): Promise<PieceArchiveSummary> {
    try {
      const response = await apiClient.get<PieceArchiveSummary>(
        `/practice-segments/pieces/${pieceId}/archived-details`
      );
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Get overall practice focus analytics
   */
  async getPracticeFocusAnalytics(days: number = 30): Promise<PracticeFocusAnalytics> {
    try {
      const response = await apiClient.get<PracticeFocusAnalytics>(
        '/practice-segments/analytics/overview',
        { params: { days } }
      );
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }
}

export interface PracticeFocusAnalytics {
  periodDays: number;
  statistics: {
    totalSegments: number;
    completedSegments: number;
    activeSegments: number;
    totalClicksPeriod: number;
    practiceDays: number;
    consistencyPercentage: number;
    avgClicksPerDay: number;
    avgSegmentsPerDay: number;
  };
  topPracticedSegments: Array<{
    segmentId: string;
    segmentName: string;
    pieceName: string;
    totalClicks: number;
    recentClicks: number;
    daysPracticed: number;
    isCompleted: boolean;
    lastClicked: string | null;
  }>;
  needsAttention: Array<{
    segmentId: string;
    segmentName: string;
    pieceName: string;
    totalClicks: number;
    recentClicks: number;
    daysPracticed: number;
    isCompleted: boolean;
    createdDaysAgo: number;
  }>;
  dailyActivity: Array<{
    date: string;
    clicks: number;
    segmentsPracticed: number;
  }>;
  allSegments: Array<{
    segmentId: string;
    segmentName: string;
    pieceName: string;
    composer?: string;
    totalClicks: number;
    recentClicks: number;
    daysPracticed: number;
    isCompleted: boolean;
    pieceArchived: boolean;
    lastClicked: string | null;
  }>;
}

export const practiceSegmentService = new PracticeSegmentService();