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

interface RegisterFormProps extends React.ComponentProps<'div'> {
  error: unknown;
  isError: boolean;
  isPending: boolean;
  onRegister: (values: { displayName: string; email: string; password: string }) => void;
}

export function RegisterForm({
  className,
  error,
  isError,
  isPending,
  onRegister,
  ...props
}: RegisterFormProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    onRegister({
      displayName: String(data.get('displayName')),
      email: String(data.get('email')),
      password: String(data.get('password')),
    });
  };

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>
            <h1>Create your account</h1>
          </CardTitle>
          <CardDescription>Start organizing work with your group.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="displayName">Display name</FieldLabel>
                <Input
                  id="displayName"
                  name="displayName"
                  autoComplete="name"
                  maxLength={100}
                  required
                />
              </Field>
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
                  autoComplete="new-password"
                  minLength={3}
                  maxLength={128}
                  required
                />
              </Field>
              {isError && <AuthError error={error} />}
              <Field>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Creating account...' : 'Create account'}
                </Button>
                <FieldDescription className="text-center">
                  Already registered? <Link to="/login">Sign in</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
