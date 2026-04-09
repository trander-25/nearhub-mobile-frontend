export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'system' | 'event' | 'admin';
  eventId: string | null;
  metadata: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: Notification[];
}
