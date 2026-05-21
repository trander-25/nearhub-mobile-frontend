export interface EventData {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  images?: string[];
  dateLabel: string;
  address: string;
  city: string;
  category: string;
  distanceKm?: number;
  startAt?: string;
  endAt?: string;
  lat?: number;
  lng?: number;
  totalViews?: number;
  rating?: { average: number; total: number };
  isLiked?: boolean;
  isRsvped?: boolean;
  organizer?: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
}

export interface ApiEvent {
  id: string;
  title: string;
  description?: string;
  images?: string[];
  category: string;
  location: {
    address: string;
    city: string | null;
    lat: number;
    lng: number;
  };
  startAt: string;
  endAt: string | null;
  distanceKm?: number;
  totalViews?: number;
  createdBy?: string;
  organizer?: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EventDiscoveryResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  radiusKm?: number;
  items: ApiEvent[];
}

export interface CategoryItem {
  category: string;
  totalEvents: number;
}

export interface ReviewItem {
  id: string;
  eventId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
  user: { id: string; displayName: string; avatarUrl: string | null } | null;
}

export interface EventDetailResponse {
  event: ApiEvent;
  reviews: ReviewItem[];
  rating: { average: number; total: number };
  isFollowingOrganizer?: boolean;
}

export interface NearbyQueryParams {
  lat: number;
  lng: number;
  radius?: number;
  category?: string;
  categories?: string[];
  city?: string;
  keyword?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'closest' | 'farthest' | 'newest' | 'oldest';
  page?: number;
  limit?: number;
}

export interface SearchQueryParams {
  keyword?: string;
  category?: string;
  categories?: string[];
  city?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  sortBy?: 'closest' | 'farthest' | 'newest' | 'oldest' | 'random';
  page?: number;
  limit?: number;
}
