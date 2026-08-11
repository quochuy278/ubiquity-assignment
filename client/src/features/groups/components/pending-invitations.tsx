import { formatDistanceToNow } from 'date-fns';
import { MailIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '@/api/errors';
import { useAcceptInvitation, usePendingInvitations } from '@/features/groups/hooks';
import { SafeButton } from '@/shared/components/safe-button';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Card, CardContent } from '@/shared/components/ui/card';

export function PendingInvitations() {
  const invitations = usePendingInvitations();
  const acceptInvitation = useAcceptInvitation();
  const navigate = useNavigate();

  if (invitations.isPending || (invitations.isSuccess && invitations.data.length === 0)) {
    return null;
  }

  if (invitations.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{getApiErrorMessage(invitations.error)}</AlertDescription>
      </Alert>
    );
  }

  const accept = async (token: string) => {
    const group = await acceptInvitation.mutateAsync(token);
    await navigate(`/groups/${group.id}`);
  };

  return (
    <section className="space-y-3" aria-labelledby="pending-invitations-title">
      <div>
        <h2 id="pending-invitations-title" className="font-semibold text-lg">
          Pending invitations
        </h2>
        <p className="text-muted-foreground text-sm">Join a shared group you were invited to.</p>
      </div>
      {invitations.data.map((invitation) => (
        <Card key={invitation.id}>
          <CardContent className="flex flex-wrap items-center gap-3">
            <MailIcon className="size-5 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{invitation.groupName}</p>
              <p className="text-muted-foreground text-sm">
                Invited by {invitation.inviterDisplayName} · expires{' '}
                {formatDistanceToNow(new Date(invitation.expiresAt), { addSuffix: true })}
              </p>
            </div>
            <SafeButton
              size="sm"
              pending={
                acceptInvitation.isPending && acceptInvitation.variables === invitation.token
              }
              pendingText="Accepting..."
              onAction={() => accept(invitation.token).catch(() => undefined)}
            >
              Accept
            </SafeButton>
          </CardContent>
        </Card>
      ))}
      {acceptInvitation.isError && (
        <Alert variant="destructive">
          <AlertDescription>{getApiErrorMessage(acceptInvitation.error)}</AlertDescription>
        </Alert>
      )}
    </section>
  );
}
