import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../index';

export const selectPracticeSessions = (state: RootState) => state.practice.sessions;

export const selectRecentSessions = createSelector(
  [selectPracticeSessions],
  (sessions) => sessions.slice(0, 5)
);

export const selectSessionsByFocus = createSelector(
  [selectPracticeSessions, (state: RootState, focus: string) => focus],
  (sessions, focus) => sessions.filter(session => session.focus === focus)
);

export const selectUnsyncedSessions = createSelector(
  [selectPracticeSessions],
  (sessions) => sessions.filter(session => !session.isSynced)
);

export const selectCurrentSession = (state: RootState) => state.practice.currentSession;

export const selectIsRecording = (state: RootState) => state.practice.isRecording;