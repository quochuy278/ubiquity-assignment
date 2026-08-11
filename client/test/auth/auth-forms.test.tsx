import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginForm } from '@/features/auth/components/login-form';
import { RegisterForm } from '@/features/auth/components/register-form';

describe('authentication forms', () => {
  it('locks two synchronous login submissions until the request settles', async () => {
    let rejectLogin: (error: Error) => void = () => undefined;
    const onLogin = vi.fn(
      () =>
        new Promise((_resolve, reject) => {
          rejectLogin = reject;
        }),
    );

    render(
      <MemoryRouter>
        <LoginForm error={null} isError={false} isPending={false} onLogin={onLogin} />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'reviewer@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } });
    const form = screen.getByRole('button', { name: 'Sign in' }).closest('form');
    if (!form) throw new Error('Login form not found');

    act(() => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });

    expect(onLogin).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Signing in...' })).toBeDisabled();

    await act(async () => rejectLogin(new Error('Invalid credentials')));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled());

    fireEvent.submit(form);
    expect(onLogin).toHaveBeenCalledTimes(2);
  });

  it('mirrors the generated auth constraints in native inputs', () => {
    render(
      <MemoryRouter>
        <RegisterForm
          error={null}
          isError={false}
          isPending={false}
          onRegister={vi.fn().mockResolvedValue(undefined)}
        />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('Display name')).toHaveAttribute('maxlength', '100');
    expect(screen.getByLabelText('Email')).toHaveAttribute('maxlength', '320');
    expect(screen.getByLabelText('Password')).toHaveAttribute('minlength', '3');
    expect(screen.getByLabelText('Password')).toHaveAttribute('maxlength', '128');
  });
});
