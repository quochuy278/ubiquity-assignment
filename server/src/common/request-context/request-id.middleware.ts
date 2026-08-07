import { randomUUID } from 'node:crypto';
import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { REQUEST_ID_HEADER } from './request-context.constants';
import { RequestContextService } from './request-context.service';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  constructor(private readonly requestContext: RequestContextService) {}

  use(request: Request, response: Response, next: NextFunction): void {
    const requestId = this.getIncomingRequestId(request) ?? randomUUID();

    response.setHeader(REQUEST_ID_HEADER, requestId);
    this.requestContext.run({ requestId }, next);
  }

  private getIncomingRequestId(request: Request): string | undefined {
    const requestId = request.headers[REQUEST_ID_HEADER];

    if (typeof requestId !== 'string') {
      return undefined;
    }

    const normalizedRequestId = requestId.trim();

    return normalizedRequestId.length > 0 ? normalizedRequestId : undefined;
  }
}
