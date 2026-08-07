import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshRequestDto {
  @ApiProperty({ description: 'Opaque refresh token returned by register, login, or refresh' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
