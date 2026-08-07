import { toIsoDateTime } from '../../../../shared/utils/time.utilities';
import type { GroupResponseDto } from '../dto/group-response.dto';
import type { GroupResult } from '../group.types';

export function mapGroupResponse(group: GroupResult): GroupResponseDto {
  return {
    id: group.id,
    type: group.type,
    name: group.name,
    createdById: group.createdById,
    createdAt: toIsoDateTime(group.createdAt),
    updatedAt: toIsoDateTime(group.updatedAt),
  };
}
