import { getApiErrorMessage } from '@/api/errors';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';

export function AuthError({ error }: { error: unknown }) {
  return (
    <Alert variant="destructive">
      <AlertDescription className="first-letter:uppercase">
        {getApiErrorMessage(error)}
      </AlertDescription>
    </Alert>
  );
}
