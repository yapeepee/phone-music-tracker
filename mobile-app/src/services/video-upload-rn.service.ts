import * as tus from 'tus-js-client';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export interface UploadOptions {
  id: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  metadata?: Record<string, string>;
  onProgress?: (progress: number, bytesUploaded: number, bytesTotal: number) => void;
  onSuccess?: (uploadUrl: string) => void;
  onError?: (error: Error) => void;
  onPause?: () => void;
  onResume?: () => void;
}

export interface UploadTask {
  id: string;
  upload: tus.Upload | null;
  status: 'queued' | 'uploading' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  bytesUploaded: number;
  bytesTotal: number;
  speed: number;
  error?: Error;
  uploadUrl?: string;
  retryCount: number;
  maxRetries: number;
  lastProgressTime?: number;
}

class VideoUploadService {
  private uploads: Map<string, UploadTask> = new Map();
  private uploadQueue: string[] = [];
  private maxConcurrentUploads = 2;
  private activeUploads = 0;
  private authToken: string | null = null;
  private uploadEndpoint: string;
  private chunkSize = 1024 * 1024 * 5; // 5MB chunks
  private retryDelays = [0, 1000, 5000, 10000, 30000]; // Retry delays in ms

  constructor(uploadEndpoint: string) {
    this.uploadEndpoint = uploadEndpoint;
  }

  private initNetworkListener() {
    this.unsubscribeNetInfo = NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      if (wasOffline && this.isOnline) {
        // Resume uploads when coming back online
        this.resumeAllPausedUploads();
      } else if (!this.isOnline) {
        // Pause all active uploads when going offline
        this.pauseAllActiveUploads();
      }
    });
  }

  setAuthToken(token: string) {
    this.authToken = token;
  }

  async createUpload(options: UploadOptions): Promise<string> {
    const task: UploadTask = {
      id: options.id,
      upload: null,
      status: 'queued',
      progress: 0,
      bytesUploaded: 0,
      bytesTotal: options.fileSize,
      speed: 0,
      retryCount: 0,
      maxRetries: 5,
    };

    this.uploads.set(options.id, task);
    this.uploadQueue.push(options.id);

    // Create TUS upload instance
    const upload = await this.createTusUpload(options, task);
    task.upload = upload;

    // Process queue
    this.processQueue();

    return options.id;
  }

  private async createTusUpload(options: UploadOptions, task: UploadTask): Promise<tus.Upload> {
    // For React Native, we'll use a custom approach
    const fileStream = {
      // TUS expects these properties
      size: options.fileSize,
      slice: async (start: number, end: number) => {
        // Read chunk as base64
        const chunk = await FileSystem.readAsStringAsync(options.filePath, {
          encoding: FileSystem.EncodingType.Base64,
          position: start,
          length: end - start,
        });
        
        // Convert base64 to blob-like object
        return {
          // Minimal blob interface that tus-js-client expects
          size: end - start,
          arrayBuffer: async () => {
            // Decode base64 to ArrayBuffer
            const binaryString = atob(chunk);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes.buffer;
          },
          slice: () => ({ size: 0, arrayBuffer: async () => new ArrayBuffer(0) }),
        };
      },
    };

    const upload = new tus.Upload(fileStream as any, {
      endpoint: this.uploadEndpoint,
      retryDelays: this.retryDelays,
      chunkSize: this.chunkSize,
      metadata: {
        filename: options.fileName,
        filetype: 'video/mp4',
        ...options.metadata,
      },
      headers: {
        Authorization: `Bearer ${this.authToken}`,
      },
      onError: (error: Error) => {
        console.error('Upload error:', error);
        task.error = error;
        task.status = 'failed';
        this.activeUploads--;

        // Handle retry logic
        if (task.retryCount < task.maxRetries) {
          task.retryCount++;
          setTimeout(() => {
            if (task.status === 'failed') {
              this.retryUpload(options.id);
            }
          }, this.retryDelays[Math.min(task.retryCount, this.retryDelays.length - 1)]);
        } else {
          options.onError?.(error);
        }

        this.processQueue();
      },
      onProgress: (bytesUploaded: number, bytesTotal: number) => {
        const progress = (bytesUploaded / bytesTotal) * 100;
        const currentTime = Date.now();
        const timeDiff = (currentTime - (task.lastProgressTime || currentTime)) / 1000;
        const bytesDiff = bytesUploaded - task.bytesUploaded;
        
        task.speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;
        task.progress = progress;
        task.bytesUploaded = bytesUploaded;
        task.bytesTotal = bytesTotal;
        task.lastProgressTime = currentTime;

        options.onProgress?.(progress, bytesUploaded, bytesTotal);
      },
      onSuccess: () => {
        task.status = 'completed';
        task.progress = 100;
        task.uploadUrl = upload.url!;
        this.activeUploads--;
        
        options.onSuccess?.(upload.url!);
        
        // Remove from queue and map after successful upload
        this.uploadQueue = this.uploadQueue.filter(id => id !== options.id);
        
        this.processQueue();
      },
      onShouldRetry: (error: Error, retryAttempt: number, options: any) => {
        // Custom retry logic
        if (!this.isOnline) {
          return false; // Don't retry if offline
        }
        return retryAttempt < task.maxRetries;
      },
    });

    return upload;
  }

  private processQueue() {
    while (this.activeUploads < this.maxConcurrentUploads && this.uploadQueue.length > 0) {
      const nextId = this.uploadQueue.find(id => {
        const task = this.uploads.get(id);
        return task && task.status === 'queued';
      });

      if (!nextId) break;

      const task = this.uploads.get(nextId);
      if (task && task.upload) {
        this.startUpload(nextId);
      }
    }
  }

  private startUpload(id: string) {
    const task = this.uploads.get(id);
    if (!task || !task.upload) return;

    task.status = 'uploading';
    this.activeUploads++;
    
    // Find previous offset if resuming
    task.upload.findPreviousUploads().then((previousUploads: any[]) => {
      if (previousUploads.length) {
        task.upload!.resumeFromPreviousUpload(previousUploads[0]);
      }
      task.upload!.start();
    }).catch(() => {
      // If finding previous uploads fails, start fresh
      task.upload!.start();
    });
  }

  pauseUpload(id: string) {
    const task = this.uploads.get(id);
    if (!task || !task.upload || task.status !== 'uploading') return;

    task.upload.abort();
    task.status = 'paused';
    this.activeUploads--;
    this.processQueue();
  }

  resumeUpload(id: string) {
    const task = this.uploads.get(id);
    if (!task || !task.upload || task.status !== 'paused') return;

    task.status = 'queued';
    this.uploadQueue.push(id);
    this.processQueue();
  }

  cancelUpload(id: string) {
    const task = this.uploads.get(id);
    if (!task) return;

    if (task.upload && task.status === 'uploading') {
      task.upload.abort();
      this.activeUploads--;
    }

    task.status = 'cancelled';
    this.uploadQueue = this.uploadQueue.filter(qId => qId !== id);
    this.uploads.delete(id);
    this.processQueue();
  }

  private retryUpload(id: string) {
    const task = this.uploads.get(id);
    if (!task) return;

    task.status = 'queued';
    task.error = undefined;
    
    if (!this.uploadQueue.includes(id)) {
      this.uploadQueue.push(id);
    }
    
    this.processQueue();
  }

  private pauseAllActiveUploads() {
    this.uploads.forEach((task, id) => {
      if (task.status === 'uploading') {
        this.pauseUpload(id);
      }
    });
  }

  private resumeAllPausedUploads() {
    this.uploads.forEach((task, id) => {
      if (task.status === 'paused') {
        this.resumeUpload(id);
      }
    });
  }

  getUploadStatus(id: string): UploadTask | undefined {
    return this.uploads.get(id);
  }

  getAllUploads(): UploadTask[] {
    return Array.from(this.uploads.values());
  }

  destroy() {
    // Cancel all uploads
    this.uploads.forEach((task, id) => {
      this.cancelUpload(id);
    });
  }
}

// Export singleton instance
export const videoUploadService = new VideoUploadService(
  process.env.EXPO_PUBLIC_API_URL + '/api/v1/videos/upload'
);

// Helper to format bytes
export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Helper to format upload speed
export const formatSpeed = (bytesPerSecond: number): string => {
  return formatBytes(bytesPerSecond) + '/s';
};