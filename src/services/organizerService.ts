import { apiRequest } from './apiClient';
import type { ApiEvent, EventAttendeesResponse, EventInputPayload, OrganizerStats } from '@/types';

export async function getOrganizerEvents(): Promise<ApiEvent[]> {
  return apiRequest<ApiEvent[]>('/organizer/events', {
    method: 'GET',
    requireAuth: true,
  });
}

export async function createOrganizerEvent(payload: EventInputPayload): Promise<ApiEvent> {
  return apiRequest<ApiEvent>('/organizer/events', {
    method: 'POST',
    requireAuth: true,
    body: payload,
  });
}

export async function updateOrganizerEvent(eventId: string, payload: Partial<EventInputPayload>): Promise<ApiEvent> {
  return apiRequest<ApiEvent>(`/organizer/events/${eventId}`, {
    method: 'PUT',
    requireAuth: true,
    body: payload,
  });
}

export async function deleteOrganizerEvent(eventId: string): Promise<void> {
  await apiRequest<{ message: string }>(`/organizer/events/${eventId}`, {
    method: 'DELETE',
    requireAuth: true,
  });
}

export async function getOrganizerEventAttendees(eventId: string): Promise<EventAttendeesResponse> {
  return apiRequest<EventAttendeesResponse>(`/organizer/events/${eventId}/attendees`, {
    method: 'GET',
    requireAuth: true,
  });
}

export async function getOrganizerStats(): Promise<OrganizerStats> {
  return apiRequest<OrganizerStats>('/organizer/stats', {
    method: 'GET',
    requireAuth: true,
  });
}
