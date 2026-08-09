import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AuthController } from '../../../src/api/v1/auth/auth.controller';
import { AuthService } from '../../../src/api/v1/auth/auth.service';
import { AccessTokenGuard } from '../../../src/api/v1/auth/guards/access-token.guard';
import { JwtStrategy } from '../../../src/api/v1/auth/strategies/jwt.strategy';
import { ErrorCode } from '../../../src/common/exception/error-code';
import { GlobalException } from '../../../src/common/exception/global.exception';
import { GlobalExceptionFilter } from '../../../src/common/exception/global-exception.filter';
import { formatValidationErrors } from '../../../src/common/exception/validation-error.formatter';
import { ApplicationLoggerService } from '../../../src/common/logger/logger.service';

describe('Versioned authentication HTTP endpoints', () => {
  const authResponse = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    tokenType: 'Bearer' as const,
    expiresIn: 900,
    user: {
      id: 'user-1',
      email: 'alex@example.com',
      displayName: 'Alex',
      avatarUrl: null,
      createdAt: '2026-08-01T10:00:00.000Z',
      updatedAt: '2026-08-01T10:00:00.000Z',
    },
  };
  const register = jest.fn().mockResolvedValue(authResponse);
  const login = jest.fn().mockResolvedValue(authResponse);
  const refresh = jest.fn().mockResolvedValue(authResponse);
  const me = jest.fn().mockResolvedValue(authResponse.user);
  const logout = jest.fn().mockResolvedValue(undefined);
  const accessTokenSecret = 'test-access-token-secret-at-least-32-characters';
  let app: INestApplication<App>;
  let jwtService: JwtService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: accessTokenSecret }),
      ],
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: { register, login, refresh, me, logout },
        },
        {
          provide: ConfigService,
          useValue: { get: () => ({ accessTokenSecret }) },
        },
        {
          provide: ApplicationLoggerService,
          useValue: { error: jest.fn() },
        },
        {
          provide: APP_FILTER,
          useClass: GlobalExceptionFilter,
        },
        JwtStrategy,
        AccessTokenGuard,
      ],
    }).compile();

    app = module.createNestApplication();
    jwtService = module.get(JwtService);
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI });
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        exceptionFactory: (errors) =>
          new GlobalException(ErrorCode.VALIDATION_ERROR, {
            errors: formatValidationErrors(errors),
          }),
      }),
    );
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers a user through POST /api/v1/auth/register', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: ' alex@example.com ',
        password: 'secure-password',
        displayName: ' Alex ',
      })
      .expect(201)
      .expect(authResponse);

    expect(register).toHaveBeenCalledWith({
      email: 'alex@example.com',
      password: 'secure-password',
      displayName: 'Alex',
    });
  });

  it('logs in through POST /api/v1/auth/login', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'alex@example.com', password: 'secure-password' })
      .expect(200)
      .expect(authResponse);
  });

  it('rotates tokens through POST /api/v1/auth/refresh', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'session.refresh-secret' })
      .expect(200)
      .expect(authResponse);

    expect(refresh).toHaveBeenCalledWith('session.refresh-secret');
  });

  it('returns the authenticated user through GET /api/v1/auth/me', async () => {
    const accessToken = await jwtService.signAsync({ sub: 'user-1', sid: 'session-1' });

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect(authResponse.user);

    expect(me).toHaveBeenCalledWith('user-1');
  });

  it('logs out the current authenticated session through POST /api/v1/auth/logout', async () => {
    const accessToken = await jwtService.signAsync({ sub: 'user-1', sid: 'session-1' });

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    expect(logout).toHaveBeenCalledWith('user-1', 'session-1');
  });

  it('rejects GET /api/v1/auth/me when no Bearer token is provided', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);

    expect(me).not.toHaveBeenCalled();
  });

  it('rejects a registration payload containing unknown fields', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'alex@example.com',
        password: 'secure-password',
        displayName: 'Alex',
        isAdmin: true,
      })
      .expect(400);

    expect(register).not.toHaveBeenCalled();
  });

  it('returns field-level validation messages for an incomplete registration payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'huy@example.com',
        password: 'huy123',
      })
      .expect(400);

    expect(response.body).toMatchObject({
      code: ErrorCode.VALIDATION_ERROR,
      errors: expect.arrayContaining([
        expect.objectContaining({
          field: 'displayName',
          messages: expect.any(Array),
        }),
      ]),
    });
    expect(register).not.toHaveBeenCalled();
  });
});
