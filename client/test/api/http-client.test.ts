import {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { createAuthTokenStore } from '@/api/auth';
import { ApiClientError } from '@/api/errors';
import { ErrorCode } from '@/api/generated';
import { createAuthenticatedHttpClient } from '@/api/http-client';
import { DEFAULT_API_TIMEOUT_MS } from '@/config/api-timeout';
import { createAuthResponse } from '../fixtures/auth';

function failedResponse(config: InternalAxiosRequestConfig, status: number, data: unknown) {
  const response: AxiosResponse = {
    config,
    data,
    headers: {},
    status,
    statusText: 'Request failed',
  };
  return new AxiosError('Request failed', AxiosError.ERR_BAD_REQUEST, config, undefined, response);
}

function unauthorized(config: InternalAxiosRequestConfig) {
  return failedResponse(config, 401, { code: ErrorCode.Unauthorized });
}

function successfulResponse(config: InternalAxiosRequestConfig): AxiosResponse<{ ok: true }> {
  return {
    config,
    data: { ok: true },
    headers: {},
    status: 200,
    statusText: 'OK',
  };
}

describe('authenticated HTTP client', () => {
  beforeEach(() => window.localStorage.clear());

  it('refreshes expired authentication and retries the original request once', async () => {
    const tokens = createAuthTokenStore(window.localStorage);
    tokens.setFromAuthResponse(createAuthResponse('expired-access', 'valid-refresh'));
    const refresh = vi.fn(async () => createAuthResponse('fresh-access', 'rotated-refresh'));
    const client = createAuthenticatedHttpClient({
      baseUrl: 'http://api.test',
      onAuthenticationFailure: vi.fn(),
      refresh,
      timeoutMs: DEFAULT_API_TIMEOUT_MS,
      tokens,
    });

    const response = await client.get('/api/v1/groups', {
      adapter: async (config) => {
        const headers = AxiosHeaders.from(config.headers);
        if (headers.get('Authorization') !== 'Bearer fresh-access') throw unauthorized(config);
        return successfulResponse(config);
      },
    });

    expect(response.data).toEqual({ ok: true });
    expect(refresh).toHaveBeenCalledOnce();
    expect(tokens.getRefreshToken()).toBe('rotated-refresh');
  });

  it('clears authentication when refresh fails', async () => {
    const tokens = createAuthTokenStore(window.localStorage);
    tokens.setFromAuthResponse(createAuthResponse('expired-access', 'invalid-refresh'));
    const onAuthenticationFailure = vi.fn();
    const client = createAuthenticatedHttpClient({
      baseUrl: 'http://api.test',
      onAuthenticationFailure,
      refresh: vi.fn(async () => {
        throw new Error('Refresh rejected');
      }),
      timeoutMs: DEFAULT_API_TIMEOUT_MS,
      tokens,
    });

    await expect(
      client.get('/api/v1/groups', {
        adapter: async (config) => Promise.reject(unauthorized(config)),
      }),
    ).rejects.toMatchObject({
      code: ErrorCode.UnknownError,
      status: null,
    });

    expect(tokens.getAccessToken()).toBeNull();
    expect(tokens.getRefreshToken()).toBeNull();
    expect(onAuthenticationFailure).toHaveBeenCalledOnce();
  });

  it('shares one refresh operation across concurrent authentication failures', async () => {
    const tokens = createAuthTokenStore(window.localStorage);
    tokens.setFromAuthResponse(createAuthResponse('expired-access', 'valid-refresh'));
    let resolveRefresh: (value: ReturnType<typeof createAuthResponse>) => void = () => undefined;
    const refresh = vi.fn(
      () =>
        new Promise<ReturnType<typeof createAuthResponse>>((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    const client = createAuthenticatedHttpClient({
      baseUrl: 'http://api.test',
      onAuthenticationFailure: vi.fn(),
      refresh,
      timeoutMs: DEFAULT_API_TIMEOUT_MS,
      tokens,
    });
    const adapter = async (config: InternalAxiosRequestConfig) => {
      const headers = AxiosHeaders.from(config.headers);
      if (headers.get('Authorization') !== 'Bearer fresh-access') throw unauthorized(config);
      return successfulResponse(config);
    };

    const requests = [
      client.get('/api/v1/groups', { adapter }),
      client.get('/api/v1/groups', { adapter }),
    ];
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    resolveRefresh(createAuthResponse('fresh-access', 'rotated-refresh'));

    await expect(Promise.all(requests)).resolves.toHaveLength(2);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('normalizes a 403 backend response without attempting token refresh', async () => {
    const tokens = createAuthTokenStore(window.localStorage);
    tokens.setFromAuthResponse(createAuthResponse());
    const refresh = vi.fn(async () => createAuthResponse());
    const client = createAuthenticatedHttpClient({
      baseUrl: 'http://api.test',
      onAuthenticationFailure: vi.fn(),
      refresh,
      timeoutMs: DEFAULT_API_TIMEOUT_MS,
      tokens,
    });

    await expect(
      client.get('/api/v1/groups/group-1', {
        adapter: async (config) =>
          Promise.reject(failedResponse(config, 403, { code: ErrorCode.GroupNotFound })),
      }),
    ).rejects.toMatchObject({
      code: ErrorCode.GroupNotFound,
      errors: [],
      status: 403,
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it('preserves typed validation details from the backend error model', async () => {
    const tokens = createAuthTokenStore(window.localStorage);
    const client = createAuthenticatedHttpClient({
      baseUrl: 'http://api.test',
      onAuthenticationFailure: vi.fn(),
      refresh: vi.fn(async () => createAuthResponse()),
      timeoutMs: DEFAULT_API_TIMEOUT_MS,
      tokens,
    });
    const validationErrors = [{ field: 'title', messages: ['title should not be empty'] }];

    const request = client.post('/api/v1/groups', undefined, {
      adapter: async (config) =>
        Promise.reject(
          failedResponse(config, 400, {
            code: ErrorCode.ValidationError,
            errors: validationErrors,
          }),
        ),
    });

    await expect(request).rejects.toMatchObject({
      code: ErrorCode.ValidationError,
      errors: validationErrors,
      status: 400,
    });
  });

  it('normalizes a request with no server response as a network error', async () => {
    const tokens = createAuthTokenStore(window.localStorage);
    const client = createAuthenticatedHttpClient({
      baseUrl: 'http://api.test',
      onAuthenticationFailure: vi.fn(),
      refresh: vi.fn(async () => createAuthResponse()),
      timeoutMs: DEFAULT_API_TIMEOUT_MS,
      tokens,
    });

    const request = client.get('/api/v1/groups', {
      adapter: async (config) =>
        Promise.reject(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config)),
    });

    await expect(request).rejects.toBeInstanceOf(ApiClientError);
    await expect(request).rejects.toMatchObject({
      code: ErrorCode.NetworkError,
      errors: [],
      status: null,
    });
  });

  it('distinguishes a client-side timeout from other network failures', async () => {
    const tokens = createAuthTokenStore(window.localStorage);
    const client = createAuthenticatedHttpClient({
      baseUrl: 'http://api.test',
      onAuthenticationFailure: vi.fn(),
      refresh: vi.fn(async () => createAuthResponse()),
      timeoutMs: DEFAULT_API_TIMEOUT_MS,
      tokens,
    });

    await expect(
      client.get('/api/v1/groups', {
        adapter: async (config) =>
          Promise.reject(new AxiosError('Timeout', 'ECONNABORTED', config)),
      }),
    ).rejects.toMatchObject({
      code: ErrorCode.TimeoutError,
      status: null,
    });
  });

  it.each([
    [500, ErrorCode.ServerError],
    [503, ErrorCode.ServiceUnavailable],
    [504, ErrorCode.TimeoutError],
  ])('maps an unstructured HTTP %i response to %s', async (status, expectedCode) => {
    const tokens = createAuthTokenStore(window.localStorage);
    const client = createAuthenticatedHttpClient({
      baseUrl: 'http://api.test',
      onAuthenticationFailure: vi.fn(),
      refresh: vi.fn(async () => createAuthResponse()),
      timeoutMs: DEFAULT_API_TIMEOUT_MS,
      tokens,
    });

    await expect(
      client.get('/api/v1/groups', {
        adapter: async (config) => Promise.reject(failedResponse(config, status, {})),
      }),
    ).rejects.toMatchObject({ code: expectedCode, status });
  });
});
