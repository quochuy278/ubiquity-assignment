import { getApiErrorMessage } from '@/api/errors';
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';

export function ApiError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="mx-auto flex min-h-48 max-w-xl items-center p-6">
      <Alert variant="destructive">
        <AlertTitle>Unable to load this page</AlertTitle>
        <AlertDescription className="space-y-3">
          <p className="first-letter:uppercase">{getApiErrorMessage(error)}</p>
          {onRetry && (
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Try again
            </Button>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}
