import { Platform } from 'react-native';

const API_PORT = 8020;

function getBaseUrls(): string[] {
  const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envBaseUrl) {
    return [envBaseUrl.replace(/\/$/, '')];
  }

  if (Platform.OS === 'android') {
    return [`http://10.0.2.2:${API_PORT}/api`, `http://localhost:${API_PORT}/api`];
  }

  return [`http://localhost:${API_PORT}/api`, `http://127.0.0.1:${API_PORT}/api`];
}

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH';
  body?: unknown;
  requireAuth?: boolean;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, requireAuth = false } = options;
  let lastError: Error | null = null;

  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (requireAuth) {
    if (!authToken) {
      throw new Error('Bạn cần đăng nhập để thực hiện thao tác này.');
    }
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  for (const baseUrl of getBaseUrls()) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { message?: string }).message || `Request failed with status ${response.status}`
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Network error');
    }
  }

  throw lastError ?? new Error('Network error');
}

export function buildQueryString(params: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}
