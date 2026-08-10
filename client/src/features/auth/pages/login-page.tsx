import type { FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { AuthCard } from '@/features/auth/components/auth-card';
import { AuthError } from '@/features/auth/components/auth-error';
import { AuthFormField } from '@/features/auth/components/auth-form-field';
import { useLogin } from '@/features/auth/hooks';
import { getPostLoginPath } from '@/features/auth/utils';
import { Button } from '@/shared/components/ui/button';

export function LoginPage() {
  const login = useLogin();
  const location = useLocation();

  if (login.isSuccess) {
    return <Navigate to={getPostLoginPath(location.state)} replace />;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    login.mutate({ email: String(data.get('email')), password: String(data.get('password')) });
  };

  return (
    <AuthCard title="Welcome back" description="Sign in to manage your shared todos.">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <AuthFormField id="email" label="Email" type="email" autoComplete="email" />
        <AuthFormField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          minLength={3}
        />
        {login.isError && <AuthError error={login.error} />}
        <Button className="w-full" type="submit" disabled={login.isPending}>
          {login.isPending ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
      <p className="text-center text-muted-foreground text-sm">
        New here?{' '}
        <Link className="font-medium text-foreground underline underline-offset-4" to="/register">
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}
