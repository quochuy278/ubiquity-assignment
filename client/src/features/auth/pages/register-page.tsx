import type { FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AuthCard } from '@/features/auth/components/auth-card';
import { AuthError } from '@/features/auth/components/auth-error';
import { AuthFormField } from '@/features/auth/components/auth-form-field';
import { useRegister } from '@/features/auth/hooks';
import { Button } from '@/shared/components/ui/button';

export function RegisterPage() {
  const register = useRegister();

  if (register.isSuccess) {
    return <Navigate to="/groups" replace />;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    register.mutate({
      displayName: String(data.get('displayName')),
      email: String(data.get('email')),
      password: String(data.get('password')),
    });
  };

  return (
    <AuthCard title="Create your account" description="Start organizing work with your group.">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <AuthFormField id="displayName" label="Display name" autoComplete="name" maxLength={100} />
        <AuthFormField id="email" label="Email" type="email" autoComplete="email" />
        <AuthFormField
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          minLength={3}
          maxLength={128}
        />
        {register.isError && <AuthError error={register.error} />}
        <Button className="w-full" type="submit" disabled={register.isPending}>
          {register.isPending ? 'Creating account...' : 'Create account'}
        </Button>
      </form>
      <p className="text-center text-muted-foreground text-sm">
        Already registered?{' '}
        <Link className="font-medium text-foreground underline underline-offset-4" to="/login">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
