import type { ApiEvent } from './event.types';

export interface OrganizerStats {
  totalEvents: number;
  totalViews: number;
  totalRsvps: number;
  averageRating: number;
}

export interface OrganizerAttendee {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  email?: string;
  createdAt?: string;
}

export interface EventInputPayload {
  title: string;
  description: string;
  category: string;
  lat: number;
  lng: number;
  address: string;
  city?: string;
  startAt: string;
  endAt?: string;
  images?: string[];
}

export interface EventAttendeesResponse {
  event: ApiEvent;
  attendees: OrganizerAttendee[];
}
