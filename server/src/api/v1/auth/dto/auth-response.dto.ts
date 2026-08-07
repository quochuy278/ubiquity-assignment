import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto';

export class AuthResponseDto {
  @ApiProperty({ type: String })
  accessToken: string;

  @ApiProperty({ type: String })
  refreshToken: string;

  @ApiProperty({ type: String, example: 'Bearer' })
  tokenType: 'Bearer';

  @ApiProperty({ type: Number, description: 'Access token lifetime in seconds', example: 900 })
  expiresIn: number;

  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;
}
