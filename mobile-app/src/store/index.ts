import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import practiceReducer from './slices/practiceSlice';
import userReducer from './slices/userSlice';
import uploadReducer from './slices/uploadSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    practice: practiceReducer,
    user: userReducer,
    upload: uploadReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;