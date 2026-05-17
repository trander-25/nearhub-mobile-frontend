export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  preferences: string[];
  preferencesOnboarded?: boolean;
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface LoginRequest {
  email: string;
  password: string;
  deviceId?: string;
  fcmToken?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName?: string;
  deviceId?: string;
  fcmToken?: string;
}
