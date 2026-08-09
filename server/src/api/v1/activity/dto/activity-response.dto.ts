import { ApiProperty } from '@nestjs/swagger';
import { ActivityEntityType, ActivityType } from '../activity.constants';

export class ActivityResponseDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  groupId: string;

  @ApiProperty({ type: String })
  actorId: string;

  @ApiProperty({ type: 'string', enum: ActivityType, enumName: 'ActivityType' })
  type: ActivityType;

  @ApiProperty({ type: 'string', enum: ActivityEntityType, enumName: 'ActivityEntityType' })
  entityType: ActivityEntityType;

  @ApiProperty({ type: String })
  entityId: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: string;
}

export class ActivityPageResponseDto {
  @ApiProperty({ type: ActivityResponseDto, isArray: true })
  items: ActivityResponseDto[];

  @ApiProperty({ type: String, nullable: true })
  nextCursor: string | null;
}
