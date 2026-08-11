import { useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '@/api/errors';
import { FormDialog } from '@/features/groups/components/form-dialog';
import { useCreateFirstList } from '@/features/groups/hooks';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { toast } from '@/shared/components/ui/toast';

export function CreateFirstListDialog() {
  const {
    error: createFirstListError,
    hasCreatedPersonalWorkspace,
    isError: hasCreateFirstListError,
    isPending: isCreatingFirstList,
    mutateAsync: createFirstList,
    reset: resetCreateFirstList,
  } = useCreateFirstList();
  const navigate = useNavigate();

  const handleSubmit = async (data: FormData, close: () => void) => {
    const { group, todoList } = await createFirstList(String(data.get('name')));
    toast.add({ title: 'Your first list is ready', type: 'success' });
    close();
    await navigate(`/groups/${group.id}/lists/${todoList.id}`);
  };

  return (
    <FormDialog
      title="Create your first list"
      description="Start with a personal list for your own tasks. You can create shared workspaces later."
      trigger={<Button type="button" />}
      triggerLabel="Create my first list"
      submitLabel="Create list"
      pendingLabel="Creating your list..."
      isPending={isCreatingFirstList}
      onReset={resetCreateFirstList}
      onSubmit={handleSubmit}
    >
      <Field>
        <FieldLabel htmlFor="first-list-name">List name</FieldLabel>
        <Input id="first-list-name" name="name" defaultValue="My Todos" required autoFocus />
        <FieldDescription>This list will live in your personal workspace.</FieldDescription>
      </Field>
      {hasCreateFirstListError && (
        <Alert variant="destructive">
          <AlertDescription>
            {hasCreatedPersonalWorkspace
              ? `Your personal workspace was created, but the list was not. Try again to finish creating it. ${getApiErrorMessage(createFirstListError)}`
              : getApiErrorMessage(createFirstListError)}
          </AlertDescription>
        </Alert>
      )}
    </FormDialog>
  );
}
