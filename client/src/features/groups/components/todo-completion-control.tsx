import { getApiErrorMessage } from '@/api/errors';
import { type TodoResponseDto, TodoStatus } from '@/api/generated';
import { useUpdateTodoCompletion } from '@/features/groups/hooks';
import { SafeButton } from '@/shared/components/safe-button';
import { toast } from '@/shared/components/ui/toast';

export function TodoCompletionControl({
  todo,
  todoListId,
}: {
  todo: TodoResponseDto;
  todoListId: string;
}) {
  const updateCompletion = useUpdateTodoCompletion(todoListId);
  const isCompleted = todo.status === TodoStatus.NUMBER_20;

  if (isCompleted) return null;

  const handleComplete = async () => {
    try {
      await updateCompletion.mutateAsync({
        todoId: todo.id,
        updateTodoCompletionDto: { completed: true },
      });
      toast.add({ title: 'Todo completed', type: 'success' });
    } catch (error) {
      toast.add({
        title: getApiErrorMessage(error),
        type: 'error',
        priority: 'high',
      });
    }
  };

  return (
    <SafeButton
      variant="outline"
      size="sm"
      pending={updateCompletion.isPending}
      pendingText="Completing..."
      onAction={handleComplete}
    >
      Complete
    </SafeButton>
  );
}
