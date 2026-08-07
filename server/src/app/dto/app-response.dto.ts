import { ApiProperty } from '@nestjs/swagger';

export class AppResponseDto {
  @ApiProperty({ example: 'Hello World!' })
  message: string;
}
