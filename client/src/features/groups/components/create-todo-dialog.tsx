import { FormDialog } from '@/features/groups/components/form-dialog';
import { useCreateTodo } from '@/features/groups/hooks';
import { Button } from '@/shared/components/ui/button';
import { Field, FieldLabel } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { toast } from '@/shared/components/ui/toast';

export function CreateTodoDialog({ todoListId }: { todoListId: string }) {
  const createTodo = useCreateTodo(todoListId);

  const handleSubmit = async (data: FormData, close: () => void) => {
    const description = String(data.get('description'));

    await createTodo.mutateAsync({
      title: String(data.get('title')),
      ...(description ? { description } : {}),
    });
    toast.add({ title: 'Todo created', type: 'success' });
    close();
  };

  return (
    <FormDialog
      title="Create todo"
      description="Add a new todo to this list."
      trigger={<Button type="button" />}
      triggerLabel="Create todo"
      submitLabel="Create todo"
      pendingLabel="Creating todo..."
      isPending={createTodo.isPending}
      error={createTodo.isError ? createTodo.error : undefined}
      onReset={createTodo.reset}
      onSubmit={handleSubmit}
    >
      <Field>
        <FieldLabel htmlFor="todo-title">Title</FieldLabel>
        <Input id="todo-title" name="title" required autoFocus />
      </Field>
      <Field>
        <FieldLabel htmlFor="todo-description">Description</FieldLabel>
        <Textarea id="todo-description" name="description" />
      </Field>
    </FormDialog>
  );
}
