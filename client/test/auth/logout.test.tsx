import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { authApi } from '@/api/auth';
import { queryKeys } from '@/api/query-keys';
import { AppRouter } from '@/router/app-router';
import { authTokenStore } from '@/store';
import { createAuthResponse, testUser } from '../fixtures/auth';

vi.mock('@/features/groups/hooks', () => ({
  useGroups: () => ({ data: [], isError: false, isPending: false }),
}));

describe('logout', () => {
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
});
