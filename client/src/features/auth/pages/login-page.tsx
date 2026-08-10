import { Navigate, useLocation } from 'react-router-dom';
import { LoginForm } from '@/features/auth/components/login-form';
import { useLogin } from '@/features/auth/hooks';
import { getPostLoginPath } from '@/features/auth/utils';

export function LoginPage() {
  const login = useLogin();
  const location = useLocation();

  if (login.isSuccess) {
    return <Navigate to={getPostLoginPath(location.state)} replace />;
  }

  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-muted/30 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm
          error={login.error}
          isError={login.isError}
          isPending={login.isPending}
          onLogin={login.mutateAsync}
        />
      </div>
    </main>
  );
}
