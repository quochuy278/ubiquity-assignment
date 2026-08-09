import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { GroupService } from '../group/group.service';
import type { ActivityPageResult, ActivityResult, CreateActivityInput } from './activity.types';
import { ActivityRepository } from './repositories/activity.repository';

@Injectable()
export class ActivityService {
  constructor(
    private readonly activities: ActivityRepository,
    private readonly groups: GroupService,
  ) {}

  record(
    input: CreateActivityInput,
    transaction: Prisma.TransactionClient,
  ): Promise<ActivityResult> {
    return this.activities.create(input, transaction);
  }

  async findForGroup(
    userId: string,
    groupId: string,
    limit: number,
    cursor?: string,
  ): Promise<ActivityPageResult> {
    await this.groups.findById(userId, groupId);
    return this.activities.findPage(groupId, limit, cursor);
  }
}
