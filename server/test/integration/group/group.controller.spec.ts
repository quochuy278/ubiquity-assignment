import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import dayjs from 'dayjs';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AccessTokenGuard } from '../../../src/api/v1/auth/guards/access-token.guard';
import { JwtStrategy } from '../../../src/api/v1/auth/strategies/jwt.strategy';
import { GroupType } from '../../../src/api/v1/group/group.constants';
import { GroupController } from '../../../src/api/v1/group/group.controller';
import { GroupService } from '../../../src/api/v1/group/group.service';
import type { GroupResult } from '../../../src/api/v1/group/group.types';
import { MembershipRole } from '../../../src/api/v1/membership/membership.constants';
import { ErrorCode } from '../../../src/common/exception/error-code';
import { GlobalException } from '../../../src/common/exception/global.exception';
import { GlobalExceptionFilter } from '../../../src/common/exception/global-exception.filter';
import { formatValidationErrors } from '../../../src/common/exception/validation-error.formatter';
import { ApplicationLoggerService } from '../../../src/common/logger/logger.service';

describe('Versioned group HTTP endpoints', () => {
  const createdGroup: GroupResult = {
    id: 'group-1',
    type: GroupType.SHARED,
    currentUserRole: MembershipRole.OWNER,
    name: 'Family',
    createdById: 'user-1',
    createdAt: dayjs('2026-08-07T10:00:00.000Z').toDate(),
    updatedAt: dayjs('2026-08-07T10:00:00.000Z').toDate(),
  };
  const groupResponse = {
    id: 'group-1',
    type: GroupType.SHARED,
    currentUserRole: MembershipRole.OWNER,
    name: 'Family',
    createdById: 'user-1',
    createdAt: '2026-08-07T10:00:00.000Z',
    updatedAt: '2026-08-07T10:00:00.000Z',
  };
  const findForUser = jest.fn().mockResolvedValue([createdGroup]);
  const findById = jest.fn().mockResolvedValue(createdGroup);
  const create = jest.fn().mockResolvedValue(createdGroup);
  const accessTokenSecret = 'test-access-token-secret-at-least-32-characters';
  let app: INestApplication<App>;
  let jwtService: JwtService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: accessTokenSecret }),
      ],
      controllers: [GroupController],
      providers: [
        {
          provide: GroupService,
          useValue: { create, findForUser, findById },
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

  it("returns the authenticated user's groups through GET /api/v1/groups", async () => {
    const accessToken = await jwtService.signAsync({ sub: 'user-1', sid: 'session-1' });

    await request(app.getHttpServer())
      .get('/api/v1/groups')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect([groupResponse]);

    expect(findForUser).toHaveBeenCalledWith('user-1');
  });

  it('returns a group by ID for an authenticated member', async () => {
    const accessToken = await jwtService.signAsync({ sub: 'user-1', sid: 'session-1' });

    await request(app.getHttpServer())
      .get('/api/v1/groups/group-1')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect(groupResponse);

    expect(findById).toHaveBeenCalledWith('user-1', 'group-1');
  });

  it('does not expose a group to a user without membership', async () => {
    const accessToken = await jwtService.signAsync({ sub: 'user-2', sid: 'session-2' });
    findById.mockRejectedValueOnce(
      new GlobalException(ErrorCode.GROUP_NOT_FOUND, {
        groupId: 'group-1',
        userId: 'user-2',
      }),
    );

    await request(app.getHttpServer())
      .get('/api/v1/groups/group-1')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404)
      .expect({ code: ErrorCode.GROUP_NOT_FOUND });

    expect(findById).toHaveBeenCalledWith('user-2', 'group-1');
  });

  it('returns the same API response for inaccessible and nonexistent groups', async () => {
    const accessToken = await jwtService.signAsync({ sub: 'user-1', sid: 'session-1' });
    findById
      .mockRejectedValueOnce(
        new GlobalException(ErrorCode.GROUP_NOT_FOUND, {
          groupId: 'inaccessible-group',
          userId: 'user-1',
        }),
      )
      .mockRejectedValueOnce(
        new GlobalException(ErrorCode.GROUP_NOT_FOUND, {
          groupId: 'nonexistent-group',
          userId: 'user-1',
        }),
      );

    const inaccessibleResponse = await request(app.getHttpServer())
      .get('/api/v1/groups/inaccessible-group')
      .set('Authorization', `Bearer ${accessToken}`);
    const nonexistentResponse = await request(app.getHttpServer())
      .get('/api/v1/groups/nonexistent-group')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(inaccessibleResponse.status).toBe(404);
    expect(nonexistentResponse.status).toBe(inaccessibleResponse.status);
    expect(nonexistentResponse.body).toEqual(inaccessibleResponse.body);
    expect(inaccessibleResponse.body).toEqual({ code: ErrorCode.GROUP_NOT_FOUND });
  });

  it('creates a group for the authenticated user through POST /api/v1/groups', async () => {
    const accessToken = await jwtService.signAsync({ sub: 'user-1', sid: 'session-1' });

    await request(app.getHttpServer())
      .post('/api/v1/groups')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ type: GroupType.SHARED, name: ' Family ' })
      .expect(201)
      .expect(groupResponse);

    expect(create).toHaveBeenCalledWith('user-1', {
      type: GroupType.SHARED,
      name: 'Family',
    });
  });

  it('rejects group creation when no Bearer token is provided', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/groups')
      .send({ type: GroupType.SHARED, name: 'Family' })
      .expect(401)
      .expect({ code: ErrorCode.UNAUTHORIZED });

    expect(create).not.toHaveBeenCalled();
  });

  it('rejects an unsupported group type', async () => {
    const accessToken = await jwtService.signAsync({ sub: 'user-1', sid: 'session-1' });

    const response = await request(app.getHttpServer())
      .post('/api/v1/groups')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ type: 'TEAM', name: 'Family' })
      .expect(400);

    expect(response.body).toMatchObject({
      code: ErrorCode.VALIDATION_ERROR,
      errors: expect.arrayContaining([
        expect.objectContaining({
          field: 'type',
          messages: expect.any(Array),
        }),
      ]),
    });
    expect(create).not.toHaveBeenCalled();
  });

  it.each(['createdById', 'ownerId', 'userId'])(
    'rejects the ownership field %s in the create-group payload',
    async (ownershipField) => {
      const accessToken = await jwtService.signAsync({ sub: 'user-1', sid: 'session-1' });

      await request(app.getHttpServer())
        .post('/api/v1/groups')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          type: GroupType.SHARED,
          name: 'Family',
          [ownershipField]: 'user-2',
        })
        .expect(400);

      expect(create).not.toHaveBeenCalled();
    },
  );
});
