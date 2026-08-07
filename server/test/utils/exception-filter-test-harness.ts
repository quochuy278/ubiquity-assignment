import type { ArgumentsHost } from '@nestjs/common';
import type { AbstractHttpAdapter } from '@nestjs/core';
import { HttpAdapterHost } from '@nestjs/core';
import type { ApplicationLoggerService } from '../../src/common/logger/logger.service';

interface TestHttpRequest {
  method: string;
  originalUrl: string;
}

interface ExceptionFilterTestHarness {
  adapterHost: HttpAdapterHost;
  host: ArgumentsHost;
  logger: ApplicationLoggerService;
  loggerError: jest.Mock;
  reply: jest.Mock;
  request: TestHttpRequest;
  response: object;
}

const DEFAULT_REQUEST: TestHttpRequest = {
  method: 'GET',
  originalUrl: '/api/tasks/task-1',
};

export function createExceptionFilterTestHarness(
  requestOverrides: Partial<TestHttpRequest> = {},
): ExceptionFilterTestHarness {
  const request = { ...DEFAULT_REQUEST, ...requestOverrides };
  const response = {};
  const reply = jest.fn();
  const loggerError = jest.fn();
  const logger = { error: loggerError } as unknown as ApplicationLoggerService;
  const adapterHost = new HttpAdapterHost();
  adapterHost.httpAdapter = { reply } as unknown as AbstractHttpAdapter;

  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as ArgumentsHost;

  return {
    adapterHost,
    host,
    logger,
    loggerError,
    reply,
    request,
    response,
  };
}
