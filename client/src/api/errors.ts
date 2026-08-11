import { isAxiosError } from 'axios';
import {
  ErrorCode,
  type ValidationErrorDetailDto,
  type ValidationErrorResponseDto,
} from '@/api/generated';

interface ApiClientErrorOptions {
  cause?: unknown;
  code: ErrorCode;
  errors?: ValidationErrorDetailDto[];
  status: number | null;
}

export class ApiClientError extends Error {
  readonly code: ErrorCode;
  readonly errors: ValidationErrorDetailDto[];
  readonly status: number | null;

  constructor({ cause, code, errors = [], status }: ApiClientErrorOptions) {
    super(code, { cause });
    this.name = 'ApiClientError';
    this.code = code;
    this.errors = errors;
    this.status = status;
  }
}

const backendErrorCodes = new Set<string>(Object.values(ErrorCode));
const userFacingErrorMessages: Partial<Record<ErrorCode, string>> = {
  [ErrorCode.InviteeNotFound]: 'User not found.',
};

function isBackendErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && backendErrorCodes.has(value);
}

function isValidationErrorDetail(value: unknown): value is ValidationErrorDetailDto {
  return (
    typeof value === 'object' &&
    value !== null &&
    'field' in value &&
    typeof value.field === 'string' &&
    'messages' in value &&
    Array.isArray(value.messages) &&
    value.messages.every((message) => typeof message === 'string')
  );
}

function getValidationErrors(data: unknown, code: ErrorCode) {
  if (code !== ErrorCode.ValidationError || typeof data !== 'object' || data === null) {
    return [];
  }

  const candidate = data as Partial<ValidationErrorResponseDto>;
  return Array.isArray(candidate.errors) && candidate.errors.every(isValidationErrorDetail)
    ? candidate.errors
    : [];
}

export function normalizeApiError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) {
    return error;
  }

  if (!isAxiosError(error)) {
    return new ApiClientError({
      cause: error,
      code: ErrorCode.UnknownError,
      status: null,
    });
  }

  if (!error.response) {
    return new ApiClientError({
      cause: error,
      code:
        error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
          ? ErrorCode.TimeoutError
          : ErrorCode.NetworkError,
      status: null,
    });
  }

  const { data, status } = error.response;
  const code =
    typeof data === 'object' && data !== null && 'code' in data && isBackendErrorCode(data.code)
      ? data.code
      : null;

  if (!code) {
    const fallbackCode =
      status === 408 || status === 504
        ? ErrorCode.TimeoutError
        : status === 503
          ? ErrorCode.ServiceUnavailable
          : status >= 500
            ? ErrorCode.ServerError
            : ErrorCode.UnknownError;

    return new ApiClientError({
      cause: error,
      code: fallbackCode,
      status,
    });
  }

  return new ApiClientError({
    cause: error,
    code,
    errors: getValidationErrors(data, code),
    status,
  });
}

export function getApiErrorMessage(error: unknown) {
  const apiError = normalizeApiError(error);

  if (apiError.code === ErrorCode.NetworkError) {
    return 'Unable to reach the server. Check your connection and try again.';
  }

  if (apiError.code === ErrorCode.TimeoutError) {
    return 'The request timed out. Please try again.';
  }

  if (apiError.code === ErrorCode.ServiceUnavailable) {
    return 'The service is temporarily unavailable. Please try again later.';
  }

  if (apiError.code === ErrorCode.ServerError || apiError.code === ErrorCode.UnknownError) {
    return 'Something went wrong. Please try again.';
  }

  const userFacingMessage = userFacingErrorMessages[apiError.code];
  if (userFacingMessage) return userFacingMessage;

  return apiError.code.toLowerCase().replaceAll('_', ' ');
}
