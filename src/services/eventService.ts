import type {
  ApiEvent,
  CategoryItem,
  EventData,
  EventDetailResponse,
  EventDiscoveryResponse,
  NearbyQueryParams,
  ReviewItem,
  SearchQueryParams,
} from '@/types';
import { apiRequest, buildQueryString } from './apiClient';

const DEFAULT_LAT = 10.7769;
const DEFAULT_LNG = 106.7009;

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

function calcDistanceKm(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
  const earthRadiusKm = 6371;
  const dLat = toRad(toLat - fromLat);
  const dLng = toRad(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((earthRadiusKm * c).toFixed(2));
}

function pickDefined<T extends object>(input?: Partial<T>): Partial<T> {
  if (!input) return {};
  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

function toEventCardData(event: ApiEvent): EventData {
  const startDate = new Date(event.startAt);
  const dateLabel = Number.isNaN(startDate.getTime())
    ? event.startAt
    : startDate.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    imageUrl:
      event.images?.[0] ??
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
    images: event.images?.length ? event.images : undefined,
    dateLabel,
    address: event.location.address,
    city: event.location.city ?? 'Location TBA',
    category: event.category,
    lat: event.location.lat,
    lng: event.location.lng,
    distanceKm:
      event.distanceKm ??
      calcDistanceKm(DEFAULT_LAT, DEFAULT_LNG, event.location.lat, event.location.lng),
    startAt: event.startAt,
    endAt: event.endAt ?? undefined,
    totalViews: event.totalViews,
    organizer: event.organizer ?? null,
  };
}

export async function getNearbyEvents(
  params: NearbyQueryParams,
): Promise<{ events: EventData[]; total: number; totalPages: number; page: number }> {
  const query: NearbyQueryParams = {
    ...params,
    page: params.page ?? 1,
    limit: params.limit ?? 20,
  };

  const qs = buildQueryString(query as unknown as Record<string, unknown>);
  const response = await apiRequest<EventDiscoveryResponse>(`/events/nearby${qs}`);
  return {
    events: (response.items ?? []).map(toEventCardData),
    total: response.total,
    totalPages: response.totalPages,
    page: response.page,
  };
}

export async function searchEvents(
  params?: Partial<SearchQueryParams>,
): Promise<{ events: EventData[]; total: number; totalPages: number; page: number }> {
  const definedParams = pickDefined<SearchQueryParams>(params);
  const query: SearchQueryParams = {
    page: 1,
    limit: 20,
    ...definedParams,
  };

  const qs = buildQueryString(query as unknown as Record<string, unknown>);
  const response = await apiRequest<EventDiscoveryResponse>(`/events/search${qs}`);
  return {
    events: (response.items ?? []).map(toEventCardData),
    total: response.total,
    totalPages: response.totalPages,
    page: response.page,
  };
}

export async function getCategories(): Promise<CategoryItem[]> {
  return apiRequest<CategoryItem[]>('/categories');
}

export async function getEventDetail(
  eventId: string,
): Promise<{
  event: EventData;
  reviews: ReviewItem[];
  rating: { average: number; total: number };
  isFollowingOrganizer?: boolean;
}> {
  const response = await apiRequest<EventDetailResponse>(`/events/${eventId}`);
  return {
    event: toEventCardData(response.event),
    reviews: response.reviews,
    rating: response.rating,
    isFollowingOrganizer: response.isFollowingOrganizer,
  };
}

export async function toggleLikeEvent(
  eventId: string,
): Promise<{ liked: boolean }> {
  const response = await apiRequest<{ message: string; liked: boolean }>(`/events/${eventId}/like`, {
    method: 'POST',
    requireAuth: true,
  });
  return { liked: response.liked };
}

export async function rsvpEvent(eventId: string): Promise<void> {
  await apiRequest<{ message: string }>(`/events/${eventId}/rsvp`, {
    method: 'POST',
    requireAuth: true,
  });
}

export async function cancelRsvp(eventId: string): Promise<void> {
  await apiRequest<{ message: string }>(`/events/${eventId}/rsvp`, {
    method: 'DELETE',
    requireAuth: true,
  });
}

export async function submitReview(
  eventId: string,
  rating: number,
  comment: string,
): Promise<void> {
  await apiRequest<{ message: string }>(`/events/${eventId}/reviews`, {
    method: 'POST',
    requireAuth: true,
    body: { rating, comment },
  });
}

export async function getEventDiscovery(keyword?: string): Promise<EventData[]> {
  const query = keyword?.trim();
  if (query) {
    const result = await searchEvents({ keyword: query });
    return result.events;
  }
  const result = await getNearbyEvents({
    lat: DEFAULT_LAT,
    lng: DEFAULT_LNG,
    radius: 100,
    page: 1,
    limit: 20,
  });
  return result.events;
}
