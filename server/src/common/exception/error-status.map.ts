import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-code';

export const ERROR_STATUS_MAP = {
  [ErrorCode.TASK_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCode.TODO_LIST_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCode.GROUP_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCode.EMAIL_ALREADY_REGISTERED]: HttpStatus.CONFLICT,
  [ErrorCode.INVALID_CREDENTIALS]: HttpStatus.UNAUTHORIZED,
  [ErrorCode.UNAUTHORIZED]: HttpStatus.UNAUTHORIZED,
  [ErrorCode.INVALID_REFRESH_TOKEN]: HttpStatus.UNAUTHORIZED,
  [ErrorCode.VALIDATION_ERROR]: HttpStatus.BAD_REQUEST,
  [ErrorCode.INTERNAL_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR,
} satisfies Record<ErrorCode, HttpStatus>;
