import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, type TransformFnParams } from 'class-transformer';
import { IsISO8601, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { trimString } from '../../../../shared/utils/string.utilities';

export class CreateTodoDto {
  @ApiProperty({ type: String, example: 'Buy groceries' })
  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'Milk, eggs, and bread',
  })
  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string | null;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    example: '2026-08-10T18:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  dueDate?: string | null;
}
