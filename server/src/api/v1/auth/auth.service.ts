import { Injectable } from '@nestjs/common';
import { ErrorCode } from '../../../common/exception/error-code';
import { GlobalException } from '../../../common/exception/global.exception';
import type { PublicUser } from './auth.types';
import type { AuthResponseDto } from './dto/auth-response.dto';
import type { LoginRequestDto } from './dto/login-request.dto';
import type { RegisterRequestDto } from './dto/register-request.dto';
import type { UserResponseDto } from './dto/user-response.dto';
import { AuthSessionService } from './services/auth-session.service';
import { AuthTokenService } from './services/auth-token.service';
import { AuthUserService } from './services/auth-user.service';
import { PasswordService } from './services/password.service';
import { mapPublicUser } from './utils/map-public-user';
import { normalizeEmail } from './utils/normalize-email';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: AuthUserService,
    private readonly passwords: PasswordService,
    private readonly sessions: AuthSessionService,
    private readonly tokens: AuthTokenService,
  ) {}

  async register(input: RegisterRequestDto): Promise<AuthResponseDto> {
    const email = normalizeEmail(input.email);
    const emailAlreadyRegistered = await this.users.emailExists(email);

    if (emailAlreadyRegistered) {
      throw new GlobalException(ErrorCode.EMAIL_ALREADY_REGISTERED, { email });
    }

    const passwordHash = await this.passwords.hash(input.password);
    const user = await this.users.create({
      email,
      passwordHash,
      displayName: input.displayName.trim(),
    });

    return this.createAuthenticatedSession(user);
  }

  async login(input: LoginRequestDto): Promise<AuthResponseDto> {
    const user = await this.users.findByEmailWithPassword(normalizeEmail(input.email));

    if (!user || !(await this.passwords.verify(user.passwordHash, input.password))) {
      throw new GlobalException(ErrorCode.INVALID_CREDENTIALS);
    }

    return this.createAuthenticatedSession(user);
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    const session = await this.sessions.refresh(refreshToken);
    const accessToken = await this.tokens.signAccessToken(session.user.id, session.sessionId);

    return {
      accessToken,
      refreshToken: session.refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.tokens.getAccessTokenTtlSeconds(),
      user: mapPublicUser(session.user),
    };
  }

  async me(userId: string): Promise<UserResponseDto> {
    const user = await this.users.findById(userId);

    if (!user) {
      throw new GlobalException(ErrorCode.UNAUTHORIZED);
    }

    return mapPublicUser(user);
  }

  private async createAuthenticatedSession(user: PublicUser): Promise<AuthResponseDto> {
    const session = await this.sessions.create(user.id);
    const accessToken = await this.tokens.signAccessToken(user.id, session.sessionId);

    return {
      accessToken,
      refreshToken: session.refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.tokens.getAccessTokenTtlSeconds(),
      user: mapPublicUser(user),
    };
  }
}
