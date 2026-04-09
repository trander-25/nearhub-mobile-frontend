import type { AuthUser } from '@/types/auth.types';
import type { ApiEvent } from '@/types/event.types';
import { apiRequest } from './apiClient';

export interface MyEventsResponse {
  rsvpEvents: (ApiEvent & { isRsvped: boolean; isLiked: boolean })[];
  likedEvents: (ApiEvent & { isRsvped: boolean; isLiked: boolean })[];
}

export interface UpdateProfileInput {
  displayName?: string;
  avatarUrl?: string | null;
  preferences?: string[];
}

export function getProfile(): Promise<AuthUser> {
  return apiRequest<AuthUser>('/user/profile', { requireAuth: true });
}

export function updateProfile(data: UpdateProfileInput): Promise<AuthUser> {
  return apiRequest<AuthUser>('/user/profile', {
    method: 'PUT',
    body: data,
    requireAuth: true,
  });
}

export function getMyEvents(): Promise<MyEventsResponse> {
  return apiRequest<MyEventsResponse>('/user/my-events', { requireAuth: true });
}
