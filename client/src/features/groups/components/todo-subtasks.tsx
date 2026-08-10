import { getApiErrorMessage } from '@/api/errors';
import { CircleCheckIcon, CircleIcon } from 'lucide-react';
import { CreateSubtaskDialog } from '@/features/groups/components/create-subtask-dialog';
import { SubtaskCompletionControl } from '@/features/groups/components/subtask-completion-control';
import { useSubtasks } from '@/features/groups/hooks';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';

export function TodoSubtasks({ todoId }: { todoId: string }) {
  const subtasks = useSubtasks(todoId);
  const completedCount = subtasks.data?.filter((subtask) => subtask.completed).length ?? 0;

  return (
    <section className="space-y-3 border-t pt-4" aria-label="Subtasks">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium text-sm">Subtasks</p>
        <CreateSubtaskDialog todoId={todoId} />
      </div>

      {subtasks.isPending && (
        <p className="text-muted-foreground text-xs" role="status">
          Loading subtasks...
        </p>
      )}
      {subtasks.isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-3">
            <span className="first-letter:uppercase">{getApiErrorMessage(subtasks.error)}</span>
            <Button type="button" variant="outline" size="xs" onClick={() => subtasks.refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {subtasks.data && subtasks.data.length > 0 && (
        <div className="ml-2 space-y-2 border-l pl-4">
          <ul className="divide-y">
            {subtasks.data.map((subtask) => (
              <li key={subtask.id} className="flex min-h-9 items-center justify-between gap-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
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
                    className={
                      subtask.completed ? 'text-muted-foreground text-sm line-through' : 'text-sm'
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
            {completedCount} of {subtasks.data.length} completed
          </p>
        </div>
      )}
    </section>
  );
}
