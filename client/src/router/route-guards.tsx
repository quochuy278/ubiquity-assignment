import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useCurrentUser } from '@/features/auth';
import { ApiError } from '@/shared/components/api-error';
import { PageLoading } from '@/shared/components/page-loading';

export function ProtectedRoute() {
  const currentUser = useCurrentUser();
  const location = useLocation();

  if (currentUser.isPending) {
    return <PageLoading label="Checking your session" />;
  }

  if (currentUser.isError) {
    return <ApiError error={currentUser.error} onRetry={() => currentUser.refetch()} />;
  }

  if (!currentUser.data) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const currentUser = useCurrentUser();

  if (currentUser.isPending) {
    return <PageLoading label="Checking your session" />;
  }

  if (currentUser.isError) {
    return <ApiError error={currentUser.error} onRetry={() => currentUser.refetch()} />;
  }

  return currentUser.data ? <Navigate to="/groups" replace /> : <Outlet />;
}
