import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { MembershipRole } from './membership.constants';
import { MembershipRepository } from './repositories/membership.repository';

@Injectable()
export class MembershipService {
  constructor(private readonly memberships: MembershipRepository) {}

  createOwner(
    groupId: string,
    userId: string,
    transaction?: Prisma.TransactionClient,
  ): Promise<void> {
    return this.memberships.create(
      {
        groupId,
        userId,
        role: MembershipRole.OWNER,
      },
      transaction,
    );
  }

  findGroupIds(userId: string): Promise<string[]> {
    return this.memberships.findGroupIdsByUserId(userId);
  }

  isMember(groupId: string, userId: string): Promise<boolean> {
    return this.memberships.exists(groupId, userId);
  }
}
