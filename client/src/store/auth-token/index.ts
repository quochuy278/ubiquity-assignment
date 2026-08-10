import type { StateStorage } from 'zustand/middleware';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createStore, type StoreApi } from 'zustand/vanilla';

export const AUTH_TOKEN_STORAGE_KEY = 'ubiquity.auth-token-state';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthTokenState {
  accessToken: string | null;
  refreshToken: string | null;
  clearTokens: () => void;
  setTokens: (tokens: AuthTokens) => void;
}

export type AuthTokenStore = StoreApi<AuthTokenState>;

export function createAuthTokenStore(storage: StateStorage = window.localStorage): AuthTokenStore {
  return createStore<AuthTokenState>()(
    persist(
      (set) => ({
        accessToken: null,
        refreshToken: null,
        clearTokens: () => set({ accessToken: null, refreshToken: null }),
        setTokens: (tokens) =>
          set({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          }),
      }),
      {
        name: AUTH_TOKEN_STORAGE_KEY,
        partialize: (state) => ({ refreshToken: state.refreshToken }),
        storage: createJSONStorage(() => storage),
      },
    ),
  );
}

export const authTokenStore = createAuthTokenStore();
