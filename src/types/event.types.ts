export interface EventData {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  dateLabel: string;
  address: string;
  city: string;
  category: string;
  distanceKm?: number;
  startAt?: string;
  endAt?: string;
  totalViews?: number;
  rating?: { average: number; total: number };
  isLiked?: boolean;
  isRsvped?: boolean;
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
}

export interface NearbyQueryParams {
  lat: number;
  lng: number;
  radius?: number;
  category?: string;
  city?: string;
  keyword?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'distance' | 'startAt' | 'newest' | 'popular';
  page?: number;
  limit?: number;
}

export interface SearchQueryParams {
  keyword?: string;
  category?: string;
  city?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  sortBy?: 'relevance' | 'distance' | 'startAt' | 'newest' | 'popular';
  page?: number;
  limit?: number;
}
