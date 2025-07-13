import { BaseService } from './base.service';

export interface VideoResponse {
  id: string;
  sessionId: string;          // Changed from session_id
  s3Key: string;              // Changed from s3_key
  thumbnailS3Key?: string;    // Changed from thumbnail_s3_key
  durationSeconds: number;    // Changed from duration_seconds
  fileSizeBytes: number;      // Changed from file_size_bytes
  processed: boolean;
  processingError?: string;   // Changed from processing_error
  createdAt: string;          // Changed from created_at
  updatedAt: string;          // Changed from updated_at
}

export interface VideoWithUrl extends VideoResponse {
  url: string;
  thumbnailUrl?: string;      // Changed from thumbnail_url
}

class VideoApiService extends BaseService {
  constructor() {
    super('/videos');
  }

  /**
   * Get all videos for a session
   */
  async getSessionVideos(sessionId: string): Promise<VideoResponse[]> {
    return this.get<VideoResponse[]>(`/session/${sessionId}`);
  }

  /**
   * Get a video with presigned URL
   */
  async getVideoWithUrl(videoId: string): Promise<VideoWithUrl> {
    return this.get<VideoWithUrl>(`/${videoId}`);
  }

  /**
   * Delete a video
   */
  async deleteVideo(videoId: string): Promise<void> {
    return this.delete(`/${videoId}`);
  }
}

export const videoApiService = new VideoApiService();
export default videoApiService;