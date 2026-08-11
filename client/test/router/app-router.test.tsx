import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRouter } from '@/router/app-router';
import { testUser } from '../fixtures/auth';

const authMocks = vi.hoisted(() => ({
  useCurrentUser: vi.fn(),
  useLogin: vi.fn(() => ({
    isError: false,
    isPending: false,
    isSuccess: false,
    mutateAsync: vi.fn(),
  })),
  useLogout: vi.fn(() => ({ isPending: false, mutateAsync: vi.fn() })),
  useRegister: vi.fn(() => ({
    isError: false,
    isPending: false,
    isSuccess: false,
    mutateAsync: vi.fn(),
  })),
}));

vi.mock('@/features/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/auth')>()),
  ...authMocks,
}));
vi.mock('@/features/auth/hooks', () => authMocks);
vi.mock('@/features/groups/hooks', () => ({
  useCreateGroup: () => ({ isError: false, isPending: false, mutate: vi.fn() }),
  useGroups: () => ({ data: [], isError: false, isPending: false }),
}));

function renderRoutes(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRouter />
    </MemoryRouter>,
  );
}

describe('application route authentication', () => {
  it('redirects an unauthenticated protected route visit to login', async () => {
    authMocks.useCurrentUser.mockReturnValue({
      data: null,
      isError: false,
      isPending: false,
    });

    renderRoutes('/groups');

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(document.title).toBe('Login | Ubiquity Todo');
  });

  it('allows an authenticated user into the application', async () => {
    authMocks.useCurrentUser.mockReturnValue({
      data: testUser,
      isError: false,
      isPending: false,
    });

    renderRoutes('/groups');

    expect(await screen.findByRole('heading', { name: 'Groups' })).toBeInTheDocument();
    expect(screen.getByText(testUser.displayName)).toBeInTheDocument();
    expect(document.title).toBe('Groups | Ubiquity Todo');
  });

  it('does not redirect while initial authentication is unresolved', () => {
    authMocks.useCurrentUser.mockReturnValue({
      data: undefined,
      isError: false,
      isPending: true,
    });

    renderRoutes('/groups');

    expect(screen.getByText('Checking your session')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Welcome back' })).not.toBeInTheDocument();
  });

  it('keeps authenticated users out of public auth pages', async () => {
    authMocks.useCurrentUser.mockReturnValue({
      data: testUser,
      isError: false,
      isPending: false,
    });

    renderRoutes('/login');

    expect(await screen.findByRole('heading', { name: 'Groups' })).toBeInTheDocument();
  });
});
