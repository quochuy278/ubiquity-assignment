import { FormDialog } from '@/features/groups/components/form-dialog';
import { useCreateTodo } from '@/features/groups/hooks';
import { Button } from '@/shared/components/ui/button';
import { Field, FieldLabel } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { toast } from '@/shared/components/ui/toast';

export function CreateTodoDialog({ todoListId }: { todoListId: string }) {
  const {
    error: createTodoError,
    isError: hasCreateTodoError,
    isPending: isCreatingTodo,
    mutateAsync: createTodo,
    reset: resetCreateTodo,
  } = useCreateTodo(todoListId);

  const handleSubmit = async (data: FormData, close: () => void) => {
    const description = String(data.get('description'));

    await createTodo({
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
      trigger={<Button type="button" variant="outline" />}
      triggerLabel="Create todo with details"
      submitLabel="Create todo"
      pendingLabel="Creating todo..."
      isPending={isCreatingTodo}
      error={hasCreateTodoError ? createTodoError : undefined}
      onReset={resetCreateTodo}
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
