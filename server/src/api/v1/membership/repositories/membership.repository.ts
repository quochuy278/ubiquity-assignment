import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import type { MembershipRole } from '../membership.constants';

export interface CreateMembershipInput {
  groupId: string;
  userId: string;
  role: MembershipRole;
}

@Injectable()
export class MembershipRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    input: CreateMembershipInput,
    transaction?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = transaction ?? this.prisma;
    await client.membership.create({ data: input });
  }

  async findGroupIdsByUserId(userId: string): Promise<string[]> {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      select: { groupId: true },
      orderBy: [{ joinedAt: 'desc' }, { groupId: 'asc' }],
    });

    return memberships.map(({ groupId }) => groupId);
  }

  async exists(groupId: string, userId: string): Promise<boolean> {
    const membership = await this.prisma.membership.findUnique({
      where: { groupId_userId: { groupId, userId } },
      select: { groupId: true },
    });

    return membership !== null;
  }
}
