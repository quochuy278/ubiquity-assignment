import { AUTH_TOKEN_STORAGE_KEY, createAuthTokenStore } from '@/store';
import { createAuthResponse } from '../fixtures/auth';

describe('auth token store', () => {
  beforeEach(() => window.localStorage.clear());

  it('persists only the refresh token', () => {
    const store = createAuthTokenStore(window.localStorage);

    store.getState().setTokens(createAuthResponse('access-secret', 'refresh-secret'));

    expect(store.getState()).toMatchObject({
      accessToken: 'access-secret',
      refreshToken: 'refresh-secret',
    });

    const persistedState = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    expect(persistedState).toContain('refresh-secret');
    expect(persistedState).not.toContain('access-secret');
  });

  it('rehydrates the refresh token while keeping the access token memory-only', () => {
    const initialStore = createAuthTokenStore(window.localStorage);
    initialStore.getState().setTokens(createAuthResponse('access-secret', 'refresh-secret'));

    const rehydratedStore = createAuthTokenStore(window.localStorage);

    expect(rehydratedStore.getState().accessToken).toBeNull();
    expect(rehydratedStore.getState().refreshToken).toBe('refresh-secret');
  });

  it('clears both in-memory and persisted token state', () => {
    const store = createAuthTokenStore(window.localStorage);
    store.getState().setTokens(createAuthResponse());

    store.getState().clearTokens();

    expect(store.getState().accessToken).toBeNull();
    expect(store.getState().refreshToken).toBeNull();
    expect(window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).not.toContain('refresh-token');
  });
});
