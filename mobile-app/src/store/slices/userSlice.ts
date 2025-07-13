import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface StudentProfile {
  userId: string;
  primaryTeacherId: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  instrumentType: string;
  practiceGoal: number;
}

interface TeacherProfile {
  userId: string;
  bio: string;
  specialties: string[];
  studentIds: string[];
}

interface UserState {
  profile: StudentProfile | TeacherProfile | null;
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
    autoSync: boolean;
  };
  isLoading: boolean;
  error: string | null;
}

const initialState: UserState = {
  profile: null,
  preferences: {
    theme: 'light',
    notifications: true,
    autoSync: true,
  },
  isLoading: false,
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setProfile: (state, action: PayloadAction<StudentProfile | TeacherProfile>) => {
      state.profile = action.payload;
    },
    updatePreferences: (state, action: PayloadAction<Partial<UserState['preferences']>>) => {
      state.preferences = {
        ...state.preferences,
        ...action.payload,
      };
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setProfile,
  updatePreferences,
  setLoading,
  setError,
} = userSlice.actions;

export default userSlice.reducer;