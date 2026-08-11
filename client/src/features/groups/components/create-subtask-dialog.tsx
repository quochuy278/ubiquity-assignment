import { useId } from 'react';
import { FormDialog } from '@/features/groups/components/form-dialog';
import { useCreateSubtask } from '@/features/groups/hooks';
import { Button } from '@/shared/components/ui/button';
import { Field, FieldLabel } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { toast } from '@/shared/components/ui/toast';

export function CreateSubtaskDialog({ todoId }: { todoId: string }) {
  const titleId = useId();
  const {
    error: createSubtaskError,
    isError: hasCreateSubtaskError,
    isPending: isCreatingSubtask,
    mutateAsync: createSubtask,
    reset: resetCreateSubtask,
  } = useCreateSubtask(todoId);

  const handleSubmit = async (data: FormData, close: () => void) => {
    await createSubtask({ title: String(data.get('title')) });
    toast.add({ title: 'Subtask created', type: 'success' });
    close();
  };

  return (
    <FormDialog
      title="Add subtask"
      description="Add a smaller step to this todo."
      trigger={<Button type="button" variant="outline" size="xs" />}
      triggerLabel="Add subtask"
      submitLabel="Add subtask"
      pendingLabel="Adding subtask..."
      isPending={isCreatingSubtask}
      error={hasCreateSubtaskError ? createSubtaskError : undefined}
      onReset={resetCreateSubtask}
      onSubmit={handleSubmit}
    >
      <Field>
        <FieldLabel htmlFor={titleId}>Title</FieldLabel>
        <Input id={titleId} name="title" required autoFocus />
      </Field>
    </FormDialog>
  );
}
