import { Injectable } from '@nestjs/common';
import type { ActivityEvent, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { ActivityEntityType, ActivityType } from '../activity.constants';
import type { ActivityPageResult, ActivityResult, CreateActivityInput } from '../activity.types';

@Injectable()
export class ActivityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    input: CreateActivityInput,
    transaction?: Prisma.TransactionClient,
  ): Promise<ActivityResult> {
    const client = transaction ?? this.prisma;
    const activity = await client.activityEvent.create({
      data: {
        groupId: input.groupId,
        performedById: input.actorId,
        type: input.type,
        entityType: input.entityType,
        entityId: input.entityId,
        ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
      },
    });

    return this.toResult(activity);
  }

  async findPage(groupId: string, limit: number, cursor?: string): Promise<ActivityPageResult> {
    const activities = await this.prisma.activityEvent.findMany({
      where: { groupId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasNextPage = activities.length > limit;
    const page = activities.slice(0, limit);

    return {
      items: page.map((activity) => this.toResult(activity)),
      nextCursor: hasNextPage ? (page.at(-1)?.id ?? null) : null,
    };
  }

  private toResult(activity: ActivityEvent): ActivityResult {
    if (!Object.values(ActivityType).includes(activity.type as ActivityType)) {
      throw new Error(`Unsupported persisted activity type: ${activity.type}`);
    }
    if (!Object.values(ActivityEntityType).includes(activity.entityType as ActivityEntityType)) {
      throw new Error(`Unsupported persisted activity entity type: ${activity.entityType}`);
    }

    const { performedById, ...rest } = activity;
    return {
      ...rest,
      actorId: performedById,
      type: activity.type as ActivityType,
      entityType: activity.entityType as ActivityEntityType,
    };
  }
}
