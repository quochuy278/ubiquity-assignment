import { type SyntheticEvent, useState } from 'react';
import { getApiErrorMessage } from '@/api/errors';
import { useCreateTodo } from '@/features/groups/hooks';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';

export function CreateTodoDialog({ todoListId }: { todoListId: string }) {
  const [open, setOpen] = useState(false);
  const createTodo = useCreateTodo(todoListId);

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const description = String(data.get('description'));

    createTodo.mutate(
      {
        title: String(data.get('title')),
        ...(description ? { description } : {}),
      },
      { onSuccess: () => setOpen(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" />}>Create todo</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create todo</DialogTitle>
          <DialogDescription>Add a new todo to this list.</DialogDescription>
        </DialogHeader>
        <form id="create-todo-form" onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="todo-title">Title</FieldLabel>
              <Input id="todo-title" name="title" required autoFocus />
            </Field>
            <Field>
              <FieldLabel htmlFor="todo-description">Description</FieldLabel>
              <Textarea id="todo-description" name="description" />
            </Field>
            {createTodo.isError && (
              <Alert variant="destructive">
                <AlertDescription className="first-letter:uppercase">
                  {getApiErrorMessage(createTodo.error)}
                </AlertDescription>
              </Alert>
            )}
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button type="submit" form="create-todo-form" disabled={createTodo.isPending}>
            {createTodo.isPending ? 'Creating todo...' : 'Create todo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
