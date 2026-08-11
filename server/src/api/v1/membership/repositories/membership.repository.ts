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

  async findRole(
    groupId: string,
    userId: string,
    transaction?: Prisma.TransactionClient,
  ): Promise<MembershipRole | null> {
    const client = transaction ?? this.prisma;
    const membership = await client.membership.findUnique({
      where: { groupId_userId: { groupId, userId } },
      select: { role: true },
    });

    return membership ? (membership.role as MembershipRole) : null;
  }

  async findByUserId(userId: string): Promise<Array<{ groupId: string; role: MembershipRole }>> {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      select: { groupId: true, role: true },
      orderBy: [{ joinedAt: 'desc' }, { groupId: 'asc' }],
    });

    return memberships as Array<{ groupId: string; role: MembershipRole }>;
  }

  async findGroupIdsByUserId(userId: string): Promise<string[]> {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      select: { groupId: true },
      orderBy: [{ joinedAt: 'desc' }, { groupId: 'asc' }],
    });

    return memberships.map(({ groupId }) => groupId);
  }

  async exists(
    groupId: string,
    userId: string,
    transaction?: Prisma.TransactionClient,
  ): Promise<boolean> {
    return (await this.findRole(groupId, userId, transaction)) !== null;
  }
}
