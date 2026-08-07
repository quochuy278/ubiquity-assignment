import { ApiProperty } from '@nestjs/swagger';

export class TodoListResponseDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  groupId: string;

  @ApiProperty({ type: String })
  name: string;

  @ApiProperty({ type: String, nullable: true })
  icon: string | null;

  @ApiProperty({ type: String, nullable: true })
  color: string | null;

  @ApiProperty({ type: String, example: '1000' })
  rank: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: string;
}
