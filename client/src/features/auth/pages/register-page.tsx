import { Navigate } from 'react-router-dom';
import { RegisterForm } from '@/features/auth/components/register-form';
import { useRegister } from '@/features/auth/hooks';
import { useDocumentTitle } from '@/hooks/use-document-title';

export function RegisterPage() {
  const {
    error: registrationError,
    isError: hasRegistrationError,
    isPending: isRegistering,
    isSuccess: isRegistered,
    mutateAsync: register,
  } = useRegister();
  useDocumentTitle('Register');

  if (isRegistered) {
    return <Navigate to="/groups" replace />;
  }

  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-muted/30 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <RegisterForm
          error={registrationError}
          isError={hasRegistrationError}
          isPending={isRegistering}
          onRegister={register}
        />
      </div>
    </main>
  );
}
