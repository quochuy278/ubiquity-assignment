import { ApiProperty } from '@nestjs/swagger';
import { ErrorCode } from '../../../common/exception/error-code';

export class ErrorResponseDto {
  @ApiProperty({
    type: 'string',
    enum: ErrorCode,
    enumName: 'ErrorCode',
    example: ErrorCode.INTERNAL_ERROR,
  })
  code: ErrorCode;
}
