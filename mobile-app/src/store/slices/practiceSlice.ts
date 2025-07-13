import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { PracticeSession, PracticeFocus, Video, Tag } from '../../types/practice';
import { VideoMetadata } from '../../services/video.service';
import practiceService from '../../services/practice.service';

interface PracticeState {
  sessions: PracticeSession[];
  currentSession: PracticeSession | null;
  selectedPiece: Tag | null;  // Track selected piece
  isRecording: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: PracticeState = {
  sessions: [],
  currentSession: null,
  selectedPiece: null,
  isRecording: false,
  isLoading: false,
  error: null,
};

// Async thunk for loading sessions
export const loadSessions = createAsyncThunk(
  'practice/loadSessions',
  async (params?: { skip?: number; limit?: number }) => {
    const response = await practiceService.getSessions(params);
    return response;
  }
);

// Async thunk for creating session
export const createSession = createAsyncThunk(
  'practice/createSession',
  async (params: {
    studentId: string;
    focus?: PracticeFocus;
    tags?: string[];
    targetTempo?: number;
    practiceMode?: 'normal' | 'slow_practice' | 'meditation';
  }) => {
    const response = await practiceService.createSession({
      focus: params.focus,
      startTime: new Date().toISOString(),
      tags: params.tags || [],
      targetTempo: params.targetTempo,
      practiceMode: params.practiceMode || 'normal',
    });
    
    // Response is already in camelCase from API transformer
    
    // Response is already in camelCase from API transformer
    return response;
  }
);

// Async thunk for ending session and updating backend
export const endAndUpdateSession = createAsyncThunk(
  'practice/endAndUpdateSession',
  async (params: {
    sessionId: string;
    selfRating: number;
    note: string;
    tags: string[];
    video?: VideoMetadata;
    videoUploadId?: string;
  }) => {
    const endTime = new Date().toISOString();
    
    // Update session on backend
    const response = await practiceService.updateSession(params.sessionId, {
      endTime: endTime,
      selfRating: params.selfRating,
      note: params.note,
      tags: params.tags,
    });
    
    return {
      endTime,
      sessionData: response,
    };
  }
);

const practiceSlice = createSlice({
  name: 'practice',
  initialState,
  reducers: {
    selectPiece: (state, action: PayloadAction<Tag>) => {
      state.selectedPiece = action.payload;
    },
    clearSelectedPiece: (state) => {
      state.selectedPiece = null;
    },
    startSession: (state, action: PayloadAction<{
      studentId: string;
      focus?: PracticeFocus;
      tags?: string[];
    }>) => {
      state.currentSession = {
        id: Date.now().toString(),
        studentId: action.payload.studentId,
        focus: action.payload.focus,
        startTime: new Date().toISOString(),
        tags: action.payload.tags || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
    endSession: (state, action: PayloadAction<{
      selfRating: number;
      note: string;
      tags: string[];
      video?: VideoMetadata;
      videoUploadId?: string;
    }>) => {
      if (state.currentSession) {
        state.currentSession.endTime = new Date().toISOString();
        state.currentSession.selfRating = action.payload.selfRating;
        state.currentSession.note = action.payload.note;
        state.currentSession.tags = action.payload.tags;
        state.currentSession.updatedAt = new Date().toISOString();
        
        // Calculate duration
        const start = new Date(state.currentSession.startTime);
        const end = new Date(state.currentSession.endTime);
        state.currentSession.durationMinutes = Math.floor((end.getTime() - start.getTime()) / 60000);
        
        // Add video if recorded
        if (action.payload.video) {
          state.currentSession.videos = [{
            id: Date.now().toString(),
            sessionId: state.currentSession.id,
            localUri: action.payload.video.uri,
            durationSeconds: action.payload.video.duration,
            fileSizeBytes: action.payload.video.size,
            thumbnailUri: action.payload.video.thumbnailUri,
            processed: false,
            uploadProgress: action.payload.videoUploadId ? 0 : undefined,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }];
        }
        
        state.sessions.push(state.currentSession);
        state.currentSession = null;
      }
    },
    setSessions: (state, action: PayloadAction<PracticeSession[]>) => {
      state.sessions = action.payload;
    },
    setRecording: (state, action: PayloadAction<boolean>) => {
      state.isRecording = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle loading sessions
      .addCase(loadSessions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadSessions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.sessions = action.payload as PracticeSession[];
      })
      .addCase(loadSessions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load sessions';
      })
      // Handle session creation
      .addCase(createSession.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createSession.fulfilled, (state, action) => {
        state.isLoading = false;
        // Session created successfully
        state.currentSession = action.payload;
      })
      .addCase(createSession.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to create session';
      })
      // Handle session end and update
      .addCase(endAndUpdateSession.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(endAndUpdateSession.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.currentSession) {
          state.currentSession.endTime = action.payload.endTime;
          state.currentSession.updatedAt = new Date().toISOString();
        }
      })
      .addCase(endAndUpdateSession.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to end session';
      });
  },
});

export const {
  selectPiece,
  clearSelectedPiece,
  startSession,
  endSession,
  setSessions,
  setRecording,
} = practiceSlice.actions;

// Export thunk actions
export { loadSessions, createSession, endAndUpdateSession };

export default practiceSlice.reducer;