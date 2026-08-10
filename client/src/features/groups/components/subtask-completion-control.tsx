import { getApiErrorMessage } from '@/api/errors';
import type { SubTaskResponseDto } from '@/api/generated';
import { useUpdateSubtaskCompletion } from '@/features/groups/hooks';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';

export function SubtaskCompletionControl({
  subtask,
  todoId,
}: {
  subtask: SubTaskResponseDto;
  todoId: string;
}) {
  const updateCompletion = useUpdateSubtaskCompletion(todoId);

  const handleClick = () => {
    updateCompletion.mutate({
      subtaskId: subtask.id,
      updateSubTaskCompletionDto: { completed: !subtask.completed },
    });
  };

  const pendingLabel = updateCompletion.variables?.updateSubTaskCompletionDto.completed
    ? 'Completing...'
    : 'Reopening...';

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        variant="ghost"
        size="xs"
        disabled={updateCompletion.isPending}
        onClick={handleClick}
      >
        {updateCompletion.isPending ? pendingLabel : subtask.completed ? 'Reopen' : 'Complete'}
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
