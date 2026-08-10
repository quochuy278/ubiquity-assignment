import { type SyntheticEvent, useState } from 'react';
import { getApiErrorMessage } from '@/api/errors';
import { useCreateTodoList } from '@/features/groups/hooks';
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

export function CreateTodoListDialog({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false);
  const createTodoList = useCreateTodoList(groupId);

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    createTodoList.mutate(
      { name: String(data.get('name')) },
      { onSuccess: () => setOpen(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" />}>Create list</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create todo list</DialogTitle>
          <DialogDescription>Add a new todo list to this group.</DialogDescription>
        </DialogHeader>
        <form id="create-todo-list-form" onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="todo-list-name">Name</FieldLabel>
              <Input id="todo-list-name" name="name" required autoFocus />
            </Field>
            {createTodoList.isError && (
              <Alert variant="destructive">
                <AlertDescription className="first-letter:uppercase">
                  {getApiErrorMessage(createTodoList.error)}
                </AlertDescription>
              </Alert>
            )}
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button
            type="submit"
            form="create-todo-list-form"
            disabled={createTodoList.isPending}
          >
            {createTodoList.isPending ? 'Creating list...' : 'Create list'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
