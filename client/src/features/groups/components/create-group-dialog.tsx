import { GroupType } from '@/api/generated';
import { FormDialog } from '@/features/groups/components/form-dialog';
import { useCreateGroup } from '@/features/groups/hooks';
import { Button } from '@/shared/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/shared/components/ui/native-select';
import { toast } from '@/shared/components/ui/toast';

export function CreateGroupDialog() {
  const createGroup = useCreateGroup();

  const handleSubmit = async (data: FormData, close: () => void) => {
    await createGroup.mutateAsync({
      name: String(data.get('name')),
      type: String(data.get('type')) as GroupType,
    });
    toast.add({ title: 'Group created', type: 'success' });
    close();
  };

  return (
    <FormDialog
      title="Create group"
      description="Create a workspace for a new set of todo lists."
      trigger={<Button type="button" />}
      triggerLabel="Create group"
      submitLabel="Create group"
      pendingLabel="Creating group..."
      isPending={createGroup.isPending}
      error={createGroup.isError ? createGroup.error : undefined}
      onReset={createGroup.reset}
      onSubmit={handleSubmit}
    >
      <Field>
        <FieldLabel htmlFor="group-name">Name</FieldLabel>
        <Input id="group-name" name="name" required autoFocus />
      </Field>
      <Field>
        <FieldLabel htmlFor="group-type">Type</FieldLabel>
        <NativeSelect id="group-type" name="type" defaultValue={GroupType.Personal}>
          <NativeSelectOption value={GroupType.Personal}>Personal</NativeSelectOption>
          <NativeSelectOption value={GroupType.Shared}>Shared</NativeSelectOption>
        </NativeSelect>
        <FieldDescription>
          Shared groups sync changes for existing members. Adding members is not available in the
          app.
        </FieldDescription>
      </Field>
    </FormDialog>
  );
}
