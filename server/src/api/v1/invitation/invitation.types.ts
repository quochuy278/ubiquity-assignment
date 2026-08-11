import type { Invitation } from '@prisma/client';
import type { GroupType } from '../group/group.constants';
import type { InvitationStatus } from './invitation.constants';

export type InvitationResult = Omit<Invitation, 'status'> & {
  status: InvitationStatus;
};

export type PendingInvitationResult = InvitationResult & {
  group: { id: string; name: string; type: GroupType };
  inviter: { id: string; displayName: string };
};
