import type { AuthUser } from '@/types/auth.types';
import type { ApiEvent } from '@/types/event.types';
import { createFormDataImageFile } from '@/utils/formDataFile';
import { apiFormRequest, apiRequest } from './apiClient';

export interface MyEventsResponse {
  rsvpEvents: (ApiEvent & { isRsvped: boolean; isLiked: boolean })[];
  likedEvents: (ApiEvent & { isRsvped: boolean; isLiked: boolean })[];
}

export interface UpdateProfileInput {
  displayName?: string;
  avatarUrl?: string | null;
  preferences?: string[];
  preferencesOnboarded?: boolean;
}

export interface UploadImageInput {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
}

export interface FollowingOrganizer {
  id: string;
  displayName: string;
  avatarUrl: string | null;
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

export function updateProfileWithAvatar(
  data: UpdateProfileInput,
  avatar: UploadImageInput,
): Promise<AuthUser> {
  const formData = new FormData();
  if (data.displayName !== undefined) formData.append('displayName', data.displayName);
  if (data.avatarUrl !== undefined) formData.append('avatarUrl', data.avatarUrl ?? '');
  if (data.preferences !== undefined) formData.append('preferences', JSON.stringify(data.preferences));
  if (data.preferencesOnboarded !== undefined) {
    formData.append('preferencesOnboarded', String(data.preferencesOnboarded));
  }

  formData.append('avatar', createFormDataImageFile({
    uri: avatar.uri,
    fileName: avatar.fileName,
    mimeType: avatar.mimeType,
    fallbackName: 'avatar',
  }));

  return apiFormRequest<AuthUser>('/user/profile', formData, {
    method: 'PUT',
    requireAuth: true,
  });
}

export function getMyEvents(): Promise<MyEventsResponse> {
  return apiRequest<MyEventsResponse>('/user/my-events', { requireAuth: true });
}

export function getFollowingOrganizers(): Promise<{ items: FollowingOrganizer[] }> {
  return apiRequest<{ items: FollowingOrganizer[] }>('/user/following-organizers', { requireAuth: true });
}
