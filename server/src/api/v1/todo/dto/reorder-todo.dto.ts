import { ApiProperty } from '@nestjs/swagger';
import { Transform, type TransformFnParams } from 'class-transformer';
import { IsDefined, IsNotEmpty, IsString, ValidateIf } from 'class-validator';
import { trimString } from '../../../../shared/utils/string.utilities';

export class ReorderTodoDto {
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Todo ID that should immediately follow the moved Todo; null moves it to the end',
    example: 'todo-next',
  })
  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsDefined()
  @ValidateIf((_object, value: unknown) => value !== null)
  @IsString()
  @IsNotEmpty()
  beforeTodoId: string | null;
}
