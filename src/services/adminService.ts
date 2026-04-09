import type {
  AdminBroadcastInput,
  AdminBroadcastResponse,
  AdminPendingEventsResponse,
  AdminUpdateEventStatusInput,
  AdminUpdateUserInput,
  AdminUsersResponse,
  ApiEvent,
  AuthUser,
} from '@/types';
import { apiRequest, buildQueryString } from './apiClient';

export async function getPendingEvents(params?: { page?: number; limit?: number }): Promise<AdminPendingEventsResponse> {
  const qs = buildQueryString((params ?? {}) as Record<string, unknown>);
  return apiRequest<AdminPendingEventsResponse>(`/admin/pending-events${qs}`, {
    method: 'GET',
    requireAuth: true,
  });
}

export async function updateEventStatus(
  eventId: string,
  payload: AdminUpdateEventStatusInput,
): Promise<ApiEvent> {
  return apiRequest<ApiEvent>(`/admin/events/${eventId}/status`, {
    method: 'PUT',
    requireAuth: true,
    body: payload,
  });
}

export async function getAdminUsers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isBlocked?: boolean;
}): Promise<AdminUsersResponse> {
  const qs = buildQueryString((params ?? {}) as Record<string, unknown>);
  return apiRequest<AdminUsersResponse>(`/admin/users${qs}`, {
    method: 'GET',
    requireAuth: true,
  });
}

export async function updateAdminUser(payload: AdminUpdateUserInput): Promise<AuthUser> {
  return apiRequest<AuthUser>('/admin/users', {
    method: 'PUT',
    requireAuth: true,
    body: payload,
  });
}

export async function broadcastAdminNotification(payload: AdminBroadcastInput): Promise<AdminBroadcastResponse> {
  return apiRequest<AdminBroadcastResponse>('/admin/notifications/broadcast', {
    method: 'POST',
    requireAuth: true,
    body: payload,
  });
}
