import type { ActivityPageResult, ActivityResult } from '../activity.types';
import type { ActivityPageResponseDto, ActivityResponseDto } from '../dto/activity-response.dto';

export function mapActivityResponse(activity: ActivityResult): ActivityResponseDto {
  return {
    id: activity.id,
    groupId: activity.groupId,
    actorId: activity.actorId,
    type: activity.type,
    entityType: activity.entityType,
    entityId: activity.entityId,
    createdAt: activity.createdAt.toISOString(),
  };
}

export function mapActivityPageResponse(page: ActivityPageResult): ActivityPageResponseDto {
  return {
    items: page.items.map(mapActivityResponse),
    nextCursor: page.nextCursor,
  };
}
