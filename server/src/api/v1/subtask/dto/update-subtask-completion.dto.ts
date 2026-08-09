import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateSubTaskCompletionDto {
  @ApiProperty({ type: Boolean, example: true })
  @IsBoolean()
  completed: boolean;
}
