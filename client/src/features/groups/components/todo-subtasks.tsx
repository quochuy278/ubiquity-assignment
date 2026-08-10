import { getApiErrorMessage } from '@/api/errors';
import { CreateSubtaskDialog } from '@/features/groups/components/create-subtask-dialog';
import { SubtaskCompletionControl } from '@/features/groups/components/subtask-completion-control';
import { useSubtasks } from '@/features/groups/hooks';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';

export function TodoSubtasks({ todoId }: { todoId: string }) {
  const subtasks = useSubtasks(todoId);
  const completedCount = subtasks.data?.filter((subtask) => subtask.completed).length ?? 0;

  return (
    <section className="space-y-2 border-t pt-3" aria-label="Subtasks">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-sm">Subtasks</p>
          {subtasks.data && subtasks.data.length > 0 && (
            <p className="text-muted-foreground text-xs">
              {completedCount} of {subtasks.data.length} completed
            </p>
          )}
        </div>
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
        <ul className="divide-y rounded-md border px-3">
          {subtasks.data.map((subtask) => (
            <li key={subtask.id} className="flex items-center justify-between gap-3 py-2">
              <span
                className={
                  subtask.completed ? 'text-muted-foreground text-sm line-through' : 'text-sm'
                }
              >
                {subtask.title}
              </span>
              <SubtaskCompletionControl subtask={subtask} todoId={todoId} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
