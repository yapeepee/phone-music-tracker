import { BaseService } from './base.service';
import { Tag } from '../types/practice';

export interface TagCreate {
  name: string;
  color: string;
  tagType?: string; // 'piece', 'technique', 'general' - Changed from tag_type
  composer?: string;
  opusNumber?: string; // Changed from opus_number
  difficultyLevel?: number; // 1-10 - Changed from difficulty_level
  estimatedMasterySessions?: number; // Changed from estimated_mastery_sessions
}

export interface TagUpdate {
  name?: string;
  color?: string;
  tagType?: string; // Changed from tag_type
  composer?: string;
  opusNumber?: string; // Changed from opus_number
  difficultyLevel?: number; // Changed from difficulty_level
  estimatedMasterySessions?: number; // Changed from estimated_mastery_sessions
}

export interface PopularTag {
  tag: Tag;
  usageCount: number; // Changed from usage_count
}

class TagService extends BaseService {
  constructor() {
    super('/tags');
  }

  /**
   * Get all tags accessible to the current user
   */
  async getTags(params?: { skip?: number; limit?: number }): Promise<Tag[]> {
    return this.get<Tag[]>('/', { params });
  }

  /**
   * Get popular tags with usage count
   */
  async getPopularTags(limit: number = 10): Promise<PopularTag[]> {
    return this.get<PopularTag[]>('/popular', { params: { limit } });
  }

  /**
   * Get a specific tag by ID
   */
  async getTag(tagId: string): Promise<Tag> {
    return this.get<Tag>(`/${tagId}`);
  }

  /**
   * Create a new tag (teachers only)
   */
  async createTag(tag: TagCreate): Promise<Tag> {
    return this.post<Tag>('/', tag);
  }

  /**
   * Update a tag (owner teachers only)
   */
  async updateTag(tagId: string, updates: TagUpdate): Promise<Tag> {
    return this.put<Tag>(`/${tagId}`, updates);
  }

  /**
   * Delete a tag (owner teachers only)
   */
  async deleteTag(tagId: string): Promise<void> {
    return this.delete(`/${tagId}`);
  }

  /**
   * Get usage count for a tag
   */
  async getTagUsageCount(tagId: string): Promise<{ tagId: string; usageCount: number }> {
    return this.get<{ tagId: string; usageCount: number }>(`/${tagId}/usage-count`);
  }

  /**
   * Get all piece-type tags (musical pieces)
   */
  async getPieceTags(params?: { skip?: number; limit?: number }): Promise<Tag[]> {
    try {
      // First try the pieces endpoint
      return await this.get<Tag[]>('/pieces', { params });
    } catch (pieceError) {
      console.warn('Failed to use /tags/pieces endpoint, falling back to filtering:', pieceError);
      // Fallback to original implementation
      const allTags = await this.getTags(params);
      return allTags.filter(tag => tag.tagType === 'piece');
    }
  }
}

export const tagService = new TagService();