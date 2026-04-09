import type { AuthResponse, LoginRequest, RegisterRequest } from '@/types/auth.types';
import { apiRequest } from './apiClient';

export function login(data: LoginRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: data,
  });
}

export function register(data: RegisterRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: data,
  });
}

export function refreshToken(token: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/refresh-token', {
    method: 'POST',
    body: { refreshToken: token },
  });
}

export function logout(token: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/auth/logout', {
    method: 'POST',
    body: { refreshToken: token },
  });
}
