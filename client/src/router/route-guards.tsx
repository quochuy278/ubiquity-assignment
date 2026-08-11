import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useCurrentUser } from '@/features/auth';
import { ApiError } from '@/shared/components/api-error';
import { PageLoading } from '@/shared/components/page-loading';

export function ProtectedRoute() {
  const {
    data: currentUser,
    error: currentUserError,
    isError: hasCurrentUserError,
    isPending: isLoadingCurrentUser,
    refetch: refetchCurrentUser,
  } = useCurrentUser();
  const location = useLocation();

  if (isLoadingCurrentUser) {
    return <PageLoading label="Checking your session" />;
  }

  if (hasCurrentUserError) {
    return <ApiError error={currentUserError} onRetry={() => refetchCurrentUser()} />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const {
    data: currentUser,
    error: currentUserError,
    isError: hasCurrentUserError,
    isPending: isLoadingCurrentUser,
    refetch: refetchCurrentUser,
  } = useCurrentUser();

  if (isLoadingCurrentUser) {
    return <PageLoading label="Checking your session" />;
  }

  if (hasCurrentUserError) {
    return <ApiError error={currentUserError} onRetry={() => refetchCurrentUser()} />;
  }

  return currentUser ? <Navigate to="/groups" replace /> : <Outlet />;
}
