import { AxiosError, create, type AxiosInstance, type AxiosRequestConfig } from 'axios';

const DEFAULT_API_BASE_URL = 'https://nearhub-mobile-backend.onrender.com';
const DEFAULT_TIMEOUT_MS = 12000;

let authToken: string | null = null;

type ApiRequestConfig = AxiosRequestConfig & {
  skipAuth?: boolean;
};

function appendApiPath(url: string): string {
  const normalized = url.trim().replace(/\/$/, '');
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
}

function getApiBaseUrl(): string {
  return appendApiPath(DEFAULT_API_BASE_URL);
}

function getRequestTimeoutMs(): number {
  const parsed = 12000;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

export const apiClient: AxiosInstance = create({
  baseURL: getApiBaseUrl(),
  timeout: getRequestTimeoutMs(),
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const requestConfig = config as ApiRequestConfig;

  if (!requestConfig.skipAuth && authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'Cannot connect to Nearhub server. Please try again.';

    return Promise.reject(new Error(message));
  },
);

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

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, requireAuth = false, optionalAuth = false } = options;

  if (requireAuth && !authToken) {
    throw new Error('You must be signed in to perform this action.');
  }

  const config: ApiRequestConfig = {
    url: path,
    method,
    data: body,
    skipAuth: !requireAuth && !optionalAuth,
  };

  const response = await apiClient.request<T>(config);
  return response.data;
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
