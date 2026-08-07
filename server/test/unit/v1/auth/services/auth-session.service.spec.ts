import dayjs from 'dayjs';
import type { AuthSessionRepository } from '../../../../../src/api/v1/auth/repositories/auth-session.repository';
import { AuthSessionService } from '../../../../../src/api/v1/auth/services/auth-session.service';
import type { AuthTokenService } from '../../../../../src/api/v1/auth/services/auth-token.service';
import { ErrorCode } from '../../../../../src/common/exception/error-code';
import { createPublicUserFixture } from '../../../../utils/auth-test.fixtures';

describe('Refresh-token session lifecycle', () => {
  const createSessionRecord = jest.fn();
  const findSession = jest.fn();
  const rotateSession = jest.fn();
  const repository = {
    create: createSessionRecord,
    findById: findSession,
    rotate: rotateSession,
  } as unknown as AuthSessionRepository;
  const createRefreshToken = jest.fn();
  const parseRefreshToken = jest.fn();
  const matchesRefreshSecret = jest.fn();
  const tokenService = {
    createRefreshToken,
    parseRefreshToken,
    matchesRefreshSecret,
  } as unknown as AuthTokenService;
  const sessions = new AuthSessionService(repository, tokenService);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(dayjs('2026-08-07T12:00:00.000Z').toDate());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stores only the refresh-token hash when a session is created', async () => {
    createRefreshToken.mockImplementation((sessionId: string) => ({
      token: `${sessionId}.refresh-secret`,
      hash: 'secret-hash',
    }));
    createSessionRecord.mockResolvedValue({});

    const result = await sessions.create('user-1');

    expect(createRefreshToken).toHaveBeenCalledWith(result.sessionId);
    expect(result.refreshToken).toMatch(/^[^.]+\.refresh-secret$/u);
    expect(createSessionRecord).toHaveBeenCalledWith({
      id: result.sessionId,
      userId: 'user-1',
      refreshTokenHash: 'secret-hash',
      expiresAt: dayjs('2026-09-06T12:00:00.000Z').toDate(),
    });
    expect(createSessionRecord.mock.calls[0]?.[0]).not.toHaveProperty('refreshToken');
  });

  it('rotates a valid refresh token atomically and extends the session lifetime', async () => {
    const user = createPublicUserFixture();
    parseRefreshToken.mockReturnValue({ sessionId: 'session-1', secret: 'refresh-secret' });
    matchesRefreshSecret.mockReturnValue(true);
    findSession.mockResolvedValue({
      id: 'session-1',
      refreshTokenHash: 'old-hash',
      expiresAt: dayjs('2026-08-08T12:00:00.000Z').toDate(),
      user,
    });
    createRefreshToken.mockReturnValue({ token: 'session-1.next-secret', hash: 'next-hash' });
    rotateSession.mockResolvedValue(true);

    const result = await sessions.refresh('session-1.refresh-secret');

    expect(rotateSession).toHaveBeenCalledWith({
      id: 'session-1',
      currentRefreshTokenHash: 'old-hash',
      nextRefreshTokenHash: 'next-hash',
      lastSeenAt: dayjs('2026-08-07T12:00:00.000Z').toDate(),
      expiresAt: dayjs('2026-09-06T12:00:00.000Z').toDate(),
    });
    expect(result).toEqual({
      sessionId: 'session-1',
      refreshToken: 'session-1.next-secret',
      user,
    });
  });

  it('rejects an expired refresh session before attempting token rotation', async () => {
    parseRefreshToken.mockReturnValue({ sessionId: 'session-1', secret: 'refresh-secret' });
    findSession.mockResolvedValue({
      id: 'session-1',
      refreshTokenHash: 'old-hash',
      expiresAt: dayjs('2026-08-07T11:59:59.000Z').toDate(),
      user: createPublicUserFixture(),
    });

    await expect(sessions.refresh('session-1.refresh-secret')).rejects.toMatchObject({
      code: ErrorCode.INVALID_REFRESH_TOKEN,
    });
    expect(rotateSession).not.toHaveBeenCalled();
  });

  it('rejects a replayed refresh token when another request rotated it first', async () => {
    parseRefreshToken.mockReturnValue({ sessionId: 'session-1', secret: 'refresh-secret' });
    matchesRefreshSecret.mockReturnValue(true);
    findSession.mockResolvedValue({
      id: 'session-1',
      refreshTokenHash: 'old-hash',
      expiresAt: dayjs('2026-08-08T12:00:00.000Z').toDate(),
      user: createPublicUserFixture(),
    });
    createRefreshToken.mockReturnValue({ token: 'session-1.next-secret', hash: 'next-hash' });
    rotateSession.mockResolvedValue(false);

    await expect(sessions.refresh('session-1.refresh-secret')).rejects.toMatchObject({
      code: ErrorCode.INVALID_REFRESH_TOKEN,
    });
  });
});
