import { type SyntheticEvent, useId, useState } from 'react';
import { getApiErrorMessage } from '@/api/errors';
import { useCreateSubtask } from '@/features/groups/hooks';
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

export function CreateSubtaskDialog({ todoId }: { todoId: string }) {
  const [open, setOpen] = useState(false);
  const formId = useId();
  const titleId = useId();
  const createSubtask = useCreateSubtask(todoId);

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    createSubtask.mutate({ title: String(data.get('title')) }, { onSuccess: () => setOpen(false) });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" size="xs" />}>
        Add subtask
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add subtask</DialogTitle>
          <DialogDescription>Add a smaller step to this todo.</DialogDescription>
        </DialogHeader>
        <form id={formId} onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={titleId}>Title</FieldLabel>
              <Input id={titleId} name="title" required autoFocus />
            </Field>
            {createSubtask.isError && (
              <Alert variant="destructive">
                <AlertDescription className="first-letter:uppercase">
                  {getApiErrorMessage(createSubtask.error)}
                </AlertDescription>
              </Alert>
            )}
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button type="submit" form={formId} disabled={createSubtask.isPending}>
            {createSubtask.isPending ? 'Adding subtask...' : 'Add subtask'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
