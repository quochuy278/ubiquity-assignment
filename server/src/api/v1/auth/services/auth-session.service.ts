import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';
import { ErrorCode } from '../../../../common/exception/error-code';
import { GlobalException } from '../../../../common/exception/global.exception';
import { REFRESH_TOKEN_TTL_SECONDS } from '../../../../shared/session/session.constants';
import { now } from '../../../../shared/utils/time.utilities';
import type { PublicUser } from '../auth.types';
import { AuthSessionRepository } from '../repositories/auth-session.repository';
import { AuthTokenService } from './auth-token.service';

interface SessionCredential {
  refreshToken: string;
  sessionId: string;
}

interface RefreshedSession extends SessionCredential {
  user: PublicUser;
}

@Injectable()
export class AuthSessionService {
  constructor(
    private readonly sessions: AuthSessionRepository,
    private readonly tokenService: AuthTokenService,
  ) {}

  async create(userId: string): Promise<SessionCredential> {
    const sessionId = randomUUID();
    const credential = this.tokenService.createRefreshToken(sessionId);

    await this.sessions.create({
      id: sessionId,
      userId,
      refreshTokenHash: credential.hash,
      expiresAt: now().add(REFRESH_TOKEN_TTL_SECONDS, 'second').toDate(),
    });

    return { sessionId, refreshToken: credential.token };
  }

  async refresh(refreshToken: string): Promise<RefreshedSession> {
    const parsedToken = this.tokenService.parseRefreshToken(refreshToken);

    if (!parsedToken) {
      throw this.invalidRefreshToken();
    }

    const session = await this.sessions.findById(parsedToken.sessionId);
    const currentTime = now();

    if (
      !session ||
      !dayjs(session.expiresAt).isAfter(currentTime) ||
      !this.tokenService.matchesRefreshSecret(parsedToken.secret, session.refreshTokenHash)
    ) {
      throw this.invalidRefreshToken();
    }

    const nextCredential = this.tokenService.createRefreshToken(session.id);
    const rotated = await this.sessions.rotate({
      id: session.id,
      currentRefreshTokenHash: session.refreshTokenHash,
      nextRefreshTokenHash: nextCredential.hash,
      lastSeenAt: currentTime.toDate(),
      expiresAt: currentTime.add(REFRESH_TOKEN_TTL_SECONDS, 'second').toDate(),
    });

    if (!rotated) {
      throw this.invalidRefreshToken();
    }

    return {
      sessionId: session.id,
      refreshToken: nextCredential.token,
      user: session.user,
    };
  }

  logout(userId: string, sessionId: string): Promise<void> {
    return this.sessions.deleteForUser(sessionId, userId);
  }

  private invalidRefreshToken(): GlobalException {
    return new GlobalException(ErrorCode.INVALID_REFRESH_TOKEN);
  }
}
