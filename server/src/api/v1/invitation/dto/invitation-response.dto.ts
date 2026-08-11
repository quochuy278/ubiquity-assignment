import { ApiProperty } from '@nestjs/swagger';
import { InvitationStatus } from '../invitation.constants';

export class InvitationResponseDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  groupId: string;

  @ApiProperty({ type: String })
  email: string;

  @ApiProperty({ type: 'string', enum: InvitationStatus, enumName: 'InvitationStatus' })
  status: InvitationStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  expiresAt: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: string;
}
