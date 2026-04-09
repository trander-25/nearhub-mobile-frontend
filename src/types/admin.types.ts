import type { AuthUser } from './auth.types';
import type { ApiEvent } from './event.types';

export type AdminEventStatus = 'pending' | 'approved' | 'rejected' | 'hidden';
export type AdminUserRole = 'user' | 'organizer' | 'admin';

export interface AdminPaginationResponse<T> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: T[];
}

export type AdminPendingEventsResponse = AdminPaginationResponse<ApiEvent>;
export type AdminUsersResponse = AdminPaginationResponse<AuthUser>;

export interface AdminBroadcastInput {
  title: string;
  body: string;
  eventId?: string;
}

export interface AdminBroadcastResponse {
  message: string;
  totalSent: number;
}

export interface AdminUpdateEventStatusInput {
  status: AdminEventStatus;
  moderationNote?: string;
}

export interface AdminUpdateUserInput {
  userId: string;
  role?: AdminUserRole;
  isBlocked?: boolean;
}
