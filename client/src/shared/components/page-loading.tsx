import { Spinner } from '@/shared/components/ui/spinner';

export function PageLoading({ label = 'Loading' }: { label?: string }) {
  return (
    <div
      className="flex min-h-48 items-center justify-center gap-2 text-muted-foreground"
      role="status"
    >
      <Spinner aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
