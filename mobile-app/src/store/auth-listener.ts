// Auth event listener setup - connects auth events to store
import { authEvents } from '../services/api/auth-events';
import { store } from './index';
import { logout, updateTokens } from './slices/authSlice';

// Set up auth event listeners
export const setupAuthEventListeners = () => {
  authEvents.subscribe((event) => {
    switch (event.type) {
      case 'TOKEN_UPDATED':
        store.dispatch(updateTokens(event.payload));
        break;
      case 'LOGOUT':
        store.dispatch(logout());
        break;
    }
  });
};