import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthError } from '@/features/auth/components/auth-error';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';

interface LoginFormProps extends React.ComponentProps<'div'> {
  error: unknown;
  isError: boolean;
  isPending: boolean;
  onLogin: (credentials: { email: string; password: string }) => void;
}

export function LoginForm({
  className,
  error,
  isError,
  isPending,
  onLogin,
  ...props
}: LoginFormProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    onLogin({
      email: String(data.get('email')),
      password: String(data.get('password')),
    });
  };

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>
            <h1>Welcome back</h1>
          </CardTitle>
          <CardDescription>Sign in to manage your shared todos.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="m@example.com"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  minLength={3}
                  required
                />
              </Field>
              {isError && <AuthError error={error} />}
              <Field>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Signing in...' : 'Sign in'}
                </Button>
                <FieldDescription className="text-center">
                  New here? <Link to="/register">Create an account</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
