import { ApiProperty } from '@nestjs/swagger';

export class AppResponseDto {
  @ApiProperty({ type: String, example: 'Hello World!' })
  message: string;
}
