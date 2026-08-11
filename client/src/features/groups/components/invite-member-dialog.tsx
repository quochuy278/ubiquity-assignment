import { FormDialog } from '@/features/groups/components/form-dialog';
import { useCreateInvitation } from '@/features/groups/hooks';
import { Button } from '@/shared/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { toast } from '@/shared/components/ui/toast';

export function InviteMemberDialog({ groupId }: { groupId: string }) {
  const {
    error: createInvitationError,
    isError: hasCreateInvitationError,
    isPending: isCreatingInvitation,
    mutateAsync: createInvitation,
    reset: resetCreateInvitation,
  } = useCreateInvitation(groupId);

  const handleSubmit = async (data: FormData, close: () => void) => {
    await createInvitation({ email: String(data.get('email')) });
    toast.add({ title: 'Invitation sent', type: 'success' });
    close();
  };

  return (
    <FormDialog
      title="Invite member"
      description="Invite an existing registered user to this shared group."
      trigger={<Button type="button" variant="outline" />}
      triggerLabel="Invite member"
      submitLabel="Send invitation"
      pendingLabel="Sending invitation..."
      isPending={isCreatingInvitation}
      error={hasCreateInvitationError ? createInvitationError : undefined}
      onReset={resetCreateInvitation}
      onSubmit={handleSubmit}
    >
      <Field>
        <FieldLabel htmlFor="invite-email">Email</FieldLabel>
        <Input
          id="invite-email"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={320}
          required
          autoFocus
        />
        <FieldDescription>The user must already have an account.</FieldDescription>
      </Field>
    </FormDialog>
  );
}
