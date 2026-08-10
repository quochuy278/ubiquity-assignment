import axios from 'axios';
import { AuthApi, Configuration } from '@/api/generated';
import { createAuthenticatedHttpClient } from '@/api/http-client';
import { queryClient } from '@/api/query-client';
import { queryKeys } from '@/api/query-keys';
import { configuration } from '@/config/configuration';
import { authTokenStore } from '@/store';

export const generatedApiConfiguration = new Configuration({
  basePath: configuration.api.baseUrl,
});
const refreshApi = new AuthApi(
  generatedApiConfiguration,
  undefined,
  axios.create({
    baseURL: configuration.api.baseUrl,
    timeout: configuration.api.timeoutMs,
  }),
);

export const httpClient = createAuthenticatedHttpClient({
  baseUrl: configuration.api.baseUrl,
  tokens: authTokenStore,
  refresh: async (refreshToken) => {
    const response = await refreshApi.authControllerRefreshV1({
      refreshRequestDto: { refreshToken },
    });
    return response.data;
  },
  timeoutMs: configuration.api.timeoutMs,
  onAuthenticationFailure: () => {
    queryClient.setQueryData(queryKeys.auth.me, null);
    queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'auth' });
  },
});
