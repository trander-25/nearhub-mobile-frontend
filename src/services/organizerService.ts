import { apiFormRequest, apiRequest } from './apiClient';
import type {
  ApiEvent,
  EventAttendeesResponse,
  EventInputPayload,
  OrganizerProfileResponse,
  OrganizerStats,
} from '@/types';
import { createFormDataImageFile } from '@/utils/formDataFile';

export interface EventImageFileInput {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
}

export type EventMultipartPayload = EventInputPayload & {
  imageFiles?: EventImageFileInput[];
}

function appendEventPayload(formData: FormData, payload: Partial<EventMultipartPayload>) {
  if (payload.title !== undefined) formData.append('title', payload.title);
  if (payload.description !== undefined) formData.append('description', payload.description);
  if (payload.category !== undefined) formData.append('category', payload.category);
  if (payload.lat !== undefined) formData.append('lat', String(payload.lat));
  if (payload.lng !== undefined) formData.append('lng', String(payload.lng));
  if (payload.address !== undefined) formData.append('address', payload.address);
  if (payload.city !== undefined) formData.append('city', payload.city);
  if (payload.startAt !== undefined) formData.append('startAt', payload.startAt);
  if (payload.endAt !== undefined) formData.append('endAt', payload.endAt);
  if (payload.images !== undefined) formData.append('images', JSON.stringify(payload.images));

  payload.imageFiles?.forEach((file, index) => {
    formData.append('imageFiles', createFormDataImageFile({
      uri: file.uri,
      fileName: file.fileName,
      mimeType: file.mimeType,
      fallbackName: `event-image-${index + 1}`,
    }));
  });
}

function hasUploadFiles(payload: Partial<EventMultipartPayload>): boolean {
  return Boolean(payload.imageFiles?.length);
}

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

export async function createOrganizerEventWithImages(payload: EventMultipartPayload): Promise<ApiEvent> {
  if (!hasUploadFiles(payload)) {
    return createOrganizerEvent(payload);
  }

  const formData = new FormData();
  appendEventPayload(formData, payload);

  return apiFormRequest<ApiEvent>('/organizer/events', formData, {
    method: 'POST',
    requireAuth: true,
  });
}

export async function updateOrganizerEvent(eventId: string, payload: Partial<EventInputPayload>): Promise<ApiEvent> {
  return apiRequest<ApiEvent>(`/organizer/events/${eventId}`, {
    method: 'PUT',
    requireAuth: true,
    body: payload,
  });
}

export async function updateOrganizerEventWithImages(
  eventId: string,
  payload: Partial<EventMultipartPayload>,
): Promise<ApiEvent> {
  if (!hasUploadFiles(payload)) {
    return updateOrganizerEvent(eventId, payload);
  }

  const formData = new FormData();
  appendEventPayload(formData, payload);

  return apiFormRequest<ApiEvent>(`/organizer/events/${eventId}`, formData, {
    method: 'PUT',
    requireAuth: true,
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

export async function getOrganizerProfile(organizerId: string): Promise<OrganizerProfileResponse> {
  return apiRequest<OrganizerProfileResponse>(`/organizer/${organizerId}/profile`, {
    method: 'GET',
    optionalAuth: true,
  });
}

export async function toggleFollowOrganizer(
  organizerId: string,
): Promise<{ following: boolean; followers: number }> {
  return apiRequest<{ following: boolean; followers: number }>(`/organizer/${organizerId}/follow`, {
    method: 'POST',
    requireAuth: true,
  });
}
