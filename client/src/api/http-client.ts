import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import type { AuthTokenStore } from '@/api/auth-tokens';
import { normalizeApiError } from '@/api/errors';
import type { AuthResponseDto } from '@/api/generated';

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  authRetryAttempted?: boolean;
}

interface AuthenticatedHttpClientOptions {
  baseUrl: string;
  onAuthenticationFailure: () => void;
  refresh: (refreshToken: string) => Promise<AuthResponseDto>;
  timeoutMs: number;
  tokens: AuthTokenStore;
}

const PUBLIC_AUTH_PATHS = ['/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/refresh'];

function isPublicAuthRequest(url: string | undefined) {
  return PUBLIC_AUTH_PATHS.some((path) => url?.endsWith(path));
}

export function createAuthenticatedHttpClient({
  baseUrl,
  onAuthenticationFailure,
  refresh,
  timeoutMs,
  tokens,
}: AuthenticatedHttpClientOptions): AxiosInstance {
  const client = axios.create({ baseURL: baseUrl, timeout: timeoutMs });
  let refreshPromise: Promise<string> | null = null;

  client.interceptors.request.use((config) => {
    const accessToken = tokens.getAccessToken();

    if (accessToken && !isPublicAuthRequest(config.url)) {
      config.headers.set('Authorization', `Bearer ${accessToken}`);
    }

    return config;
  });

  client.interceptors.response.use(undefined, async (error: unknown) => {
    if (!(error instanceof AxiosError) || error.response?.status !== 401 || !error.config) {
      throw normalizeApiError(error);
    }

    const originalRequest = error.config as RetriableRequestConfig;
    const refreshToken = tokens.getRefreshToken();

    if (
      originalRequest.authRetryAttempted ||
      isPublicAuthRequest(originalRequest.url) ||
      !refreshToken
    ) {
      if (!isPublicAuthRequest(originalRequest.url)) {
        tokens.clear();
        onAuthenticationFailure();
      }
      throw normalizeApiError(error);
    }

    originalRequest.authRetryAttempted = true;

    refreshPromise ??= refresh(refreshToken)
      .then((response) => {
        tokens.setFromAuthResponse(response);
        return response.accessToken;
      })
      .catch((refreshError: unknown) => {
        tokens.clear();
        onAuthenticationFailure();
        throw normalizeApiError(refreshError);
      })
      .finally(() => {
        refreshPromise = null;
      });

    const accessToken = await refreshPromise;
    originalRequest.headers = AxiosHeaders.from(originalRequest.headers);
    originalRequest.headers.set('Authorization', `Bearer ${accessToken}`);

    return client(originalRequest);
  });

  return client;
}
