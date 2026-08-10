import type { AuthResponseDto } from '@/api/generated';

const REFRESH_TOKEN_KEY = 'ubiquity.refresh-token';

export interface AuthTokenStore {
  clear(): void;
  getAccessToken(): string | null;
  getRefreshToken(): string | null;
  setFromAuthResponse(response: AuthResponseDto): void;
}

export function createAuthTokenStore(storage: Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>) {
  let accessToken: string | null = null;

  const tokenStore: AuthTokenStore = {
    clear() {
      accessToken = null;
      storage.removeItem(REFRESH_TOKEN_KEY);
    },
    getAccessToken() {
      return accessToken;
    },
    getRefreshToken() {
      return storage.getItem(REFRESH_TOKEN_KEY);
    },
    setFromAuthResponse(response) {
      accessToken = response.accessToken;
      storage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
    },
  };

  return tokenStore;
}

export const authTokenStore = createAuthTokenStore(window.localStorage);
