import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { authEvents } from './auth-events';
import { snakeToCamel, camelToSnake } from '../../utils/apiTransformers';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Token storage keys
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token AND transform data
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Skip auth header for public endpoints
    const publicEndpoints = ['/auth/login', '/auth/register', '/auth/refresh'];
    const isPublicEndpoint = publicEndpoints.some(endpoint => 
      config.url?.includes(endpoint)
    );

    if (!isPublicEndpoint) {
      try {
        const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
        if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
      } catch (error) {
        console.error('Error getting access token:', error);
      }
    }

    // Transform request data from camelCase to snake_case
    if (config.data && (config.method === 'post' || config.method === 'put' || config.method === 'patch')) {
      const transformedData = camelToSnake(config.data);
      
      // Debug logging for session updates (only in dev)
      if (__DEV__ && config.url?.includes('/sessions/') && config.method === 'put') {
        console.log('Session update transformation:', {
          url: config.url,
          original: config.data,
          transformed: transformedData
        });
      }
      
      config.data = transformedData;
    }

    // Transform query params for GET requests
    if (config.params) {
      const transformedParams = camelToSnake(config.params);
      config.params = transformedParams;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    // Transform response data from snake_case to camelCase
    if (response.data) {
      const transformedData = snakeToCamel(response.data);
      response.data = transformedData;
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Call refresh endpoint
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { refresh_token: refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const { access_token, refresh_token } = response.data;

        // Save new tokens
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access_token);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh_token);

        // Emit token update event
        authEvents.emit({
          type: 'TOKEN_UPDATED',
          payload: {
            accessToken: access_token,
            refreshToken: refresh_token,
          }
        });

        // Process queued requests
        processQueue(null, access_token);

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return apiClient(originalRequest);

      } catch (refreshError) {
        // Refresh failed, logout user
        processQueue(refreshError, null);
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        authEvents.emit({ type: 'LOGOUT' });
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Helper function to handle API errors
export const handleApiError = (error: any): string => {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      // Server responded with error
      const data = error.response.data;
      
      // Log full error details for debugging
      console.error('API Error Details:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: data,
        url: error.config?.url,
        method: error.config?.method,
        requestData: error.config?.data
      });
      
      if (data.detail) {
        // Handle array of validation errors
        if (Array.isArray(data.detail)) {
          return data.detail.map((err: any) => err.msg || err).join(', ');
        }
        return data.detail;
      } else if (data.message) {
        return data.message;
      } else if (typeof data === 'string') {
        return data;
      }
      return `Error: ${error.response.status}`;
    } else if (error.request) {
      // Request made but no response
      return 'Network error. Please check your connection.';
    }
  }
  return error.message || 'An unexpected error occurred';
};