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
import { SubTaskController } from '../../../src/api/v1/subtask/subtask.controller';
import { SubTaskService } from '../../../src/api/v1/subtask/subtask.service';
import type { SubTaskResult } from '../../../src/api/v1/subtask/subtask.types';
import { ErrorCode } from '../../../src/common/exception/error-code';
import { GlobalException } from '../../../src/common/exception/global.exception';
import { GlobalExceptionFilter } from '../../../src/common/exception/global-exception.filter';
import { formatValidationErrors } from '../../../src/common/exception/validation-error.formatter';
import { ApplicationLoggerService } from '../../../src/common/logger/logger.service';

describe('Versioned subtask HTTP endpoints', () => {
  const subtask: SubTaskResult = {
    id: 'subtask-1',
    todoId: 'todo-1',
    title: 'Buy milk',
    completed: false,
    rank: new Prisma.Decimal(1000),
    createdAt: dayjs('2026-08-09T10:00:00.000Z').toDate(),
    updatedAt: dayjs('2026-08-09T10:00:00.000Z').toDate(),
  };
  const completedSubTask = { ...subtask, completed: true };
  const response = {
    id: 'subtask-1',
    todoId: 'todo-1',
    title: 'Buy milk',
    completed: false,
    rank: '1000',
    createdAt: '2026-08-09T10:00:00.000Z',
    updatedAt: '2026-08-09T10:00:00.000Z',
  };
  const create = jest.fn().mockResolvedValue(subtask);
  const findForTodo = jest.fn().mockResolvedValue([subtask]);
  const findById = jest.fn().mockResolvedValue(subtask);
  const updateCompletion = jest.fn().mockResolvedValue(completedSubTask);
  const accessTokenSecret = 'test-access-token-secret-at-least-32-characters';
  let app: INestApplication<App>;
  let jwtService: JwtService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: accessTokenSecret }),
      ],
      controllers: [SubTaskController],
      providers: [
        { provide: SubTaskService, useValue: { create, findForTodo, findById, updateCompletion } },
        { provide: ConfigService, useValue: { get: () => ({ accessTokenSecret }) } },
        { provide: ApplicationLoggerService, useValue: { error: jest.fn() } },
        { provide: APP_FILTER, useClass: GlobalExceptionFilter },
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

  async function authorization(): Promise<string> {
    return `Bearer ${await jwtService.signAsync({ sub: 'user-1', sid: 'session-1' })}`;
  }

  it('creates a subtask using route and session ownership', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/todos/todo-1/subtasks')
      .set('Authorization', await authorization())
      .send({ title: ' Buy milk ' })
      .expect(201)
      .expect(response);
    expect(create).toHaveBeenCalledWith('user-1', 'todo-1', { title: 'Buy milk' });
  });

  it('reads a todo subtask collection and one subtask', async () => {
    const bearer = await authorization();
    await request(app.getHttpServer())
      .get('/api/v1/todos/todo-1/subtasks')
      .set('Authorization', bearer)
      .expect(200)
      .expect([response]);
    await request(app.getHttpServer())
      .get('/api/v1/subtasks/subtask-1')
      .set('Authorization', bearer)
      .expect(200)
      .expect(response);
    expect(findForTodo).toHaveBeenCalledWith('user-1', 'todo-1');
    expect(findById).toHaveBeenCalledWith('user-1', 'subtask-1');
  });

  it('updates subtask completion', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/subtasks/subtask-1/completion')
      .set('Authorization', await authorization())
      .send({ completed: true })
      .expect(200)
      .expect({ ...response, completed: true });
    expect(updateCompletion).toHaveBeenCalledWith('user-1', 'subtask-1', { completed: true });
  });

  it('rejects invalid completion input and unauthenticated access', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/subtasks/subtask-1/completion')
      .set('Authorization', await authorization())
      .send({ completed: 'true' })
      .expect(400);
    await request(app.getHttpServer()).get('/api/v1/subtasks/subtask-1').expect(401);
    expect(updateCompletion).not.toHaveBeenCalled();
    expect(findById).not.toHaveBeenCalled();
  });
});
