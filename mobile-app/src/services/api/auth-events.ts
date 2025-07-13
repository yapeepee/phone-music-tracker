// Auth event emitter to avoid circular dependencies
type AuthEventType = 'TOKEN_UPDATED' | 'LOGOUT';

interface AuthEvent {
  type: AuthEventType;
  payload?: any;
}

type AuthEventListener = (event: AuthEvent) => void;

class AuthEventEmitter {
  private listeners: AuthEventListener[] = [];

  subscribe(listener: AuthEventListener): () => void {
    this.listeners.push(listener);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  emit(event: AuthEvent): void {
    this.listeners.forEach(listener => listener(event));
  }
}

export const authEvents = new AuthEventEmitter();