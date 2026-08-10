import { FormDialog } from '@/features/groups/components/form-dialog';
import { useCreateTodoList } from '@/features/groups/hooks';
import { Button } from '@/shared/components/ui/button';
import { Field, FieldLabel } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { toast } from '@/shared/components/ui/toast';

export function CreateTodoListDialog({ groupId }: { groupId: string }) {
  const createTodoList = useCreateTodoList(groupId);

  const handleSubmit = async (data: FormData, close: () => void) => {
    await createTodoList.mutateAsync({ name: String(data.get('name')) });
    toast.add({ title: 'List created', type: 'success' });
    close();
  };

  return (
    <FormDialog
      title="Create todo list"
      description="Add a new todo list to this group."
      trigger={<Button type="button" />}
      triggerLabel="Create list"
      submitLabel="Create list"
      pendingLabel="Creating list..."
      isPending={createTodoList.isPending}
      error={createTodoList.isError ? createTodoList.error : undefined}
      onReset={createTodoList.reset}
      onSubmit={handleSubmit}
    >
      <Field>
        <FieldLabel htmlFor="todo-list-name">Name</FieldLabel>
        <Input id="todo-list-name" name="name" required autoFocus />
      </Field>
    </FormDialog>
  );
}
