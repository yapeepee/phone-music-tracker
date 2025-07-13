import * as SecureStore from 'expo-secure-store';
import { AuthResponse, LoginRequest, RegisterRequest, RefreshTokenRequest, RefreshTokenResponse } from '../types/auth';
import { apiClient, handleApiError } from './api/client';

class AuthService {
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      console.log('Attempting login to:', apiClient.defaults.baseURL + '/auth/login');
      const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
      
      console.log('Login response received:', response.status);
      const { tokens, user } = response.data;
      
      // Save tokens - using camelCase after API transformation
      await this.saveTokens(tokens.accessToken, tokens.refreshToken);
      
      return response.data;
    } catch (error: any) {
      console.error('Login error:', error);
      console.error('Error type:', error?.constructor?.name);
      console.error('Error config:', error?.config);
      console.error('Error request:', error?.request?._url);
      console.error('Error response:', error?.response);
      
      // Check if it's a network error
      if (error?.message === 'Network Error' && !error?.response) {
        console.error('This is a network connectivity issue - backend not reachable');
      }
      
      throw new Error(handleApiError(error));
    }
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/register', userData);
      
      const { tokens, user } = response.data;
      
      // Save tokens - using camelCase after API transformation
      await this.saveTokens(tokens.accessToken, tokens.refreshToken);
      
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  async refreshToken(): Promise<RefreshTokenResponse> {
    try {
      const refreshToken = await this.getRefreshToken();
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiClient.post<RefreshTokenResponse>('/auth/refresh', {
        refreshToken: refreshToken,  // Will be converted to refresh_token by API transformer
      });
      
      const data = response.data;
      
      // Save new tokens - using camelCase after API transformation
      await this.saveTokens(data.accessToken, data.refreshToken);
      
      return data;
    } catch (error) {
      await this.clearTokens();
      throw new Error(handleApiError(error));
    }
  }

  async logout(): Promise<void> {
    await this.clearTokens();
  }

  async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    await SecureStore.setItemAsync(this.ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(this.REFRESH_TOKEN_KEY, refreshToken);
  }

  async getAccessToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(this.ACCESS_TOKEN_KEY);
  }

  async getRefreshToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(this.REFRESH_TOKEN_KEY);
  }

  async clearTokens(): Promise<void> {
    await SecureStore.deleteItemAsync(this.ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(this.REFRESH_TOKEN_KEY);
  }

  async getAuthHeaders(): Promise<{ Authorization: string } | {}> {
    const accessToken = await this.getAccessToken();
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  }

  async getCurrentUser(): Promise<any> {
    try {
      const response = await apiClient.get('/auth/me');
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }
}

export default new AuthService();