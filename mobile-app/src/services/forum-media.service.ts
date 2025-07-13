import { apiClient } from './api/client';
import * as SecureStore from 'expo-secure-store';

export interface ForumMediaUploadResponse {
  media_id: string;
  url: string;
  media_type: 'image' | 'video';
  file_size: number;
  width?: number;
  height?: number;
  duration?: number;
}

export interface ForumMedia {
  id: string;
  media_type: 'image' | 'video';
  url: string;
  thumbnail_url?: string;
  original_filename: string;
  width?: number;
  height?: number;
  duration_seconds?: number;
}

class ForumMediaService {
  /**
   * Upload media file for a post or comment
   */
  async uploadMedia(
    entityType: 'post' | 'comment',
    entityId: string,
    fileUri: string,
    mimeType: string
  ): Promise<ForumMediaUploadResponse> {
    try {
      // Create form data
      const formData = new FormData();
      
      // Add file to form data
      formData.append('file', {
        uri: fileUri,
        type: mimeType,
        name: fileUri.split('/').pop() || 'media',
      } as any);

      // Get access token from SecureStore
      const accessToken = await SecureStore.getItemAsync('access_token');
      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      // Upload using fetch API for multipart
      const response = await fetch(
        `${apiClient.defaults.baseURL}/forum/media/upload/${entityType}/${entityId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Upload failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Forum media upload error:', error);
      throw error;
    }
  }

  /**
   * Get all media files for a post
   */
  async getPostMedia(postId: string): Promise<ForumMedia[]> {
    const response = await apiClient.get<ForumMedia[]>(`/forum/media/post/${postId}`);
    return response.data;
  }

  /**
   * Get all media files for a comment
   */
  async getCommentMedia(commentId: string): Promise<ForumMedia[]> {
    const response = await apiClient.get<ForumMedia[]>(`/forum/media/comment/${commentId}`);
    return response.data;
  }

  /**
   * Delete a media file
   */
  async deleteMedia(mediaId: string): Promise<void> {
    await apiClient.delete(`/forum/media/${mediaId}`);
  }

  /**
   * Generate markdown for media
   */
  generateMediaMarkdown(media: ForumMediaUploadResponse): string {
    if (media.media_type === 'image') {
      return `![Image](${media.url})`;
    } else {
      return `[video](${media.url})`;
    }
  }
}

export const forumMediaService = new ForumMediaService();