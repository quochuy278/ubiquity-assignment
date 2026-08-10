import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/api/auth/api';
import { authTokenStore } from '@/api/auth/tokens';
import { ApiClientError } from '@/api/errors';
import type { LoginRequestDto, RegisterRequestDto } from '@/api/generated';
import { queryKeys } from '@/api/query-keys';

export function useCurrentUserQuery() {
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: async () => {
      if (!authTokenStore.getAccessToken() && !authTokenStore.getRefreshToken()) {
        return null;
      }

      try {
        const response = await authApi.authControllerMeV1();
        return response.data;
      } catch (error) {
        if (error instanceof ApiClientError && error.status === 401) {
          return null;
        }
        throw error;
      }
    },
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (loginRequestDto: LoginRequestDto) => {
      const response = await authApi.authControllerLoginV1({ loginRequestDto });
      return response.data;
    },
    onSuccess: (response) => {
      authTokenStore.setFromAuthResponse(response);
      queryClient.setQueryData(queryKeys.auth.me, response.user);
    },
  });
}

export function useRegisterMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (registerRequestDto: RegisterRequestDto) => {
      const response = await authApi.authControllerRegisterV1({ registerRequestDto });
      return response.data;
    },
    onSuccess: (response) => {
      authTokenStore.setFromAuthResponse(response);
      queryClient.setQueryData(queryKeys.auth.me, response.user);
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (authTokenStore.getAccessToken()) {
        await authApi.authControllerLogoutV1();
      }
    },
    onSettled: () => {
      authTokenStore.clear();
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'auth' });
      queryClient.setQueryData(queryKeys.auth.me, null);
    },
  });
}
