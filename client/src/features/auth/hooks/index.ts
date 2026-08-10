import {
  useCurrentUserQuery,
  useLoginMutation,
  useLogoutMutation,
  useRegisterMutation,
} from '@/api/auth';

export function useCurrentUser() {
  return useCurrentUserQuery();
}

export function useLogin() {
  return useLoginMutation();
}

export function useRegister() {
  return useRegisterMutation();
}

export function useLogout() {
  return useLogoutMutation();
}
