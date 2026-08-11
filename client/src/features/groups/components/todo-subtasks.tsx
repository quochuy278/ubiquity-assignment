import { CircleCheckIcon, CircleIcon } from 'lucide-react';
import { getApiErrorMessage } from '@/api/errors';
import { CreateSubtaskDialog } from '@/features/groups/components/create-subtask-dialog';
import { SubtaskCompletionControl } from '@/features/groups/components/subtask-completion-control';
import { useSubtasks } from '@/features/groups/hooks';
import { SafeButton } from '@/shared/components/safe-button';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';

export function TodoSubtasks({ todoId }: { todoId: string }) {
  const {
    data: subtasks,
    error: subtasksError,
    isError: hasSubtasksError,
    isFetching: isFetchingSubtasks,
    isPending: isLoadingSubtasks,
    refetch: refetchSubtasks,
  } = useSubtasks(todoId);
  const completedCount = subtasks?.filter((subtask) => subtask.completed).length ?? 0;

  return (
    <section className="space-y-3 border-t pt-4" aria-label="Subtasks">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium text-sm">Subtasks</p>
        <CreateSubtaskDialog todoId={todoId} />
      </div>

      {isLoadingSubtasks && (
        <p className="text-muted-foreground text-xs" role="status">
          Loading subtasks...
        </p>
      )}
      {hasSubtasksError && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-3">
            <span className="first-letter:uppercase">{getApiErrorMessage(subtasksError)}</span>
            <SafeButton
              variant="outline"
              size="xs"
              pending={isFetchingSubtasks}
              pendingText="Retrying..."
              onAction={() => refetchSubtasks()}
            >
              Retry
            </SafeButton>
          </AlertDescription>
        </Alert>
      )}
      {subtasks && subtasks.length > 0 && (
        <div className="ml-2 space-y-2 border-l pl-4">
          <ul className="divide-y">
            {subtasks.map((subtask) => (
              <li key={subtask.id} className="flex min-h-9 items-center justify-between gap-3 py-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {subtask.completed ? (
                    <CircleCheckIcon
                      className="size-4 shrink-0 text-green-600"
                      aria-hidden="true"
                    />
                  ) : (
                    <CircleIcon
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                  {subtask.completed && <span className="sr-only">Completed</span>}
                  <span
                    title={subtask.title}
                    className={
                      subtask.completed
                        ? 'min-w-0 text-muted-foreground text-sm line-through [overflow-wrap:anywhere]'
                        : 'min-w-0 text-sm [overflow-wrap:anywhere]'
                    }
                  >
                    {subtask.title}
                  </span>
                </div>
                <SubtaskCompletionControl subtask={subtask} todoId={todoId} />
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground text-xs">
            {completedCount} of {subtasks.length} completed
          </p>
        </div>
      )}
    </section>
  );
}
