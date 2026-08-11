import { Navigate, useLocation } from 'react-router-dom';
import { LoginForm } from '@/features/auth/components/login-form';
import { useLogin } from '@/features/auth/hooks';
import { getPostLoginPath } from '@/features/auth/utils';
import { useDocumentTitle } from '@/hooks/use-document-title';

export function LoginPage() {
  const {
    error: loginError,
    isError: hasLoginError,
    isPending: isLoggingIn,
    isSuccess: isLoggedIn,
    mutateAsync: login,
  } = useLogin();
  const location = useLocation();
  useDocumentTitle('Login');

  if (isLoggedIn) {
    return <Navigate to={getPostLoginPath(location.state)} replace />;
  }

  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-muted/30 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm
          error={loginError}
          isError={hasLoginError}
          isPending={isLoggingIn}
          onLogin={login}
        />
      </div>
    </main>
  );
}
