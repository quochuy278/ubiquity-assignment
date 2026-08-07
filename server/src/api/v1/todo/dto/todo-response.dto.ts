import { ApiProperty } from '@nestjs/swagger';
import { TodoStatus } from '../todo.constants';

export class TodoResponseDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  todoListId: string;

  @ApiProperty({ type: String })
  title: string;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ type: 'number', enum: TodoStatus, enumName: 'TodoStatus' })
  status: number;

  @ApiProperty({ type: String, example: '1000' })
  rank: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  dueDate: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  completedAt: string | null;

  @ApiProperty({ type: String, nullable: true })
  assignedToId: string | null;

  @ApiProperty({ type: String })
  createdById: string;

  @ApiProperty({ type: String, nullable: true })
  updatedById: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: string;
}
