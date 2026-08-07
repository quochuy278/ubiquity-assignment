import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from '../../../../../src/api/v1/auth/strategies/jwt.strategy';
import { ErrorCode } from '../../../../../src/common/exception/error-code';
import type { ApplicationConfig } from '../../../../../src/shared/config/configuration.interface';

describe('JWT payload to shared session context mapping', () => {
  const configService = {
    get: jest.fn(() => ({
      accessTokenSecret: 'test-access-token-secret-at-least-32-characters',
    })),
  } as unknown as ConfigService<ApplicationConfig, true>;
  const strategy = new JwtStrategy(configService);

  it('maps valid stable identity claims to a shared session context', () => {
    expect(strategy.validate({ sub: 'user-1', sid: 'session-1' })).toEqual({
      userId: 'user-1',
      sessionId: 'session-1',
    });
  });

  it.each([null, {}, { sub: 'user-1' }, { sid: 'session-1' }, { sub: 123, sid: 'session-1' }])(
    'rejects the malformed JWT payload %j',
    (payload) => {
      expect(() => strategy.validate(payload)).toThrow(
        expect.objectContaining({ code: ErrorCode.UNAUTHORIZED }),
      );
    },
  );
});
