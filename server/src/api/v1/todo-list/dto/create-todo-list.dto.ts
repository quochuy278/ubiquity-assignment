import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, type TransformFnParams } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { trimString } from '../../../../shared/utils/string.utilities';

export class CreateTodoListDto {
  @ApiProperty({ type: String, example: 'Shopping' })
  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ type: String, example: 'shopping-cart' })
  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  icon?: string;

  @ApiPropertyOptional({ type: String, example: '#2563EB' })
  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  color?: string;
}
