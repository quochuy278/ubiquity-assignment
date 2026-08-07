import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import dayjs from 'dayjs';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AccessTokenGuard } from '../../../src/api/v1/auth/guards/access-token.guard';
import { JwtStrategy } from '../../../src/api/v1/auth/strategies/jwt.strategy';
import { TodoListController } from '../../../src/api/v1/todo-list/todo-list.controller';
import { TodoListService } from '../../../src/api/v1/todo-list/todo-list.service';
import type { TodoListResult } from '../../../src/api/v1/todo-list/todo-list.types';
import { ErrorCode } from '../../../src/common/exception/error-code';
import { GlobalException } from '../../../src/common/exception/global.exception';
import { GlobalExceptionFilter } from '../../../src/common/exception/global-exception.filter';
import { formatValidationErrors } from '../../../src/common/exception/validation-error.formatter';
import { ApplicationLoggerService } from '../../../src/common/logger/logger.service';

describe('Versioned todo list HTTP endpoints', () => {
  const todoList: TodoListResult = {
    id: 'list-1',
    groupId: 'group-1',
    name: 'Shopping',
    icon: 'shopping-cart',
    color: '#2563EB',
    rank: new Prisma.Decimal(1000),
    createdAt: dayjs('2026-08-07T10:00:00.000Z').toDate(),
    updatedAt: dayjs('2026-08-07T10:00:00.000Z').toDate(),
  };
  const todoListResponse = {
    id: 'list-1',
    groupId: 'group-1',
    name: 'Shopping',
    icon: 'shopping-cart',
    color: '#2563EB',
    rank: '1000',
    createdAt: '2026-08-07T10:00:00.000Z',
    updatedAt: '2026-08-07T10:00:00.000Z',
  };
  const create = jest.fn().mockResolvedValue(todoList);
  const findForGroup = jest.fn().mockResolvedValue([todoList]);
  const findById = jest.fn().mockResolvedValue(todoList);
  const accessTokenSecret = 'test-access-token-secret-at-least-32-characters';
  let app: INestApplication<App>;
  let jwtService: JwtService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: accessTokenSecret }),
      ],
      controllers: [TodoListController],
      providers: [
        {
          provide: TodoListService,
          useValue: { create, findForGroup, findById },
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

  it('creates a todo list using the authenticated user and route group', async () => {
    const accessToken = await jwtService.signAsync({ sub: 'user-1', sid: 'session-1' });

    await request(app.getHttpServer())
      .post('/api/v1/groups/group-1/lists')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: ' Shopping ', icon: ' shopping-cart ', color: ' #2563EB ' })
      .expect(201)
      .expect(todoListResponse);

    expect(create).toHaveBeenCalledWith('user-1', 'group-1', {
      name: 'Shopping',
      icon: 'shopping-cart',
      color: '#2563EB',
    });
  });

  it('retrieves todo lists for a group as the authenticated user', async () => {
    const accessToken = await jwtService.signAsync({ sub: 'user-1', sid: 'session-1' });

    await request(app.getHttpServer())
      .get('/api/v1/groups/group-1/lists')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect([todoListResponse]);

    expect(findForGroup).toHaveBeenCalledWith('user-1', 'group-1');
  });

  it('retrieves one todo list as the authenticated user', async () => {
    const accessToken = await jwtService.signAsync({ sub: 'user-1', sid: 'session-1' });

    await request(app.getHttpServer())
      .get('/api/v1/lists/list-1')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect(todoListResponse);

    expect(findById).toHaveBeenCalledWith('user-1', 'list-1');
  });

  it('returns the same HTTP response for inaccessible and nonexistent todo lists', async () => {
    const accessToken = await jwtService.signAsync({ sub: 'user-2', sid: 'session-2' });
    findById.mockRejectedValue(
      new GlobalException(ErrorCode.TODO_LIST_NOT_FOUND, {
        todoListId: 'list-1',
        userId: 'user-2',
      }),
    );

    await request(app.getHttpServer())
      .get('/api/v1/lists/list-1')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404)
      .expect({ code: ErrorCode.TODO_LIST_NOT_FOUND });
  });

  it('requires authentication for every todo list endpoint', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/groups/group-1/lists')
      .send({ name: 'Shopping' })
      .expect(401)
      .expect({ code: ErrorCode.UNAUTHORIZED });
    await request(app.getHttpServer())
      .get('/api/v1/groups/group-1/lists')
      .expect(401)
      .expect({ code: ErrorCode.UNAUTHORIZED });
    await request(app.getHttpServer())
      .get('/api/v1/lists/list-1')
      .expect(401)
      .expect({ code: ErrorCode.UNAUTHORIZED });

    expect(create).not.toHaveBeenCalled();
    expect(findForGroup).not.toHaveBeenCalled();
    expect(findById).not.toHaveBeenCalled();
  });

  it.each(['groupId', 'createdById', 'ownerId', 'userId'])(
    'rejects the access-related field %s in the create payload',
    async (accessField) => {
      const accessToken = await jwtService.signAsync({ sub: 'user-1', sid: 'session-1' });

      await request(app.getHttpServer())
        .post('/api/v1/groups/group-1/lists')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Shopping', [accessField]: 'user-or-group-2' })
        .expect(400);

      expect(create).not.toHaveBeenCalled();
    },
  );
});
