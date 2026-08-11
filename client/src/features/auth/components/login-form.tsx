import { type SyntheticEvent, useRef, useState } from 'react';
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
import { Spinner } from '@/shared/components/ui/spinner';

interface LoginFormProps extends React.ComponentProps<'div'> {
  error: unknown;
  isError: boolean;
  isPending: boolean;
  onLogin: (credentials: { email: string; password: string }) => Promise<unknown>;
}

export function LoginForm({
  className,
  error,
  isError,
  isPending,
  onLogin,
  ...props
}: LoginFormProps) {
  const submitLockRef = useRef<boolean>(false);
  const [isLocallyPending, setIsLocallyPending] = useState<boolean>(false);
  const submitPending = isPending || isLocallyPending;

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitLockRef.current) return;

    const data = new FormData(event.currentTarget);
    submitLockRef.current = true;
    setIsLocallyPending(true);

    try {
      await onLogin({
        email: String(data.get('email')),
        password: String(data.get('password')),
      });
    } catch {
      return;
    } finally {
      submitLockRef.current = false;
      setIsLocallyPending(false);
    }
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
                  maxLength={320}
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
                  maxLength={128}
                  required
                />
              </Field>
              {isError && <AuthError error={error} />}
              <Field>
                <Button type="submit" disabled={submitPending} aria-busy={submitPending}>
                  {submitPending ? (
                    <>
                      <Spinner aria-hidden="true" />
                      Signing in...
                    </>
                  ) : (
                    'Sign in'
                  )}
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
