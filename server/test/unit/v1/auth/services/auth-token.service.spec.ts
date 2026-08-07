import { JwtService } from '@nestjs/jwt';
import { AuthTokenService } from '../../../../../src/api/v1/auth/services/auth-token.service';
import { ACCESS_TOKEN_TTL_SECONDS } from '../../../../../src/shared/session/session.constants';

describe('Authentication token creation and verification', () => {
  const accessTokenSecret = 'test-access-token-secret-at-least-32-characters';
  const jwtService = new JwtService({ secret: accessTokenSecret });
  const tokens = new AuthTokenService(jwtService);

  it('signs a bearer token containing stable identity claims and the shared lifetime', async () => {
    const token = await tokens.signAccessToken('user-1', 'session-1');
    const payload = await jwtService.verifyAsync<{
      sub: string;
      sid: string;
      exp: number;
      iat: number;
    }>(token);

    expect(payload).toMatchObject({
      sub: 'user-1',
      sid: 'session-1',
    });
    expect(payload.exp - payload.iat).toBe(ACCESS_TOKEN_TTL_SECONDS);
    expect(tokens.getAccessTokenTtlSeconds()).toBe(ACCESS_TOKEN_TTL_SECONDS);
  });

  it('creates an opaque refresh token whose secret matches only its stored hash', () => {
    const credential = tokens.createRefreshToken('session-1');
    const parsed = tokens.parseRefreshToken(credential.token);

    expect(parsed).toEqual({
      sessionId: 'session-1',
      secret: expect.any(String),
    });
    expect(credential.token).not.toContain(credential.hash);
    expect(tokens.matchesRefreshSecret(parsed?.secret ?? '', credential.hash)).toBe(true);
    expect(tokens.matchesRefreshSecret('different-secret', credential.hash)).toBe(false);
  });

  it.each(['', 'missing-separator', '.missing-session', 'session.', 'too.many.parts'])(
    'rejects the malformed refresh token %j',
    (token) => {
      expect(tokens.parseRefreshToken(token)).toBeNull();
    },
  );
});
