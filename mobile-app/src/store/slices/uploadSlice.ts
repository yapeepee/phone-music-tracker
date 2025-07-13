import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '..';
import { videoUploadService, UploadTask } from '../../services/video-upload.service';

export interface UploadItem {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  progress: number;
  bytesUploaded: number;
  bytesTotal: number;
  speed: number;
  status: 'queued' | 'uploading' | 'paused' | 'completed' | 'failed' | 'cancelled';
  error?: Error;
  uploadUrl?: string;
  createdAt: number;
  completedAt?: number;
}

interface UploadState {
  uploads: Record<string, UploadItem>;
  uploadOrder: string[];
}

const initialState: UploadState = {
  uploads: {},
  uploadOrder: [],
};

// Async thunks
export const startUpload = createAsyncThunk(
  'upload/start',
  async ({
    id,
    filePath,
    fileName,
    fileSize,
    metadata,
  }: {
    id: string;
    filePath: string;
    fileName: string;
    fileSize: number;
    metadata?: Record<string, string>;
  }) => {
    const uploadId = await videoUploadService.createUpload({
      id,
      filePath,
      fileName,
      fileSize,
      metadata,
      onProgress: (progress, bytesUploaded, bytesTotal) => {
        // Progress updates will be handled through polling
      },
      onSuccess: (uploadUrl) => {
        // Success will be handled through polling
      },
      onError: (error) => {
        // Error will be handled through polling
      },
    });

    return {
      id: uploadId,
      fileName,
      filePath,
      fileSize,
      createdAt: Date.now(),
    };
  }
);

export const pauseUpload = createAsyncThunk(
  'upload/pause',
  async (id: string) => {
    videoUploadService.pauseUpload(id);
    return id;
  }
);

export const resumeUpload = createAsyncThunk(
  'upload/resume',
  async (id: string) => {
    videoUploadService.resumeUpload(id);
    return id;
  }
);

export const cancelUpload = createAsyncThunk(
  'upload/cancel',
  async (id: string) => {
    videoUploadService.cancelUpload(id);
    return id;
  }
);

export const retryUpload = createAsyncThunk(
  'upload/retry',
  async (id: string) => {
    videoUploadService.resumeUpload(id);
    return id;
  }
);

// Sync upload status from service
export const syncUploadStatus = createAsyncThunk(
  'upload/syncStatus',
  async () => {
    const uploads = videoUploadService.getAllUploads();
    // Map to serializable data only
    return uploads.map(task => ({
      id: task.id,
      status: task.status,
      progress: task.progress,
      bytesUploaded: task.bytesUploaded,
      bytesTotal: task.bytesTotal,
      speed: task.speed,
      error: task.error ? { message: task.error.message } : undefined,
      uploadUrl: task.uploadUrl,
    }));
  }
);

const uploadSlice = createSlice({
  name: 'upload',
  initialState,
  reducers: {
    updateUploadProgress: (
      state,
      action: PayloadAction<{
        id: string;
        progress: number;
        bytesUploaded: number;
        bytesTotal: number;
        speed: number;
      }>
    ) => {
      const { id, progress, bytesUploaded, bytesTotal, speed } = action.payload;
      if (state.uploads[id]) {
        state.uploads[id].progress = progress;
        state.uploads[id].bytesUploaded = bytesUploaded;
        state.uploads[id].bytesTotal = bytesTotal;
        state.uploads[id].speed = speed;
      }
    },
    updateUploadStatus: (
      state,
      action: PayloadAction<{
        id: string;
        status: UploadItem['status'];
        error?: Error;
        uploadUrl?: string;
      }>
    ) => {
      const { id, status, error, uploadUrl } = action.payload;
      if (state.uploads[id]) {
        state.uploads[id].status = status;
        if (error) state.uploads[id].error = error;
        if (uploadUrl) state.uploads[id].uploadUrl = uploadUrl;
        if (status === 'completed') {
          state.uploads[id].completedAt = Date.now();
        }
      }
    },
    clearCompleted: (state) => {
      const completedIds = Object.keys(state.uploads).filter(
        (id) => state.uploads[id].status === 'completed'
      );
      completedIds.forEach((id) => {
        delete state.uploads[id];
      });
      state.uploadOrder = state.uploadOrder.filter(
        (id) => !completedIds.includes(id)
      );
    },
    removeUpload: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      delete state.uploads[id];
      state.uploadOrder = state.uploadOrder.filter((uid) => uid !== id);
    },
  },
  extraReducers: (builder) => {
    builder
      // Start upload
      .addCase(startUpload.fulfilled, (state, action) => {
        const { id, fileName, filePath, fileSize, createdAt } = action.payload;
        state.uploads[id] = {
          id,
          fileName,
          filePath,
          fileSize,
          progress: 0,
          bytesUploaded: 0,
          bytesTotal: fileSize,
          speed: 0,
          status: 'queued',
          createdAt,
        };
        state.uploadOrder.push(id);
      })
      // Sync status
      .addCase(syncUploadStatus.fulfilled, (state, action) => {
        const serviceTasks = action.payload;
        serviceTasks.forEach((task) => {
          if (state.uploads[task.id]) {
            state.uploads[task.id].status = task.status;
            state.uploads[task.id].progress = task.progress;
            state.uploads[task.id].bytesUploaded = task.bytesUploaded;
            state.uploads[task.id].bytesTotal = task.bytesTotal;
            state.uploads[task.id].speed = task.speed;
            if (task.error) state.uploads[task.id].error = task.error as any;
            if (task.uploadUrl) state.uploads[task.id].uploadUrl = task.uploadUrl;
          }
        });
      })
      // Pause upload
      .addCase(pauseUpload.fulfilled, (state, action) => {
        const id = action.payload;
        if (state.uploads[id]) {
          state.uploads[id].status = 'paused';
        }
      })
      // Resume upload
      .addCase(resumeUpload.fulfilled, (state, action) => {
        const id = action.payload;
        if (state.uploads[id]) {
          state.uploads[id].status = 'queued';
        }
      })
      // Cancel upload
      .addCase(cancelUpload.fulfilled, (state, action) => {
        const id = action.payload;
        if (state.uploads[id]) {
          state.uploads[id].status = 'cancelled';
        }
      })
      // Retry upload
      .addCase(retryUpload.fulfilled, (state, action) => {
        const id = action.payload;
        if (state.uploads[id]) {
          state.uploads[id].status = 'queued';
          state.uploads[id].error = undefined;
        }
      });
  },
});

export const {
  updateUploadProgress,
  updateUploadStatus,
  clearCompleted,
  removeUpload,
} = uploadSlice.actions;

// Re-export memoized selectors from separate file
export * from '../selectors/upload.selectors';

export default uploadSlice.reducer;