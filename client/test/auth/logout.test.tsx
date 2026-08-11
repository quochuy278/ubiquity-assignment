import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { authApi } from '@/api/auth';
import { queryKeys } from '@/api/query-keys';
import { AppRouter } from '@/router/app-router';
import { authTokenStore } from '@/store';
import { createAuthResponse, testUser } from '../fixtures/auth';

vi.mock('@/features/groups/hooks', () => ({
  useAcceptInvitation: () => ({ isError: false, isPending: false, mutateAsync: vi.fn() }),
  useCreateFirstList: () => ({
    hasCreatedPersonalWorkspace: false,
    isError: false,
    isPending: false,
    mutateAsync: vi.fn(),
    reset: vi.fn(),
  }),
  useCreateGroup: () => ({ isError: false, isPending: false, mutate: vi.fn() }),
  useGroups: () => ({ data: [], isError: false, isPending: false }),
  usePendingInvitations: () => ({ data: [], isError: false, isPending: false, isSuccess: true }),
}));

describe('logout', () => {
  afterEach(() => {
    authTokenStore.getState().clearTokens();
    vi.restoreAllMocks();
  });

  it('clears authenticated state and returns to login', async () => {
    const user = userEvent.setup();
    const testQueryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    authTokenStore.getState().setTokens(createAuthResponse());
    testQueryClient.setQueryData(queryKeys.auth.me, testUser);
    vi.spyOn(authApi, 'authControllerLogoutV1').mockResolvedValue({ data: {} } as never);

    render(
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter initialEntries={['/groups']}>
          <AppRouter />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(authTokenStore.getState().refreshToken).toBeNull();
  });

  it('prevents two synchronous logout requests', async () => {
    let resolveLogout: (value: { data: object }) => void = () => undefined;
    const testQueryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    authTokenStore.getState().setTokens(createAuthResponse());
    testQueryClient.setQueryData(queryKeys.auth.me, testUser);
    const logout = vi.spyOn(authApi, 'authControllerLogoutV1').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLogout = resolve as typeof resolveLogout;
        }) as never,
    );

    render(
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter initialEntries={['/groups']}>
          <AppRouter />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const button = await screen.findByRole('button', { name: 'Sign out' });
    act(() => {
      button.click();
      button.click();
    });

    await waitFor(() => expect(logout).toHaveBeenCalledOnce());
    expect(screen.getByRole('button', { name: 'Signing out...' })).toBeDisabled();

    await act(async () => {
      resolveLogout({ data: {} });
    });
    await waitFor(() => expect(authTokenStore.getState().refreshToken).toBeNull());
  });
});
