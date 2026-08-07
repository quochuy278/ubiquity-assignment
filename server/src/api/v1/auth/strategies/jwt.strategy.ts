import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ErrorCode } from '../../../../common/exception/error-code';
import { GlobalException } from '../../../../common/exception/global.exception';
import type { ApplicationConfig } from '../../../../shared/config/configuration.interface';
import type { SessionContext } from '../../../../shared/session/session.types';
import type { AccessTokenPayload } from '../auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService<ApplicationConfig, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('auth', { infer: true }).accessTokenSecret,
    });
  }

  validate(payload: unknown): SessionContext {
    if (!this.isAccessTokenPayload(payload)) {
      throw new GlobalException(ErrorCode.UNAUTHORIZED);
    }

    return {
      userId: payload.sub,
      sessionId: payload.sid,
    };
  }

  private isAccessTokenPayload(payload: unknown): payload is AccessTokenPayload {
    return (
      typeof payload === 'object' &&
      payload !== null &&
      'sub' in payload &&
      typeof payload.sub === 'string' &&
      'sid' in payload &&
      typeof payload.sid === 'string'
    );
  }
}
