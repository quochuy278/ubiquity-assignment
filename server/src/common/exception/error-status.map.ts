import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-code';

export const ERROR_STATUS_MAP = {
  [ErrorCode.TASK_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCode.TODO_LIST_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCode.SUBTASK_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCode.GROUP_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCode.INVITATION_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCode.INVITATION_FORBIDDEN]: HttpStatus.FORBIDDEN,
  [ErrorCode.INVITATION_NOT_ALLOWED]: HttpStatus.CONFLICT,
  [ErrorCode.INVITEE_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCode.GROUP_MEMBER_ALREADY_EXISTS]: HttpStatus.CONFLICT,
  [ErrorCode.INVITATION_ALREADY_PENDING]: HttpStatus.CONFLICT,
  [ErrorCode.EMAIL_ALREADY_REGISTERED]: HttpStatus.CONFLICT,
  [ErrorCode.INVALID_CREDENTIALS]: HttpStatus.UNAUTHORIZED,
  [ErrorCode.UNAUTHORIZED]: HttpStatus.UNAUTHORIZED,
  [ErrorCode.INVALID_REFRESH_TOKEN]: HttpStatus.UNAUTHORIZED,
  [ErrorCode.VALIDATION_ERROR]: HttpStatus.BAD_REQUEST,
  [ErrorCode.INTERNAL_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCode.NETWORK_ERROR]: HttpStatus.SERVICE_UNAVAILABLE,
  [ErrorCode.TIMEOUT_ERROR]: HttpStatus.REQUEST_TIMEOUT,
  [ErrorCode.SERVER_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCode.SERVICE_UNAVAILABLE]: HttpStatus.SERVICE_UNAVAILABLE,
  [ErrorCode.UNKNOWN_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR,
} satisfies Record<ErrorCode, HttpStatus>;
