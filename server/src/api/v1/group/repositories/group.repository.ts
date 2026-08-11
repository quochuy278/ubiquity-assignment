import { Injectable } from '@nestjs/common';
import type { Group, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { isGroupType } from '../group.constants';
import type { CreateGroupInput, GroupRecord } from '../group.types';

@Injectable()
export class GroupRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    input: CreateGroupInput,
    createdById: string,
    transaction?: Prisma.TransactionClient,
  ): Promise<GroupRecord> {
    const client = transaction ?? this.prisma;

    const group = await client.group.create({
      data: {
        type: input.type,
        name: input.name,
        createdById,
      },
    });

    return this.toGroupResult(group);
  }

  async findByIds(groupIds: readonly string[]): Promise<GroupRecord[]> {
    const groups = await this.prisma.group.findMany({
      where: { id: { in: [...groupIds] } },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });

    return groups.map((group) => this.toGroupResult(group));
  }

  async findById(groupId: string): Promise<GroupRecord | null> {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });

    return group ? this.toGroupResult(group) : null;
  }

  private toGroupResult(group: Group): GroupRecord {
    if (!isGroupType(group.type)) {
      throw new Error(`Unsupported persisted group type: ${group.type}`);
    }

    return { ...group, type: group.type };
  }
}
