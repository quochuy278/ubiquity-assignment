import { getApiErrorMessage } from '@/api/errors';
import { SafeButton } from '@/shared/components/safe-button';
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert';

export function ApiError({ error, onRetry }: { error: unknown; onRetry?: () => Promise<unknown> }) {
  return (
    <div className="mx-auto flex min-h-48 max-w-xl items-center p-6">
      <Alert variant="destructive">
        <AlertTitle>Unable to load this page</AlertTitle>
        <AlertDescription className="space-y-3">
          <p className="first-letter:uppercase">{getApiErrorMessage(error)}</p>
          {onRetry && (
            <SafeButton variant="outline" size="sm" pendingText="Retrying..." onAction={onRetry}>
              Try again
            </SafeButton>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}
