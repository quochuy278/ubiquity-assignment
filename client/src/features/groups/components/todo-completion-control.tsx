import { getApiErrorMessage } from '@/api/errors';
import { TodoStatus, type TodoResponseDto } from '@/api/generated';
import { useUpdateTodoCompletion } from '@/features/groups/hooks';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';

export function TodoCompletionControl({
  todo,
  todoListId,
}: {
  todo: TodoResponseDto;
  todoListId: string;
}) {
  const updateCompletion = useUpdateTodoCompletion(todoListId);
  const isCompleted = todo.status === TodoStatus.NUMBER_20;

  const handleClick = () => {
    updateCompletion.mutate({
      todoId: todo.id,
      updateTodoCompletionDto: { completed: !isCompleted },
    });
  };

  const actionLabel = isCompleted ? 'Reopen' : 'Complete';
  const pendingLabel = updateCompletion.variables?.updateTodoCompletionDto.completed
    ? 'Completing...'
    : 'Reopening...';

  return (
    <div className="flex min-w-28 flex-col items-end gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={updateCompletion.isPending}
        onClick={handleClick}
      >
        {updateCompletion.isPending ? pendingLabel : actionLabel}
      </Button>
      {updateCompletion.isError && (
        <Alert variant="destructive" className="w-64 max-w-[70vw]">
          <AlertDescription className="first-letter:uppercase">
            {getApiErrorMessage(updateCompletion.error)}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
