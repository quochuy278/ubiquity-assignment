import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateTodoCompletionDto {
  @ApiProperty({ type: Boolean, example: true })
  @IsBoolean()
  completed: boolean;
}
