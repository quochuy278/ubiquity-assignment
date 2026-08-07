import { ErrorCode } from './error-code';

export type ErrorContext = Record<string, unknown>;

export class GlobalException extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly context?: ErrorContext,
    options?: ErrorOptions,
  ) {
    super(code, options);
    this.name = GlobalException.name;
  }
}
