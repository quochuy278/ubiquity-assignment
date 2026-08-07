import { ApiProperty } from '@nestjs/swagger';
import { Transform, type TransformFnParams } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { trimString } from '../../../../shared/utils/string.utilities';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../auth.constants';

export class LoginRequestDto {
  @ApiProperty({ example: 'alex@example.com' })
  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsEmail()
  @MaxLength(320)
  email: string;

  @ApiProperty({ example: 'correct-horse-battery-staple' })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password: string;
}
