import * as FileSystem from 'expo-file-system';

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
  uploadTask: FileSystem.UploadTask | null;
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
  private retryDelays = [0, 1000, 5000, 10000, 30000]; // Retry delays in ms
  private uploadOptions: Map<string, UploadOptions> = new Map();

  constructor(uploadEndpoint: string) {
    this.uploadEndpoint = uploadEndpoint;
  }

  setAuthToken(token: string) {
    this.authToken = token;
  }

  async createUpload(options: UploadOptions): Promise<string> {
    const task: UploadTask = {
      id: options.id,
      uploadTask: null,
      status: 'queued',
      progress: 0,
      bytesUploaded: 0,
      bytesTotal: options.fileSize,
      speed: 0,
      retryCount: 0,
      maxRetries: 5,
    };

    this.uploads.set(options.id, task);
    this.uploadOptions.set(options.id, options);
    this.uploadQueue.push(options.id);

    // Process queue
    this.processQueue();

    return options.id;
  }

  private async processQueue() {
    while (this.activeUploads < this.maxConcurrentUploads && this.uploadQueue.length > 0) {
      const nextId = this.uploadQueue.find(id => {
        const task = this.uploads.get(id);
        return task && task.status === 'queued';
      });

      if (!nextId) break;

      const task = this.uploads.get(nextId);
      if (task) {
        this.startUpload(nextId);
      }
    }
  }

  private async startUpload(uploadId: string) {
    const task = this.uploads.get(uploadId);
    if (!task) return;

    const options = this.uploadOptions.get(uploadId);
    if (!options) return;

    task.status = 'uploading';
    this.activeUploads++;

    try {
      // Extract session ID from metadata or filename
      // Filename pattern: {sessionId}_practice_video_{timestamp}.mp4
      const sessionId = options.metadata?.session_id || 
                       options.fileName.match(/^([a-f0-9-]+|\d+)_practice_video/i)?.[1] || 
                       'unknown';
      
      // Create upload task using Expo FileSystem
      const uploadTask = FileSystem.createUploadTask(
        `${this.uploadEndpoint.replace('/upload', '/upload-multipart')}/${sessionId}`,
        options.filePath,
        {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'video',
          headers: {
            Authorization: `Bearer ${this.authToken}`,
          },
          parameters: {
            filename: options.fileName,
            ...options.metadata,
          },
        },
        (data) => {
          // Progress callback
          const progress = (data.totalBytesSent / data.totalBytesExpectedToSend) * 100;
          const currentTime = Date.now();
          const timeDiff = (currentTime - (task.lastProgressTime || currentTime)) / 1000;
          const bytesDiff = data.totalBytesSent - task.bytesUploaded;
          
          task.speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;
          task.progress = progress;
          task.bytesUploaded = data.totalBytesSent;
          task.bytesTotal = data.totalBytesExpectedToSend;
          task.lastProgressTime = currentTime;
          
          options.onProgress?.(progress, data.totalBytesSent, data.totalBytesExpectedToSend);
        }
      );

      task.uploadTask = uploadTask;

      // Start upload
      const result = await uploadTask.uploadAsync();

      if (result) {
        if (result.status === 200 || result.status === 201) {
          // Success
          task.status = 'completed';
          task.progress = 100;
          
          try {
            const responseData = JSON.parse(result.body);
            task.uploadUrl = responseData.url || responseData.video_url || '';
          } catch {
            task.uploadUrl = '';
          }
          
          this.activeUploads--;
          options.onSuccess?.(task.uploadUrl);
          
          // Remove from queue and cleanup
          this.uploadQueue = this.uploadQueue.filter(id => id !== uploadId);
          this.uploadOptions.delete(uploadId);
        } else {
          // Failed
          throw new Error(`Upload failed with status ${result.status}: ${result.body}`);
        }
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      task.error = error;
      task.status = 'failed';
      this.activeUploads--;

      // Handle retry logic
      if (task.retryCount < task.maxRetries) {
        task.retryCount++;
        setTimeout(() => {
          if (task.status === 'failed') {
            this.retryUpload(uploadId);
          }
        }, this.retryDelays[Math.min(task.retryCount, this.retryDelays.length - 1)]);
      } else {
        options.onError?.(error);
        this.uploadOptions.delete(uploadId);
      }
    } finally {
      this.processQueue();
    }
  }

  pauseUpload(id: string) {
    const task = this.uploads.get(id);
    if (!task || !task.uploadTask || task.status !== 'uploading') return;

    task.uploadTask.cancelAsync();
    task.status = 'paused';
    this.activeUploads--;
    this.processQueue();
  }

  resumeUpload(id: string) {
    const task = this.uploads.get(id);
    if (!task || task.status !== 'paused') return;

    task.status = 'queued';
    this.uploadQueue.push(id);
    this.processQueue();
  }

  cancelUpload(id: string) {
    const task = this.uploads.get(id);
    if (!task) return;

    if (task.uploadTask && task.status === 'uploading') {
      task.uploadTask.cancelAsync();
      this.activeUploads--;
    }

    task.status = 'cancelled';
    this.uploadQueue = this.uploadQueue.filter(qId => qId !== id);
    this.uploads.delete(id);
    this.uploadOptions.delete(id);
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
  process.env.EXPO_PUBLIC_API_URL + '/videos/upload'
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