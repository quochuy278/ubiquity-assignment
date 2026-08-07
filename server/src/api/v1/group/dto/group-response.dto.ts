import { ApiProperty } from '@nestjs/swagger';
import { GroupType } from '../group.constants';

export class GroupResponseDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: 'string', enum: GroupType, enumName: 'GroupType' })
  type: GroupType;

  @ApiProperty({ type: String })
  name: string;

  @ApiProperty({ type: String })
  createdById: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: string;
}
