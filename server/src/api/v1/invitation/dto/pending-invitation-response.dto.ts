import { ApiProperty } from '@nestjs/swagger';
import { GroupType } from '../../group/group.constants';

export class PendingInvitationResponseDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  token: string;

  @ApiProperty({ type: String })
  groupId: string;

  @ApiProperty({ type: String })
  groupName: string;

  @ApiProperty({ type: 'string', enum: GroupType, enumName: 'GroupType' })
  groupType: GroupType;

  @ApiProperty({ type: String })
  inviterId: string;

  @ApiProperty({ type: String })
  inviterDisplayName: string;

  @ApiProperty({ type: String, format: 'date-time' })
  expiresAt: string;
}
