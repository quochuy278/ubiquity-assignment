import { formatDistanceToNow } from 'date-fns';
import { MailIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '@/api/errors';
import { useAcceptInvitation, usePendingInvitations } from '@/features/groups/hooks';
import { SafeButton } from '@/shared/components/safe-button';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Card, CardContent } from '@/shared/components/ui/card';

export function PendingInvitations() {
  const {
    data: pendingInvitations,
    error: pendingInvitationsError,
    isError: hasPendingInvitationsError,
    isPending: isLoadingPendingInvitations,
    isSuccess: hasLoadedPendingInvitations,
  } = usePendingInvitations();
  const {
    error: acceptInvitationError,
    isError: hasAcceptInvitationError,
    isPending: isAcceptingInvitation,
    mutateAsync: acceptInvitation,
    variables: acceptingInvitationToken,
  } = useAcceptInvitation();
  const navigate = useNavigate();

  if (
    isLoadingPendingInvitations ||
    (hasLoadedPendingInvitations && pendingInvitations.length === 0)
  ) {
    return null;
  }

  if (hasPendingInvitationsError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{getApiErrorMessage(pendingInvitationsError)}</AlertDescription>
      </Alert>
    );
  }

  const accept = async (token: string) => {
    const group = await acceptInvitation(token);
    await navigate(`/groups/${group.id}`);
  };

  return (
    <section className="space-y-3" aria-labelledby="pending-invitations-title">
      <div>
        <h2 id="pending-invitations-title" className="font-semibold text-lg">
          Pending invitations
        </h2>
        <p className="text-muted-foreground text-sm">
          Join a shared workspace you were invited to.
        </p>
      </div>
      {pendingInvitations.map((invitation) => (
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
              pending={isAcceptingInvitation && acceptingInvitationToken === invitation.token}
              pendingText="Accepting..."
              onAction={() => accept(invitation.token).catch(() => undefined)}
            >
              Accept
            </SafeButton>
          </CardContent>
        </Card>
      ))}
      {hasAcceptInvitationError && (
        <Alert variant="destructive">
          <AlertDescription>{getApiErrorMessage(acceptInvitationError)}</AlertDescription>
        </Alert>
      )}
    </section>
  );
}
