import { AuthService } from '../../../../src/api/v1/auth/auth.service';
import type { AuthSessionService } from '../../../../src/api/v1/auth/services/auth-session.service';
import type { AuthTokenService } from '../../../../src/api/v1/auth/services/auth-token.service';
import type { AuthUserService } from '../../../../src/api/v1/auth/services/auth-user.service';
import type { PasswordService } from '../../../../src/api/v1/auth/services/password.service';
import { ErrorCode } from '../../../../src/common/exception/error-code';
import { GlobalException } from '../../../../src/common/exception/global.exception';
import {
  createPublicUserFixture,
  createUserWithPasswordFixture,
} from '../../../utils/auth-test.fixtures';

describe('Authentication use-case orchestration', () => {
  const findByEmailWithPassword = jest.fn();
  const emailExists = jest.fn();
  const findById = jest.fn();
  const createUser = jest.fn();
  const hashPassword = jest.fn();
  const verifyPassword = jest.fn();
  const createSession = jest.fn();
  const refreshSession = jest.fn();
  const signAccessToken = jest.fn();
  const getAccessTokenTtlSeconds = jest.fn(() => 900);
  const users = {
    emailExists,
    findByEmailWithPassword,
    findById,
    create: createUser,
  } as unknown as AuthUserService;
  const passwords = {
    hash: hashPassword,
    verify: verifyPassword,
  } as unknown as PasswordService;
  const sessions = {
    create: createSession,
    refresh: refreshSession,
  } as unknown as AuthSessionService;
  const tokens = {
    signAccessToken,
    getAccessTokenTtlSeconds,
  } as unknown as AuthTokenService;
  const auth = new AuthService(users, passwords, sessions, tokens);

  beforeEach(() => {
    jest.clearAllMocks();
    getAccessTokenTtlSeconds.mockReturnValue(900);
  });

  it('normalizes credentials, creates a user, and returns a token pair during registration', async () => {
    const user = createPublicUserFixture();
    emailExists.mockResolvedValue(false);
    hashPassword.mockResolvedValue('password-hash');
    createUser.mockResolvedValue(user);
    createSession.mockResolvedValue({ sessionId: 'session-1', refreshToken: 'refresh-1' });
    signAccessToken.mockResolvedValue('access-1');

    const result = await auth.register({
      email: '  Alex@Example.COM ',
      password: 'secure-password',
      displayName: '  Alex  ',
    });

    expect(emailExists).toHaveBeenCalledWith('alex@example.com');
    expect(hashPassword).toHaveBeenCalledWith('secure-password');
    expect(createUser).toHaveBeenCalledWith({
      email: 'alex@example.com',
      passwordHash: 'password-hash',
      displayName: 'Alex',
    });
    expect(result).toMatchObject({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      tokenType: 'Bearer',
      expiresIn: 900,
      user: { id: 'user-1', email: 'alex@example.com' },
    });
  });

  it('rejects registration when the normalized email is already registered', async () => {
    emailExists.mockResolvedValue(true);

    await expect(
      auth.register({
        email: 'Alex@Example.com',
        password: 'secure-password',
        displayName: 'Alex',
      }),
    ).rejects.toMatchObject({
      code: ErrorCode.EMAIL_ALREADY_REGISTERED,
      context: { email: 'alex@example.com' },
    } satisfies Partial<GlobalException>);
    expect(hashPassword).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
  });

  it('returns a new authenticated session when login credentials are valid', async () => {
    const user = createUserWithPasswordFixture();
    findByEmailWithPassword.mockResolvedValue(user);
    verifyPassword.mockResolvedValue(true);
    createSession.mockResolvedValue({ sessionId: 'session-1', refreshToken: 'refresh-1' });
    signAccessToken.mockResolvedValue('access-1');

    const result = await auth.login({
      email: 'ALEX@example.com',
      password: 'secure-password',
    });

    expect(verifyPassword).toHaveBeenCalledWith('password-hash', 'secure-password');
    expect(result.accessToken).toBe('access-1');
    expect(result.refreshToken).toBe('refresh-1');
  });

  it('returns the same generic error when the email or password is invalid', async () => {
    findByEmailWithPassword.mockResolvedValue(null);

    await expect(
      auth.login({ email: 'missing@example.com', password: 'secure-password' }),
    ).rejects.toMatchObject({ code: ErrorCode.INVALID_CREDENTIALS });
    expect(verifyPassword).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
  });

  it('rotates the refresh session and returns a new access token', async () => {
    const user = createPublicUserFixture();
    refreshSession.mockResolvedValue({
      user,
      sessionId: 'session-1',
      refreshToken: 'refresh-2',
    });
    signAccessToken.mockResolvedValue('access-2');

    const result = await auth.refresh('refresh-1');

    expect(refreshSession).toHaveBeenCalledWith('refresh-1');
    expect(signAccessToken).toHaveBeenCalledWith('user-1', 'session-1');
    expect(result).toMatchObject({ accessToken: 'access-2', refreshToken: 'refresh-2' });
  });

  it('returns the authenticated public user without exposing a password hash', async () => {
    findById.mockResolvedValue(createPublicUserFixture());

    const result = await auth.me('user-1');

    expect(result).toEqual({
      id: 'user-1',
      email: 'alex@example.com',
      displayName: 'Alex',
      avatarUrl: null,
      createdAt: '2026-08-01T10:00:00.000Z',
      updatedAt: '2026-08-01T10:00:00.000Z',
    });
    expect(result).not.toHaveProperty('passwordHash');
  });
});
