export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;  // Frontend uses camelCase
  role: 'student' | 'teacher';
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    fullName: string;  // Transformed from full_name
    role: 'student' | 'teacher';
    isActive: boolean;  // Transformed from is_active
    isVerified: boolean;  // Transformed from is_verified
    createdAt: string;  // Transformed from created_at
    updatedAt: string;  // Transformed from updated_at
    reputationPoints: number;  // Transformed from reputation_points
    reputationLevel: string;  // Transformed from reputation_level
    timezone?: string;  // Optional field from response
  };
  tokens: {
    accessToken: string;  // Transformed from access_token
    refreshToken: string;  // Transformed from refresh_token
    tokenType: string;  // Transformed from token_type
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;  // Will be transformed to refresh_token for API
}

export interface RefreshTokenResponse {
  accessToken: string;  // Transformed from access_token
  refreshToken: string;  // Transformed from refresh_token
  tokenType: string;  // Transformed from token_type
}