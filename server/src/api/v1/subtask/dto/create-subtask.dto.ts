import { ApiProperty } from '@nestjs/swagger';
import { Transform, type TransformFnParams } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';
import { trimString } from '../../../../shared/utils/string.utilities';

export class CreateSubTaskDto {
  @ApiProperty({ type: String, example: 'Buy milk' })
  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsString()
  @IsNotEmpty()
  title: string;
}
