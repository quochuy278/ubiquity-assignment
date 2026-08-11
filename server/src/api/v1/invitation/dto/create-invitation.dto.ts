import { ApiProperty } from '@nestjs/swagger';
import { Transform, type TransformFnParams } from 'class-transformer';
import { IsEmail, MaxLength } from 'class-validator';
import { normalizeEmail } from '../../auth/utils/normalize-email';

export class CreateInvitationDto {
  @ApiProperty({ type: String, example: 'member@example.com' })
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? normalizeEmail(value) : value,
  )
  @IsEmail()
  @MaxLength(320)
  email: string;
}
