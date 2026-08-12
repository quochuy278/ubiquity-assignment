import { GroupType } from '@/api/generated';
import { FormDialog } from '@/features/groups/components/form-dialog';
import { useCreateGroup } from '@/features/groups/hooks';
import { Button } from '@/shared/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { toast } from '@/shared/components/ui/toast';

const groupTypeOptions = {
  [GroupType.Personal]: 'Personal',
  [GroupType.Shared]: 'Shared',
};

export function CreateGroupDialog() {
  const {
    error: createGroupError,
    isError: hasCreateGroupError,
    isPending: isCreatingGroup,
    mutateAsync: createGroup,
    reset: resetCreateGroup,
  } = useCreateGroup();

  const handleSubmit = async (data: FormData, close: () => void) => {
    await createGroup({
      name: String(data.get('name')),
      type: String(data.get('type')) as GroupType,
    });
    toast.add({ title: 'Workspace created', type: 'success' });
    close();
  };

  return (
    <FormDialog
      title="Create workspace"
      description="Create a personal or shared workspace for your lists."
      trigger={<Button type="button" />}
      triggerLabel="Create workspace"
      submitLabel="Create workspace"
      pendingLabel="Creating workspace..."
      isPending={isCreatingGroup}
      error={hasCreateGroupError ? createGroupError : undefined}
      onReset={resetCreateGroup}
      onSubmit={handleSubmit}
    >
      <Field>
        <FieldLabel htmlFor="group-name">Workspace name</FieldLabel>
        <Input id="group-name" name="name" required autoFocus />
      </Field>
      <Field>
        <FieldLabel htmlFor="group-type">Workspace type</FieldLabel>
        <Select name="type" defaultValue={GroupType.Personal} items={groupTypeOptions}>
          <SelectTrigger id="group-type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent
            side="bottom"
            align="start"
            alignItemWithTrigger={false}
            collisionAvoidance={{ side: 'none', align: 'shift', fallbackAxisSide: 'none' }}
          >
            <SelectItem value={GroupType.Personal}>Personal</SelectItem>
            <SelectItem value={GroupType.Shared}>Shared</SelectItem>
          </SelectContent>
        </Select>
        <FieldDescription>
          Shared workspaces let you invite registered users and sync collaborative changes.
        </FieldDescription>
      </Field>
    </FormDialog>
  );
}
