import type { Notification, NotificationListResponse } from '@/types/notification.types';
import { apiRequest, buildQueryString } from './apiClient';

export async function getNotifications(
  params?: { page?: number; limit?: number },
): Promise<NotificationListResponse> {
  const qs = buildQueryString((params ?? {}) as Record<string, unknown>);
  return apiRequest<NotificationListResponse>(`/notifications${qs}`, {
    requireAuth: true,
  });
}

export async function markNotificationAsRead(id: string): Promise<Notification> {
  return apiRequest<Notification>(`/notifications/${id}/read`, {
    method: 'PUT',
    requireAuth: true,
  });
}

export async function deleteNotification(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/notifications/${id}`, {
    method: 'DELETE',
    requireAuth: true,
  });
}

export async function saveFcmToken(
  deviceId: string,
  fcmToken: string,
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/notifications/fcm-token', {
    method: 'POST',
    requireAuth: true,
    body: { deviceId, fcmToken },
  });
}
