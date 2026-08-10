import axios from 'axios';
import { authTokenStore } from '@/api/auth-tokens';
import { AuthApi, Configuration, GroupsApi, TodoListsApi, TodosApi } from '@/api/generated';
import { createAuthenticatedHttpClient } from '@/api/http-client';
import { queryClient } from '@/api/query-client';
import { queryKeys } from '@/api/query-keys';
import { configuration } from '@/config/configuration';

const generatedConfiguration = new Configuration({ basePath: configuration.api.baseUrl });
const refreshApi = new AuthApi(
  generatedConfiguration,
  undefined,
  axios.create({
    baseURL: configuration.api.baseUrl,
    timeout: configuration.api.timeoutMs,
  }),
);

const httpClient = createAuthenticatedHttpClient({
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

export const authApi = new AuthApi(generatedConfiguration, undefined, httpClient);
export const groupsApi = new GroupsApi(generatedConfiguration, undefined, httpClient);
export const todoListsApi = new TodoListsApi(generatedConfiguration, undefined, httpClient);
export const todosApi = new TodosApi(generatedConfiguration, undefined, httpClient);
