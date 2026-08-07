import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  email: string;

  @ApiProperty({ type: String })
  displayName: string;

  @ApiProperty({ type: String, nullable: true })
  avatarUrl: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: string;
}
