import { ApiProperty } from '@nestjs/swagger';
import { ErrorResponseDto } from './error-response.dto';

export class ValidationErrorDetailDto {
  @ApiProperty({ example: 'password' })
  field: string;

  @ApiProperty({
    type: String,
    isArray: true,
    example: ['password must be longer than or equal to 8 characters'],
  })
  messages: string[];
}

export class ValidationErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({ type: ValidationErrorDetailDto, isArray: true })
  errors: ValidationErrorDetailDto[];
}
