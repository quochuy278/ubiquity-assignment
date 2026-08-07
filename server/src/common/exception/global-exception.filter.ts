import {
  ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { Request } from 'express';
import { ApplicationLoggerService } from '../logger/logger.service';
import { ErrorCode } from './error-code';
import { ERROR_STATUS_MAP } from './error-status.map';
import { GlobalException } from './global.exception';

interface ErrorResponse {
  code: ErrorCode;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter<unknown> {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly logger: ApplicationLoggerService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();

    if (exception instanceof GlobalException) {
      const status = ERROR_STATUS_MAP[exception.code];

      if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
        this.logUnexpectedException(exception, request, exception.context);
      }

      this.httpAdapterHost.httpAdapter.reply(
        context.getResponse(),
        this.toErrorResponse(exception),
        status,
      );
      return;
    }

    // Keep Nest/framework HTTP exceptions intact. They already belong to the HTTP boundary.
    if (exception instanceof HttpException) {
      const status = exception.getStatus();

      if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
        this.logUnexpectedException(exception, request);
      }

      this.httpAdapterHost.httpAdapter.reply(
        context.getResponse(),
        exception.getResponse(),
        status,
      );
      return;
    }

    this.logUnexpectedException(exception, request);
    this.httpAdapterHost.httpAdapter.reply(
      context.getResponse(),
      { code: ErrorCode.INTERNAL_ERROR } satisfies ErrorResponse,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  private toErrorResponse(exception: GlobalException): ErrorResponse {
    return { code: exception.code };
  }

  private logUnexpectedException(
    exception: unknown,
    request: Request,
    errorContext?: GlobalException['context'],
  ): void {
    const error = this.getLoggableError(exception);

    this.logger.error(error, GlobalExceptionFilter.name, {
      ...errorContext,
      ...(exception instanceof GlobalException ? { errorCode: exception.code } : {}),
      method: request.method,
      path: request.originalUrl,
    });
  }

  private getLoggableError(exception: unknown): Error {
    if (exception instanceof GlobalException && exception.cause instanceof Error) {
      return exception.cause;
    }

    return exception instanceof Error ? exception : new Error(String(exception));
  }
}
