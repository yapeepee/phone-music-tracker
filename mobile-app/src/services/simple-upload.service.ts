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
}

export interface UploadTask {
  id: string;
  uploadTask: FileSystem.UploadTask | null;
  status: 'queued' | 'uploading' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  bytesUploaded: number;
  bytesTotal: number;
  error?: Error;
  uploadUrl?: string;
}

class SimpleVideoUploadService {
  private uploads: Map<string, UploadTask> = new Map();
  private uploadQueue: string[] = [];
  private maxConcurrentUploads = 2;
  private activeUploads = 0;
  private authToken: string | null = null;
  private uploadEndpoint: string;

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
      const nextId = this.uploadQueue.shift();
      if (!nextId) break;

      const task = this.uploads.get(nextId);
      if (task && task.status === 'queued') {
        await this.startUpload(nextId);
      }
    }
  }

  private async startUpload(uploadId: string) {
    const task = this.uploads.get(uploadId);
    if (!task) return;

    const options = this.getUploadOptions(uploadId);
    if (!options) return;

    task.status = 'uploading';
    this.activeUploads++;

    try {
      // Create upload task using Expo FileSystem
      const uploadTask = FileSystem.createUploadTask(
        this.uploadEndpoint,
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
          task.progress = progress;
          task.bytesUploaded = data.totalBytesSent;
          task.bytesTotal = data.totalBytesExpectedToSend;
          
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
          
          const responseData = JSON.parse(result.body);
          task.uploadUrl = responseData.url || responseData.video_url || '';
          
          options.onSuccess?.(task.uploadUrl);
        } else {
          // Failed
          throw new Error(`Upload failed with status ${result.status}: ${result.body}`);
        }
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      task.error = error;
      task.status = 'failed';
      options.onError?.(error);
    } finally {
      this.activeUploads--;
      this.processQueue();
    }
  }

  pauseUpload(id: string) {
    const task = this.uploads.get(id);
    if (!task || !task.uploadTask || task.status !== 'uploading') return;

    task.uploadTask.cancelAsync();
    task.status = 'paused';
    this.activeUploads--;
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
    this.uploads.delete(id);
    this.processQueue();
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

  // Store upload options separately to retrieve them later
  private uploadOptions: Map<string, UploadOptions> = new Map();

  createUploadWithOptions(options: UploadOptions): Promise<string> {
    this.uploadOptions.set(options.id, options);
    return this.createUpload(options);
  }

  private getUploadOptions(id: string): UploadOptions | undefined {
    return this.uploadOptions.get(id);
  }
}

// Export singleton instance with multipart endpoint
export const simpleVideoUploadService = new SimpleVideoUploadService(
  process.env.EXPO_PUBLIC_API_URL + '/api/v1/videos/upload-multipart'
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