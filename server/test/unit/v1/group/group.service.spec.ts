import type { Prisma } from '@prisma/client';
import dayjs from 'dayjs';
import { GroupType } from '../../../../src/api/v1/group/group.constants';
import { GroupService } from '../../../../src/api/v1/group/group.service';
import type { GroupResult } from '../../../../src/api/v1/group/group.types';
import type { GroupRepository } from '../../../../src/api/v1/group/repositories/group.repository';
import type { MembershipService } from '../../../../src/api/v1/membership/membership.service';
import { ErrorCode } from '../../../../src/common/exception/error-code';
import type { ApplicationLoggerService } from '../../../../src/common/logger/logger.service';
import type { PrismaService } from '../../../../src/shared/database/prisma/prisma.service';

describe('Group use-case orchestration', () => {
  const group: GroupResult = {
    id: 'group-1',
    type: GroupType.SHARED,
    name: 'Family',
    createdById: 'user-1',
    createdAt: dayjs('2026-08-07T10:00:00.000Z').toDate(),
    updatedAt: dayjs('2026-08-07T10:00:00.000Z').toDate(),
  };
  const findGroupIds = jest.fn();
  const isMember = jest.fn();
  const createOwner = jest.fn();
  const createGroup = jest.fn();
  const findByIds = jest.fn();
  const findById = jest.fn();
  const runTransaction = jest.fn();
  const log = jest.fn();
  const transaction = {} as Prisma.TransactionClient;
  const memberships = {
    createOwner,
    findGroupIds,
    isMember,
  } as unknown as MembershipService;
  const groups = { create: createGroup, findByIds, findById } as unknown as GroupRepository;
  const prisma = { $transaction: runTransaction } as unknown as PrismaService;
  const logger = { log } as unknown as ApplicationLoggerService;
  const service = new GroupService(prisma, groups, memberships, logger);

  beforeEach(() => {
    jest.resetAllMocks();
    runTransaction.mockImplementation(
      (callback: (client: Prisma.TransactionClient) => Promise<unknown>) => callback(transaction),
    );
  });

  it('creates the group and owner membership in the same transaction', async () => {
    createGroup.mockResolvedValue(group);
    createOwner.mockResolvedValue(undefined);

    await expect(
      service.create('user-1', { type: GroupType.SHARED, name: 'Family' }),
    ).resolves.toEqual(group);

    expect(runTransaction).toHaveBeenCalledTimes(1);
    expect(createGroup).toHaveBeenCalledWith(
      { type: GroupType.SHARED, name: 'Family' },
      'user-1',
      transaction,
    );
    expect(createOwner).toHaveBeenCalledWith('group-1', 'user-1', transaction);
    expect(log).toHaveBeenCalledWith(
      'Group created',
      { groupId: 'group-1', userId: 'user-1' },
      GroupService.name,
    );
  });

  it('rejects the transaction when owner membership creation fails', async () => {
    const membershipError = new Error('Membership creation failed');
    createGroup.mockResolvedValue(group);
    createOwner.mockRejectedValue(membershipError);

    await expect(service.create('user-1', { type: GroupType.SHARED, name: 'Family' })).rejects.toBe(
      membershipError,
    );

    expect(runTransaction).toHaveBeenCalledTimes(1);
    expect(createGroup).toHaveBeenCalledWith(
      { type: GroupType.SHARED, name: 'Family' },
      'user-1',
      transaction,
    );
    expect(createOwner).toHaveBeenCalledWith('group-1', 'user-1', transaction);
    expect(log).not.toHaveBeenCalled();
  });

  it("loads only the authenticated user's groups through MembershipService", async () => {
    findGroupIds.mockResolvedValue(['group-1']);
    findByIds.mockResolvedValue([group]);

    await expect(service.findForUser('user-1')).resolves.toEqual([group]);

    expect(findGroupIds).toHaveBeenCalledWith('user-1');
    expect(findByIds).toHaveBeenCalledWith(['group-1']);
  });

  it('returns a group when the authenticated user is a member', async () => {
    isMember.mockResolvedValue(true);
    findById.mockResolvedValue(group);

    await expect(service.findById('user-1', 'group-1')).resolves.toEqual(group);

    expect(isMember).toHaveBeenCalledWith('group-1', 'user-1');
    expect(findById).toHaveBeenCalledWith('group-1');
  });

  it('hides the group when the authenticated user is not a member', async () => {
    isMember.mockResolvedValue(false);

    await expect(service.findById('user-2', 'group-1')).rejects.toMatchObject({
      code: ErrorCode.GROUP_NOT_FOUND,
      context: { groupId: 'group-1', userId: 'user-2' },
    });

    expect(findById).not.toHaveBeenCalled();
  });

  it('returns group not found when a membership references a missing group', async () => {
    isMember.mockResolvedValue(true);
    findById.mockResolvedValue(null);

    await expect(service.findById('user-1', 'group-1')).rejects.toMatchObject({
      code: ErrorCode.GROUP_NOT_FOUND,
      context: { groupId: 'group-1', userId: 'user-1' },
    });
  });
});
