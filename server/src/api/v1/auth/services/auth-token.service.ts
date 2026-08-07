import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ACCESS_TOKEN_TTL_SECONDS } from '../../../../shared/session/session.constants';
import type { AccessTokenPayload, RefreshTokenCredential } from '../auth.types';

interface ParsedRefreshToken {
  secret: string;
  sessionId: string;
}

@Injectable()
export class AuthTokenService {
  constructor(private readonly jwtService: JwtService) {}

  getAccessTokenTtlSeconds(): number {
    return ACCESS_TOKEN_TTL_SECONDS;
  }

  signAccessToken(userId: string, sessionId: string): Promise<string> {
    const payload: AccessTokenPayload = { sub: userId, sid: sessionId };

    return this.jwtService.signAsync(payload, {
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    });
  }

  createRefreshToken(sessionId: string): RefreshTokenCredential {
    const secret = randomBytes(32).toString('base64url');

    return {
      token: `${sessionId}.${secret}`,
      hash: this.hashRefreshSecret(secret),
    };
  }

  parseRefreshToken(token: string): ParsedRefreshToken | null {
    const separatorIndex = token.indexOf('.');

    if (separatorIndex <= 0 || separatorIndex !== token.lastIndexOf('.')) {
      return null;
    }

    const sessionId = token.slice(0, separatorIndex);
    const secret = token.slice(separatorIndex + 1);

    return secret ? { sessionId, secret } : null;
  }

  matchesRefreshSecret(secret: string, expectedHash: string): boolean {
    const actual = Buffer.from(this.hashRefreshSecret(secret), 'hex');
    const expected = Buffer.from(expectedHash, 'hex');

    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  hashRefreshSecret(secret: string): string {
    return createHash('sha256').update(secret).digest('hex');
  }
}
