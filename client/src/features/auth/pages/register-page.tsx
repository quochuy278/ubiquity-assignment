import { Navigate } from 'react-router-dom';
import { RegisterForm } from '@/features/auth/components/register-form';
import { useRegister } from '@/features/auth/hooks';
import { useDocumentTitle } from '@/hooks/use-document-title';

export function RegisterPage() {
  const register = useRegister();
  useDocumentTitle('Register');

  if (register.isSuccess) {
    return <Navigate to="/groups" replace />;
  }

  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-muted/30 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <RegisterForm
          error={register.error}
          isError={register.isError}
          isPending={register.isPending}
          onRegister={register.mutateAsync}
        />
      </div>
    </main>
  );
}
