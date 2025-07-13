import { apiClient } from './api/client';
import { Tag } from '../types/practice';

// These interfaces should match the transformed (camelCase) data
// The API transformer will convert between snake_case and camelCase
export interface CurrentPiece {
  pieceId: string;         // Will be piece_id in backend
  startedAt: string;       // Will be started_at in backend
  notes?: string;
  priority: number;
  lastPracticedAt?: string;     // Will be last_practiced_at in backend
  practiceSessionCount: number;  // Will be practice_session_count in backend
  createdAt: string;       // Will be created_at in backend
  updatedAt: string;       // Will be updated_at in backend
}

export interface CurrentPieceWithDetails extends CurrentPiece {
  piece: Tag;
}

export interface CurrentPieceAdd {
  notes?: string;
  priority?: number;
}

export interface CurrentPieceUpdate {
  notes?: string;
  priority?: number;
}

export interface CurrentPiecesSummary {
  totalCurrentPieces: number;
  piecesByPriority: Record<number, string[]>;
  lastUpdated: string;
}

class CurrentPiecesService {
  /**
   * Get all current pieces for the authenticated user
   */
  async getCurrentPieces(skip = 0, limit = 100): Promise<CurrentPieceWithDetails[]> {
    const response = await apiClient.get<CurrentPieceWithDetails[]>('/current-pieces/', {
      params: { skip, limit }
    });
    return response.data;
  }

  /**
   * Add a piece to current pieces list
   */
  async addCurrentPiece(pieceId: string, data: CurrentPieceAdd = {}): Promise<CurrentPieceWithDetails> {
    const response = await apiClient.post<CurrentPieceWithDetails>(
      `/current-pieces/${pieceId}`,
      data
    );
    return response.data;
  }

  /**
   * Update notes or priority for a current piece
   */
  async updateCurrentPiece(pieceId: string, data: CurrentPieceUpdate): Promise<CurrentPieceWithDetails> {
    const response = await apiClient.put<CurrentPieceWithDetails>(
      `/current-pieces/${pieceId}`,
      data
    );
    return response.data;
  }

  /**
   * Remove a piece from current pieces list
   */
  async removeCurrentPiece(pieceId: string): Promise<void> {
    await apiClient.delete(`/current-pieces/${pieceId}`);
  }

  /**
   * Get summary statistics for current pieces
   */
  async getCurrentPiecesSummary(): Promise<CurrentPiecesSummary> {
    const response = await apiClient.get<CurrentPiecesSummary>('/current-pieces/stats/summary');
    return response.data;
  }

  /**
   * Check if a piece is in current pieces list
   */
  async isCurrentPiece(pieceId: string): Promise<boolean> {
    try {
      const currentPieces = await this.getCurrentPieces();
      return currentPieces.some(cp => cp.pieceId === pieceId);
    } catch (error) {
      console.error('Error checking current piece status:', error);
      return false;
    }
  }

  /**
   * Get user counts for all pieces
   */
  async getPieceUserCounts(): Promise<Record<string, number>> {
    const response = await apiClient.get<Record<string, number>>('/current-pieces/piece-user-counts');
    return response.data;
  }
}

export const currentPiecesService = new CurrentPiecesService();