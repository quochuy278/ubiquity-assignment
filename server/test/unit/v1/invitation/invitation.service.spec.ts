import type { Prisma } from '@prisma/client';
import dayjs from 'dayjs';
import type { AuthUserService } from '../../../../src/api/v1/auth/services/auth-user.service';
import { GroupType } from '../../../../src/api/v1/group/group.constants';
import type { GroupService } from '../../../../src/api/v1/group/group.service';
import type { GroupResult } from '../../../../src/api/v1/group/group.types';
import { InvitationStatus } from '../../../../src/api/v1/invitation/invitation.constants';
import { InvitationService } from '../../../../src/api/v1/invitation/invitation.service';
import type { InvitationResult } from '../../../../src/api/v1/invitation/invitation.types';
import type { InvitationRepository } from '../../../../src/api/v1/invitation/repositories/invitation.repository';
import { MembershipRole } from '../../../../src/api/v1/membership/membership.constants';
import type { MembershipService } from '../../../../src/api/v1/membership/membership.service';
import { ErrorCode } from '../../../../src/common/exception/error-code';
import type { ApplicationLoggerService } from '../../../../src/common/logger/logger.service';
import type { PrismaService } from '../../../../src/shared/database/prisma/prisma.service';

describe('Invitation use-case orchestration', () => {
  const now = dayjs('2026-08-11T10:00:00.000Z');
  const transaction = {} as Prisma.TransactionClient;
  const group: GroupResult = {
    id: 'group-1',
    type: GroupType.SHARED,
    currentUserRole: MembershipRole.OWNER,
    name: 'Team',
    createdById: 'owner-1',
    createdAt: now.toDate(),
    updatedAt: now.toDate(),
  };
  const invitation: InvitationResult = {
    id: 'invitation-1',
    groupId: group.id,
    invitedById: 'owner-1',
    email: 'member@example.com',
    token: 'secure-token',
    status: InvitationStatus.PENDING,
    expiresAt: now.add(7, 'day').toDate(),
    createdAt: now.toDate(),
  };
  const owner = { id: 'owner-1', email: 'owner@example.com' };
  const member = { id: 'member-1', email: invitation.email };
  const findGroup = jest.fn();
  const findByEmail = jest.fn();
  const findUserById = jest.fn();
  const isMember = jest.fn();
  const createMember = jest.fn();
  const findExisting = jest.fn();
  const createInvitation = jest.fn();
  const refreshExpired = jest.fn();
  const findPending = jest.fn();
  const findByToken = jest.fn();
  const acceptIfPending = jest.fn();
  const runTransaction = jest.fn();
  const log = jest.fn();
  const service = new InvitationService(
    { $transaction: runTransaction } as unknown as PrismaService,
    {
      findByGroupAndEmail: findExisting,
      create: createInvitation,
      refreshExpired,
      findPendingForEmail: findPending,
      findByToken,
      acceptIfPending,
    } as unknown as InvitationRepository,
    { findById: findGroup } as unknown as GroupService,
    { isMember, createMember } as unknown as MembershipService,
    { findByEmail, findById: findUserById } as unknown as AuthUserService,
    { log } as unknown as ApplicationLoggerService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    findGroup.mockResolvedValue(group);
    findByEmail.mockResolvedValue(member);
    isMember.mockResolvedValue(false);
    findExisting.mockResolvedValue(null);
    createInvitation.mockResolvedValue(invitation);
    runTransaction.mockImplementation(
      (callback: (client: Prisma.TransactionClient) => Promise<unknown>) => callback(transaction),
    );
  });

  it('normalizes email and creates a seven-day pending invitation for a shared-group owner', async () => {
    await expect(
      service.create(owner.id, group.id, { email: '  MEMBER@EXAMPLE.COM ' }),
    ).resolves.toEqual(invitation);

    expect(findByEmail).toHaveBeenCalledWith(invitation.email);
    expect(createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        groupId: group.id,
        invitedById: owner.id,
        email: invitation.email,
        token: expect.any(String),
        expiresAt: expect.any(Date),
      }),
    );
    const expiresAt = createInvitation.mock.calls[0][0].expiresAt as Date;
    expect(dayjs(expiresAt).diff(dayjs(), 'day')).toBeGreaterThanOrEqual(6);
  });

  it.each([MembershipRole.MEMBER, MembershipRole.ADMIN])(
    'rejects the %s role',
    async (currentUserRole) => {
      findGroup.mockResolvedValue({ ...group, currentUserRole });
      await expect(
        service.create('non-owner', group.id, { email: invitation.email }),
      ).rejects.toMatchObject({
        code: ErrorCode.INVITATION_FORBIDDEN,
      });
      expect(findByEmail).not.toHaveBeenCalled();
    },
  );

  it('rejects a personal group', async () => {
    findGroup.mockResolvedValue({ ...group, type: GroupType.PERSONAL });
    await expect(
      service.create(owner.id, group.id, { email: invitation.email }),
    ).rejects.toMatchObject({
      code: ErrorCode.INVITATION_NOT_ALLOWED,
    });
  });

  it('rejects an unknown email and an existing member', async () => {
    findByEmail.mockResolvedValueOnce(null).mockResolvedValueOnce(member);
    await expect(
      service.create(owner.id, group.id, { email: invitation.email }),
    ).rejects.toMatchObject({
      code: ErrorCode.INVITEE_NOT_FOUND,
    });
    isMember.mockResolvedValueOnce(true);
    await expect(
      service.create(owner.id, group.id, { email: invitation.email }),
    ).rejects.toMatchObject({
      code: ErrorCode.GROUP_MEMBER_ALREADY_EXISTS,
    });
  });

  it('rejects an active duplicate and conditionally refreshes an expired record', async () => {
    findExisting.mockResolvedValueOnce(invitation).mockResolvedValueOnce({
      ...invitation,
      expiresAt: now.subtract(1, 'minute').toDate(),
    });
    await expect(
      service.create(owner.id, group.id, { email: invitation.email }),
    ).rejects.toMatchObject({
      code: ErrorCode.INVITATION_ALREADY_PENDING,
    });

    refreshExpired.mockResolvedValue(invitation);
    await expect(service.create(owner.id, group.id, { email: invitation.email })).resolves.toEqual(
      invitation,
    );
    expect(refreshExpired).toHaveBeenCalledWith(
      invitation.id,
      expect.any(Date),
      expect.objectContaining({ invitedById: owner.id, token: expect.any(String) }),
    );
  });

  it('lists pending invitations only for the normalized authenticated email', async () => {
    findUserById.mockResolvedValue({ ...member, email: 'MEMBER@EXAMPLE.COM' });
    findPending.mockResolvedValue([]);
    await expect(service.findPendingForUser(member.id)).resolves.toEqual([]);
    expect(findPending).toHaveBeenCalledWith(invitation.email, expect.any(Date));
  });

  it('accepts with a conditional transition and creates MEMBER in the same transaction', async () => {
    findUserById.mockResolvedValue(member);
    findByToken.mockResolvedValue(invitation);
    acceptIfPending.mockResolvedValue(true);
    createMember.mockResolvedValue(undefined);
    findGroup.mockResolvedValue({ ...group, currentUserRole: MembershipRole.MEMBER });

    await expect(service.accept(member.id, invitation.token)).resolves.toMatchObject({
      id: group.id,
      currentUserRole: MembershipRole.MEMBER,
    });
    expect(acceptIfPending).toHaveBeenCalledWith(invitation.id, expect.any(Date), transaction);
    expect(createMember).toHaveBeenCalledWith(group.id, member.id, transaction);
  });

  it('does not authorize a mismatched user by token possession alone', async () => {
    findUserById.mockResolvedValue({ ...member, email: 'other@example.com' });
    findByToken.mockResolvedValue(invitation);
    await expect(service.accept(member.id, invitation.token)).rejects.toMatchObject({
      code: ErrorCode.INVITATION_NOT_FOUND,
    });
    expect(acceptIfPending).not.toHaveBeenCalled();
    expect(createMember).not.toHaveBeenCalled();
  });

  it('does not create membership when a concurrent acceptance wins the transition', async () => {
    findUserById.mockResolvedValue(member);
    findByToken.mockResolvedValue(invitation);
    acceptIfPending.mockResolvedValue(false);
    await expect(service.accept(member.id, invitation.token)).rejects.toMatchObject({
      code: ErrorCode.INVITATION_NOT_FOUND,
    });
    expect(createMember).not.toHaveBeenCalled();
  });
});
