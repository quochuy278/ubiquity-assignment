import { ApiProperty } from '@nestjs/swagger';

export class SubTaskResponseDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  todoId: string;

  @ApiProperty({ type: String })
  title: string;

  @ApiProperty({ type: Boolean })
  completed: boolean;

  @ApiProperty({ type: String, example: '1000' })
  rank: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: string;
}
