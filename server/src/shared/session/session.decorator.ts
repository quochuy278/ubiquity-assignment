import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { ErrorCode } from '../../common/exception/error-code';
import { GlobalException } from '../../common/exception/global.exception';
import type { SessionContext, SessionRequest } from './session.types';

export const Session = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SessionContext => {
    const session = context.switchToHttp().getRequest<SessionRequest>().user;

    if (!session) {
      throw new GlobalException(ErrorCode.UNAUTHORIZED);
    }

    return session;
  },
);
