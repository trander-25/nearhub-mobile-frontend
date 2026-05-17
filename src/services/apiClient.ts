import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = 8020;
const DEFAULT_TIMEOUT_MS = 12000;

let resolvedBaseUrl: string | null = null;

function appendApiPath(url: string): string {
  const normalized = url.replace(/\/$/, '');
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
}

function getExpoDevServerHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.manifest?.hostUri;
  if (!hostUri) return null;

  const host = hostUri.replace(/^https?:\/\//, '').replace(/^exp:\/\//, '').split('/')[0]?.split(':')[0];
  return host || null;
}

function getWebHost(): string | null {
  if (Platform.OS !== 'web') return null;
  const hostname = (globalThis as { location?: { hostname?: string } }).location?.hostname;
  return hostname || null;
}

function uniqueUrls(urls: string[]): string[] {
  return [...new Set(urls)];
}

function getBaseUrls(): string[] {
  const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envBaseUrl) {
    return [appendApiPath(envBaseUrl)];
  }

  const devServerHost = getExpoDevServerHost();
  const webHost = getWebHost();
  const candidates =
    Platform.OS === 'android'
      ? [
          devServerHost ? `http://${devServerHost}:${API_PORT}/api` : '',
          `http://10.0.2.2:${API_PORT}/api`,
          `http://localhost:${API_PORT}/api`,
        ]
      : [
          devServerHost ? `http://${devServerHost}:${API_PORT}/api` : '',
          webHost ? `http://${webHost}:${API_PORT}/api` : '',
          `http://localhost:${API_PORT}/api`,
          `http://127.0.0.1:${API_PORT}/api`,
        ];

  const urls = uniqueUrls(candidates.filter(Boolean));

  if (!resolvedBaseUrl) {
    return urls;
  }

  return [resolvedBaseUrl, ...urls.filter((url) => url !== resolvedBaseUrl)];
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
  optionalAuth?: boolean;
}

class ApiHttpError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiHttpError';
  }
}

function getRequestTimeoutMs(): number {
  const parsed = Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, requireAuth = false, optionalAuth = false } = options;
  let lastError: Error | null = null;
  const baseUrls = getBaseUrls();

  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (requireAuth) {
    if (!authToken) {
      throw new Error('You must be signed in to perform this action.');
    }
    headers['Authorization'] = `Bearer ${authToken}`;
  } else if (optionalAuth && authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  for (const baseUrl of baseUrls) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), getRequestTimeoutMs());

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiHttpError(
          (errorData as { message?: string }).message || `Request failed with status ${response.status}`
        );
      }

      resolvedBaseUrl = baseUrl;
      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ApiHttpError) {
        throw error;
      }
      if (resolvedBaseUrl === baseUrl) {
        resolvedBaseUrl = null;
      }
      lastError = error instanceof Error ? error : new Error('Network error');
    } finally {
      clearTimeout(timeout);
    }
  }

  const suffix = baseUrls.length ? ` Tried: ${baseUrls.join(', ')}` : '';
  throw lastError ?? new Error(`Network error.${suffix}`);
}

export function buildQueryString(params: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value
        .filter((item) => item !== undefined && item !== null && item !== '')
        .forEach((item) => {
          parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`);
        });
    } else if (value !== undefined && value !== null && value !== '') {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}
