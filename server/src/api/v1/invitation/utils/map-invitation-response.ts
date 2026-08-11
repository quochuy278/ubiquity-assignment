import { toIsoDateTime } from '../../../../shared/utils/time.utilities';
import type { InvitationResponseDto } from '../dto/invitation-response.dto';
import type { PendingInvitationResponseDto } from '../dto/pending-invitation-response.dto';
import type { InvitationResult, PendingInvitationResult } from '../invitation.types';

export function mapInvitationResponse(invitation: InvitationResult): InvitationResponseDto {
  return {
    id: invitation.id,
    groupId: invitation.groupId,
    email: invitation.email,
    status: invitation.status,
    expiresAt: toIsoDateTime(invitation.expiresAt),
    createdAt: toIsoDateTime(invitation.createdAt),
  };
}

export function mapPendingInvitationResponse(
  invitation: PendingInvitationResult,
): PendingInvitationResponseDto {
  return {
    id: invitation.id,
    token: invitation.token,
    groupId: invitation.groupId,
    groupName: invitation.group.name,
    groupType: invitation.group.type,
    inviterId: invitation.inviter.id,
    inviterDisplayName: invitation.inviter.displayName,
    expiresAt: toIsoDateTime(invitation.expiresAt),
  };
}
