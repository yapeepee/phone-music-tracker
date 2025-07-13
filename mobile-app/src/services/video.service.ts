import * as FileSystem from 'expo-file-system';
import { Camera, CameraType } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { Platform } from 'react-native';

export interface VideoMetadata {
  uri: string;
  duration: number; // in seconds
  size: number; // in bytes
  width: number;
  height: number;
  timestamp: string;
  thumbnailUri?: string;
  fileName?: string;
}

export interface VideoRecordingOptions {
  maxDuration: number; // in seconds (30s to 300s)
  quality?: 'low' | 'medium' | 'high';
  maxFileSize?: number; // in MB
}

class VideoService {
  private readonly VIDEO_DIR = `${FileSystem.documentDirectory}videos/`;
  private readonly THUMBNAIL_DIR = `${FileSystem.documentDirectory}thumbnails/`;
  private readonly MAX_DURATION = 300; // 5 minutes
  private readonly MIN_DURATION = 30; // 30 seconds
  private readonly MAX_FILE_SIZE_MB = 100; // 100MB max

  constructor() {
    this.ensureDirectoriesExist();
  }

  private async ensureDirectoriesExist() {
    try {
      const videoDirInfo = await FileSystem.getInfoAsync(this.VIDEO_DIR);
      if (!videoDirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.VIDEO_DIR, { intermediates: true });
      }

      const thumbnailDirInfo = await FileSystem.getInfoAsync(this.THUMBNAIL_DIR);
      if (!thumbnailDirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.THUMBNAIL_DIR, { intermediates: true });
      }
    } catch (error) {
      console.error('Error creating directories:', error);
    }
  }

  async requestCameraPermissions(): Promise<boolean> {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting camera permissions:', error);
      return false;
    }
  }

  async requestMicrophonePermissions(): Promise<boolean> {
    try {
      const { status } = await Camera.requestMicrophonePermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting microphone permissions:', error);
      return false;
    }
  }

  async requestMediaLibraryPermissions(): Promise<boolean> {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting media library permissions:', error);
      return false;
    }
  }

  async requestAllPermissions(): Promise<{
    camera: boolean;
    microphone: boolean;
    mediaLibrary: boolean;
  }> {
    const [camera, microphone, mediaLibrary] = await Promise.all([
      this.requestCameraPermissions(),
      this.requestMicrophonePermissions(),
      this.requestMediaLibraryPermissions(),
    ]);

    return { camera, microphone, mediaLibrary };
  }

  validateRecordingOptions(options: VideoRecordingOptions): VideoRecordingOptions {
    return {
      maxDuration: Math.min(
        Math.max(options.maxDuration, this.MIN_DURATION),
        this.MAX_DURATION
      ),
      quality: options.quality || 'medium',
      maxFileSize: options.maxFileSize || this.MAX_FILE_SIZE_MB,
    };
  }

  generateVideoFileName(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `practice_video_${timestamp}.mp4`;
  }

  generateThumbnailFileName(videoFileName: string): string {
    return videoFileName.replace('.mp4', '_thumb.jpg');
  }

  async saveVideo(tempUri: string, sessionId: string): Promise<VideoMetadata> {
    try {
      const fileName = this.generateVideoFileName();
      const destinationUri = `${this.VIDEO_DIR}${sessionId}_${fileName}`;

      // Move video from temp location to app storage
      await FileSystem.moveAsync({
        from: tempUri,
        to: destinationUri,
      });

      // Get video info
      const fileInfo = await FileSystem.getInfoAsync(destinationUri);
      if (!fileInfo.exists) {
        throw new Error('Video file not found after saving');
      }

      // Create metadata
      const metadata: VideoMetadata = {
        uri: destinationUri,
        duration: 0, // Will be updated when we implement duration extraction
        size: fileInfo.size || 0,
        width: 0, // Will be updated when we implement video info extraction
        height: 0,
        timestamp: new Date().toISOString(),
        fileName: `${sessionId}_${fileName}`,
      };

      return metadata;
    } catch (error) {
      console.error('Error saving video:', error);
      throw new Error('Failed to save video');
    }
  }

  async deleteVideo(uri: string): Promise<boolean> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(uri);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting video:', error);
      return false;
    }
  }

  async getVideoSize(uri: string): Promise<number> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      return fileInfo.exists ? fileInfo.size || 0 : 0;
    } catch (error) {
      console.error('Error getting video size:', error);
      return 0;
    }
  }

  async getAllVideos(): Promise<VideoMetadata[]> {
    try {
      const files = await FileSystem.readDirectoryAsync(this.VIDEO_DIR);
      const videos: VideoMetadata[] = [];

      for (const file of files) {
        if (file.endsWith('.mp4')) {
          const uri = `${this.VIDEO_DIR}${file}`;
          const fileInfo = await FileSystem.getInfoAsync(uri);
          
          if (fileInfo.exists) {
            videos.push({
              uri,
              duration: 0,
              size: fileInfo.size || 0,
              width: 0,
              height: 0,
              timestamp: new Date(fileInfo.modificationTime! * 1000).toISOString(),
            });
          }
        }
      }

      return videos;
    } catch (error) {
      console.error('Error getting videos:', error);
      return [];
    }
  }

  async getVideosBySessionId(sessionId: string): Promise<VideoMetadata[]> {
    try {
      const allVideos = await this.getAllVideos();
      return allVideos.filter(video => video.uri.includes(sessionId));
    } catch (error) {
      console.error('Error getting videos by session:', error);
      return [];
    }
  }

  async cleanupOldVideos(daysToKeep: number = 30): Promise<number> {
    try {
      const files = await FileSystem.readDirectoryAsync(this.VIDEO_DIR);
      const now = Date.now();
      const cutoffTime = now - (daysToKeep * 24 * 60 * 60 * 1000);
      let deletedCount = 0;

      for (const file of files) {
        const uri = `${this.VIDEO_DIR}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(uri);
        
        if (fileInfo.exists && fileInfo.modificationTime) {
          const fileTime = fileInfo.modificationTime * 1000;
          if (fileTime < cutoffTime) {
            await FileSystem.deleteAsync(uri);
            deletedCount++;
          }
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up videos:', error);
      return 0;
    }
  }

  async getTotalStorageUsed(): Promise<number> {
    try {
      const videos = await this.getAllVideos();
      return videos.reduce((total, video) => total + video.size, 0);
    } catch (error) {
      console.error('Error calculating storage:', error);
      return 0;
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  async getVideoFileInfo(uri: string): Promise<{
    exists: boolean;
    size: number;
    modificationTime?: number;
    fileName: string;
  }> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      const fileName = uri.split('/').pop() || 'unknown_video.mp4';
      
      return {
        exists: fileInfo.exists,
        size: fileInfo.exists ? fileInfo.size || 0 : 0,
        modificationTime: fileInfo.modificationTime,
        fileName,
      };
    } catch (error) {
      console.error('Error getting video file info:', error);
      return {
        exists: false,
        size: 0,
        fileName: 'unknown_video.mp4',
      };
    }
  }
}

export const videoService = new VideoService();