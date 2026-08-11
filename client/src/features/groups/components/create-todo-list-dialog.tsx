import { FormDialog } from '@/features/groups/components/form-dialog';
import { useCreateTodoList } from '@/features/groups/hooks';
import { Button } from '@/shared/components/ui/button';
import { Field, FieldLabel } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { toast } from '@/shared/components/ui/toast';

export function CreateTodoListDialog({ groupId }: { groupId: string }) {
  const {
    error: createTodoListError,
    isError: hasCreateTodoListError,
    isPending: isCreatingTodoList,
    mutateAsync: createTodoList,
    reset: resetCreateTodoList,
  } = useCreateTodoList(groupId);

  const handleSubmit = async (data: FormData, close: () => void) => {
    await createTodoList({ name: String(data.get('name')) });
    toast.add({ title: 'List created', type: 'success' });
    close();
  };

  return (
    <FormDialog
      title="Create list"
      description="Add another list to this workspace."
      trigger={<Button type="button" />}
      triggerLabel="Create list"
      submitLabel="Create list"
      pendingLabel="Creating list..."
      isPending={isCreatingTodoList}
      error={hasCreateTodoListError ? createTodoListError : undefined}
      onReset={resetCreateTodoList}
      onSubmit={handleSubmit}
    >
      <Field>
        <FieldLabel htmlFor="todo-list-name">Name</FieldLabel>
        <Input id="todo-list-name" name="name" required autoFocus />
      </Field>
    </FormDialog>
  );
}
