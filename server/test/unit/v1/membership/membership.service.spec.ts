import type { Prisma } from '@prisma/client';
import { MembershipRole } from '../../../../src/api/v1/membership/membership.constants';
import { MembershipService } from '../../../../src/api/v1/membership/membership.service';
import type { MembershipRepository } from '../../../../src/api/v1/membership/repositories/membership.repository';

describe('Membership use-case orchestration', () => {
  const create = jest.fn();
  const memberships = { create } as unknown as MembershipRepository;
  const service = new MembershipService(memberships);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates an owner membership with the supplied transaction client', async () => {
    const transaction = {} as Prisma.TransactionClient;
    create.mockResolvedValue(undefined);

    await expect(service.createOwner('group-1', 'user-1', transaction)).resolves.toBeUndefined();

    expect(create).toHaveBeenCalledWith(
      {
        groupId: 'group-1',
        userId: 'user-1',
        role: MembershipRole.OWNER,
      },
      transaction,
    );
  });
});
