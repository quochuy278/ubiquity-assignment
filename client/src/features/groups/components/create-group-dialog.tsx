import { type SyntheticEvent, useState } from 'react';
import { getApiErrorMessage } from '@/api/errors';
import { GroupType } from '@/api/generated';
import { useCreateGroup } from '@/features/groups/hooks';
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
import { NativeSelect, NativeSelectOption } from '@/shared/components/ui/native-select';

export function CreateGroupDialog() {
  const [open, setOpen] = useState(false);
  const createGroup = useCreateGroup();

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    createGroup.mutate(
      {
        name: String(data.get('name')),
        type: String(data.get('type')) as GroupType,
      },
      { onSuccess: () => setOpen(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" />}>Create group</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create group</DialogTitle>
          <DialogDescription>Create a workspace for a new set of todo lists.</DialogDescription>
        </DialogHeader>
        <form id="create-group-form" onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="group-name">Name</FieldLabel>
              <Input id="group-name" name="name" maxLength={100} required autoFocus />
            </Field>
            <Field>
              <FieldLabel htmlFor="group-type">Type</FieldLabel>
              <NativeSelect id="group-type" name="type" defaultValue={GroupType.Shared}>
                <NativeSelectOption value={GroupType.Shared}>Shared</NativeSelectOption>
                <NativeSelectOption value={GroupType.Personal}>Personal</NativeSelectOption>
              </NativeSelect>
            </Field>
            {createGroup.isError && (
              <Alert variant="destructive">
                <AlertDescription className="first-letter:uppercase">
                  {getApiErrorMessage(createGroup.error)}
                </AlertDescription>
              </Alert>
            )}
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button
            type="submit"
            form="create-group-form"
            disabled={createGroup.isPending}
          >
            {createGroup.isPending ? 'Creating group...' : 'Create group'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
