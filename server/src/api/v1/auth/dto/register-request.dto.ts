import { ApiProperty } from '@nestjs/swagger';
import { Transform, type TransformFnParams } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { trimString } from '../../../../shared/utils/string.utilities';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../auth.constants';

export class RegisterRequestDto {
  @ApiProperty({ type: String, example: 'alex@example.com' })
  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsEmail()
  @MaxLength(320)
  email: string;

  @ApiProperty({
    type: String,
    example: 'correct-horse-battery-staple',
    minLength: PASSWORD_MIN_LENGTH,
  })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password: string;

  @ApiProperty({ type: String, example: 'Alex', minLength: 1, maxLength: 100 })
  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName: string;
}
