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
import { TodoStatus } from '../../../src/api/v1/todo/todo.constants';
import { TodoController } from '../../../src/api/v1/todo/todo.controller';
import { TodoService } from '../../../src/api/v1/todo/todo.service';
import type { TodoResult } from '../../../src/api/v1/todo/todo.types';
import { ErrorCode } from '../../../src/common/exception/error-code';
import { GlobalException } from '../../../src/common/exception/global.exception';
import { GlobalExceptionFilter } from '../../../src/common/exception/global-exception.filter';
import { formatValidationErrors } from '../../../src/common/exception/validation-error.formatter';
import { ApplicationLoggerService } from '../../../src/common/logger/logger.service';

describe('Versioned todo HTTP endpoints', () => {
  const todo: TodoResult = {
    id: 'todo-1',
    todoListId: 'list-1',
    title: 'Buy groceries',
    description: 'Milk and eggs',
    status: TodoStatus.ACTIVE,
    rank: new Prisma.Decimal(1000),
    dueDate: dayjs('2026-08-10T18:00:00.000Z').toDate(),
    completedAt: null,
    assignedToId: null,
    createdById: 'user-1',
    updatedById: null,
    createdAt: dayjs('2026-08-07T10:00:00.000Z').toDate(),
    updatedAt: dayjs('2026-08-07T10:00:00.000Z').toDate(),
    deletedAt: null,
  };
  const completedTodo: TodoResult = {
    ...todo,
    status: TodoStatus.COMPLETED,
    completedAt: dayjs('2026-08-07T12:00:00.000Z').toDate(),
    updatedById: 'user-1',
    updatedAt: dayjs('2026-08-07T12:00:00.000Z').toDate(),
  };
  const todoResponse = {
    id: 'todo-1',
    todoListId: 'list-1',
    title: 'Buy groceries',
    description: 'Milk and eggs',
    status: TodoStatus.ACTIVE,
    rank: '1000',
    dueDate: '2026-08-10T18:00:00.000Z',
    completedAt: null,
    assignedToId: null,
    createdById: 'user-1',
    updatedById: null,
    createdAt: '2026-08-07T10:00:00.000Z',
    updatedAt: '2026-08-07T10:00:00.000Z',
  };
  const completedTodoResponse = {
    ...todoResponse,
    status: TodoStatus.COMPLETED,
    completedAt: '2026-08-07T12:00:00.000Z',
    updatedById: 'user-1',
    updatedAt: '2026-08-07T12:00:00.000Z',
  };
  const create = jest.fn().mockResolvedValue(todo);
  const findForTodoList = jest.fn().mockResolvedValue([todo]);
  const findById = jest.fn().mockResolvedValue(todo);
  const updateCompletion = jest.fn().mockResolvedValue(completedTodo);
  const deleteTodo = jest.fn().mockResolvedValue({
    ...todo,
    deletedAt: dayjs('2026-08-10T10:00:00.000Z').toDate(),
  });
  const accessTokenSecret = 'test-access-token-secret-at-least-32-characters';
  let app: INestApplication<App>;
  let jwtService: JwtService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: accessTokenSecret }),
      ],
      controllers: [TodoController],
      providers: [
        {
          provide: TodoService,
          useValue: { create, findForTodoList, findById, updateCompletion, delete: deleteTodo },
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

  it('creates a todo using the session user and route todo list', async () => {
    const accessToken = await jwtService.signAsync({ sub: 'user-1', sid: 'session-1' });

    await request(app.getHttpServer())
      .post('/api/v1/lists/list-1/todos')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: ' Buy groceries ',
        description: ' Milk and eggs ',
        dueDate: '2026-08-10T18:00:00.000Z',
      })
      .expect(201)
      .expect(todoResponse);

    expect(create).toHaveBeenCalledWith('user-1', 'list-1', {
      title: 'Buy groceries',
      description: 'Milk and eggs',
      dueDate: '2026-08-10T18:00:00.000Z',
    });
  });

  it('retrieves todos belonging to a todo list', async () => {
    const accessToken = await jwtService.signAsync({ sub: 'user-1', sid: 'session-1' });

    await request(app.getHttpServer())
      .get('/api/v1/lists/list-1/todos')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect([todoResponse]);

    expect(findForTodoList).toHaveBeenCalledWith('user-1', 'list-1');
  });

  it('retrieves a single todo', async () => {
    const accessToken = await jwtService.signAsync({ sub: 'user-1', sid: 'session-1' });

    await request(app.getHttpServer())
      .get('/api/v1/todos/todo-1')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect(todoResponse);

    expect(findById).toHaveBeenCalledWith('user-1', 'todo-1');
  });

  it('updates completion state', async () => {
    const accessToken = await jwtService.signAsync({ sub: 'user-1', sid: 'session-1' });

    await request(app.getHttpServer())
      .patch('/api/v1/todos/todo-1/completion')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ completed: true })
      .expect(200)
      .expect(completedTodoResponse);

    expect(updateCompletion).toHaveBeenCalledWith('user-1', 'todo-1', { completed: true });
  });

  it('deletes a todo using the session user', async () => {
    const accessToken = await jwtService.signAsync({ sub: 'user-1', sid: 'session-1' });

    await request(app.getHttpServer())
      .delete('/api/v1/todos/todo-1')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect(todoResponse);

    expect(deleteTodo).toHaveBeenCalledWith('user-1', 'todo-1');
  });

  it('does not expose an inaccessible todo', async () => {
    const accessToken = await jwtService.signAsync({ sub: 'user-2', sid: 'session-2' });
    findById.mockRejectedValueOnce(
      new GlobalException(ErrorCode.TASK_NOT_FOUND, {
        todoId: 'todo-1',
        userId: 'user-2',
      }),
    );

    await request(app.getHttpServer())
      .get('/api/v1/todos/todo-1')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404)
      .expect({ code: ErrorCode.TASK_NOT_FOUND });
  });

  it('requires authentication for every todo endpoint', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/lists/list-1/todos')
      .send({ title: 'Buy groceries' })
      .expect(401);
    await request(app.getHttpServer()).get('/api/v1/lists/list-1/todos').expect(401);
    await request(app.getHttpServer()).get('/api/v1/todos/todo-1').expect(401);
    await request(app.getHttpServer())
      .patch('/api/v1/todos/todo-1/completion')
      .send({ completed: true })
      .expect(401);
    await request(app.getHttpServer()).delete('/api/v1/todos/todo-1').expect(401);

    expect(create).not.toHaveBeenCalled();
    expect(findForTodoList).not.toHaveBeenCalled();
    expect(findById).not.toHaveBeenCalled();
    expect(updateCompletion).not.toHaveBeenCalled();
    expect(deleteTodo).not.toHaveBeenCalled();
  });

  it.each(['todoListId', 'groupId', 'createdById', 'updatedById', 'assignedToId', 'userId'])(
    'rejects the server-controlled field %s in the create payload',
    async (serverControlledField) => {
      const accessToken = await jwtService.signAsync({ sub: 'user-1', sid: 'session-1' });

      await request(app.getHttpServer())
        .post('/api/v1/lists/list-1/todos')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Buy groceries', [serverControlledField]: 'attacker-value' })
        .expect(400);

      expect(create).not.toHaveBeenCalled();
    },
  );

  it('rejects non-boolean completion state', async () => {
    const accessToken = await jwtService.signAsync({ sub: 'user-1', sid: 'session-1' });

    await request(app.getHttpServer())
      .patch('/api/v1/todos/todo-1/completion')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ completed: 'true' })
      .expect(400);

    expect(updateCompletion).not.toHaveBeenCalled();
  });
});
