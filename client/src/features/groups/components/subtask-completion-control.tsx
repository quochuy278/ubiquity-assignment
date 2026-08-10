import { getApiErrorMessage } from '@/api/errors';
import type { SubTaskResponseDto } from '@/api/generated';
import { useUpdateSubtaskCompletion } from '@/features/groups/hooks';
import { SafeButton } from '@/shared/components/safe-button';
import { toast } from '@/shared/components/ui/toast';

export function SubtaskCompletionControl({
  subtask,
  todoId,
}: {
  subtask: SubTaskResponseDto;
  todoId: string;
}) {
  const updateCompletion = useUpdateSubtaskCompletion(todoId);

  if (subtask.completed) return null;

  const handleComplete = async () => {
    try {
      await updateCompletion.mutateAsync({
        subtaskId: subtask.id,
        updateSubTaskCompletionDto: { completed: true },
      });
      toast.add({ title: 'Subtask completed', type: 'success' });
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
      variant="ghost"
      size="xs"
      pending={updateCompletion.isPending}
      pendingText="Completing..."
      onAction={handleComplete}
    >
      Complete
    </SafeButton>
  );
}
