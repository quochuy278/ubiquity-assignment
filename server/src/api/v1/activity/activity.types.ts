import type { ActivityEvent, Prisma } from '@prisma/client';
import type { ActivityEntityType, ActivityType } from './activity.constants';

export interface CreateActivityInput {
  groupId: string;
  actorId: string;
  type: ActivityType;
  entityType: ActivityEntityType;
  entityId: string;
  metadata?: Prisma.InputJsonValue;
}

export interface ActivityResult
  extends Omit<ActivityEvent, 'type' | 'entityType' | 'performedById'> {
  actorId: string;
  type: ActivityType;
  entityType: ActivityEntityType;
}

export interface ActivityReadResult extends ActivityResult {
  actor: {
    id: string;
    name: string;
  };
}

export interface ActivityPageResult {
  items: ActivityReadResult[];
  nextCursor: string | null;
}
