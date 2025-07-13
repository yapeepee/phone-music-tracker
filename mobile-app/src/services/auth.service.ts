import * as SecureStore from 'expo-secure-store';
import { AuthResponse, LoginRequest, RegisterRequest, RefreshTokenRequest, RefreshTokenResponse } from '../types/auth';
import { BaseService } from './base.service';

class AuthService extends BaseService {
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';

  constructor() {
    super('/auth');
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      console.log('Attempting login with BaseService...');
      const response = await this.post<AuthResponse>('/login', credentials);
      
      console.log('Login response received:', response);
      const { tokens, user } = response;
      
      // Debug: Check what we actually received
      console.log('Tokens object:', tokens);
      console.log('Access token:', tokens?.accessToken);
      console.log('Refresh token:', tokens?.refreshToken);
      
      // Validate tokens before saving
      if (!tokens?.accessToken || !tokens?.refreshToken) {
        console.error('Invalid tokens received:', tokens);
        throw new Error('Invalid authentication response: missing tokens');
      }
      
      // Save tokens - using camelCase after API transformation
      await this.saveTokens(tokens.accessToken, tokens.refreshToken);
      
      return response;
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Check if it's a network error
      if (error?.message === 'Network Error' && !error?.response) {
        console.error('This is a network connectivity issue - backend not reachable');
      }
      
      throw error; // BaseService already handles error formatting
    }
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await this.post<AuthResponse>('/register', userData);
    
    const { tokens, user } = response;
    
    // Validate tokens before saving
    if (!tokens?.accessToken || !tokens?.refreshToken) {
      throw new Error('Invalid authentication response: missing tokens');
    }
    
    // Save tokens - using camelCase after API transformation
    await this.saveTokens(tokens.accessToken, tokens.refreshToken);
    
    return response;
  }

  async refreshToken(): Promise<RefreshTokenResponse> {
    try {
      const refreshToken = await this.getRefreshToken();
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await this.post<RefreshTokenResponse>('/refresh', {
        refreshToken: refreshToken,  // Will be converted to refresh_token by API transformer
      });
      
      // Validate tokens before saving
      if (!response?.accessToken || !response?.refreshToken) {
        throw new Error('Invalid refresh response: missing tokens');
      }
      
      // Save new tokens - using camelCase after API transformation
      await this.saveTokens(response.accessToken, response.refreshToken);
      
      return response;
    } catch (error) {
      await this.clearTokens();
      throw error; // BaseService already handles error formatting
    }
  }

  async logout(): Promise<void> {
    await this.clearTokens();
  }

  async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    // Validate tokens are strings
    if (typeof accessToken !== 'string' || typeof refreshToken !== 'string') {
      throw new Error(`Invalid token types: accessToken=${typeof accessToken}, refreshToken=${typeof refreshToken}`);
    }
    
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
    return this.get('/me');
  }
}

export default new AuthService();