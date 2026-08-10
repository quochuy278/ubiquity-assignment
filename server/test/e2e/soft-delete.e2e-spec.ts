import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { ActivityEntityType, ActivityType } from '../../src/api/v1/activity/activity.constants';
import { ActivityRepository } from '../../src/api/v1/activity/repositories/activity.repository';
import { GroupType } from '../../src/api/v1/group/group.constants';
import { ErrorCode } from '../../src/common/exception/error-code';
import { PrismaService } from '../../src/shared/database/prisma/prisma.service';
import { createE2eApplication } from './support/e2e-application';
import { createUniqueName, createUniqueUserInput } from './support/unique-test-data';

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Expected ${field} to be a non-empty string`);
  }
  return value;
}

interface Customer {
  authorization: { Authorization: string };
  userId: string;
}

async function register(app: INestApplication<App>, prefix: string): Promise<Customer> {
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send(createUniqueUserInput(prefix))
    .expect(201);
  return {
    authorization: {
      Authorization: `Bearer ${requireString(response.body.accessToken, 'access token')}`,
    },
    userId: requireString(response.body.user?.id, 'user ID'),
  };
}

async function createTodoFixture(app: INestApplication<App>, owner: Customer) {
  const group = await request(app.getHttpServer())
    .post('/api/v1/groups')
    .set(owner.authorization)
    .send({ type: GroupType.SHARED, name: createUniqueName('Soft delete group') })
    .expect(201);
  const groupId = requireString(group.body.id, 'group ID');
  const list = await request(app.getHttpServer())
    .post(`/api/v1/groups/${groupId}/lists`)
    .set(owner.authorization)
    .send({ name: createUniqueName('Soft delete list') })
    .expect(201);
  const todoListId = requireString(list.body.id, 'todo list ID');
  const todo = await request(app.getHttpServer())
    .post(`/api/v1/lists/${todoListId}/todos`)
    .set(owner.authorization)
    .send({ title: createUniqueName('Soft delete todo') })
    .expect(201);
  return { groupId, todoListId, todoId: requireString(todo.body.id, 'todo ID') };
}

describe('Todo and SubTask soft deletion over real HTTP and PostgreSQL', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let activityRepository: ActivityRepository;

  beforeAll(async () => {
    app = await createE2eApplication();
    prisma = app.get(PrismaService);
    activityRepository = app.get(ActivityRepository);
  });

  afterAll(async () => {
    await app.close();
  });

  it('soft deletes a Todo atomically, once, and makes its child chain unavailable', async () => {
    const owner = await register(app, 'todo-delete-owner');
    const outsider = await register(app, 'todo-delete-outsider');
    const { groupId, todoListId, todoId } = await createTodoFixture(app, owner);
    const child = await request(app.getHttpServer())
      .post(`/api/v1/todos/${todoId}/subtasks`)
      .set(owner.authorization)
      .send({ title: createUniqueName('Preserved child') })
      .expect(201);
    const subtaskId = requireString(child.body.id, 'subtask ID');

    await request(app.getHttpServer())
      .delete(`/api/v1/todos/${todoId}`)
      .set(outsider.authorization)
      .expect(404)
      .expect({ code: ErrorCode.TASK_NOT_FOUND });
    await expect(
      prisma.todo.findUniqueOrThrow({ where: { id: todoId }, select: { deletedAt: true } }),
    ).resolves.toEqual({ deletedAt: null });

    jest.spyOn(activityRepository, 'create').mockRejectedValueOnce(new Error('activity failed'));
    await request(app.getHttpServer())
      .delete(`/api/v1/todos/${todoId}`)
      .set(owner.authorization)
      .expect(500)
      .expect({ code: ErrorCode.INTERNAL_ERROR });
    await expect(
      prisma.todo.findUniqueOrThrow({ where: { id: todoId }, select: { deletedAt: true } }),
    ).resolves.toEqual({ deletedAt: null });

    const responses = await Promise.all([
      request(app.getHttpServer()).delete(`/api/v1/todos/${todoId}`).set(owner.authorization),
      request(app.getHttpServer()).delete(`/api/v1/todos/${todoId}`).set(owner.authorization),
    ]);
    expect(responses.map(({ status }) => status).sort()).toEqual([200, 404]);

    const persisted = await prisma.todo.findUniqueOrThrow({ where: { id: todoId } });
    expect(persisted.deletedAt).toEqual(expect.any(Date));
    await expect(
      prisma.activityEvent.findMany({
        where: { entityId: todoId, type: ActivityType.TODO_DELETED },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        groupId,
        performedById: owner.userId,
        entityType: ActivityEntityType.TODO,
        entityId: todoId,
        type: ActivityType.TODO_DELETED,
      }),
    ]);
    await expect(
      prisma.activityEvent.count({
        where: { entityId: todoId, type: ActivityType.TODO_CREATED },
      }),
    ).resolves.toBe(1);

    await request(app.getHttpServer())
      .get(`/api/v1/todos/${todoId}`)
      .set(owner.authorization)
      .expect(404);
    await request(app.getHttpServer())
      .get(`/api/v1/lists/${todoListId}/todos`)
      .set(owner.authorization)
      .expect(200)
      .expect(({ body }) => expect(body).toEqual([]));
    for (const completed of [true, false]) {
      await request(app.getHttpServer())
        .patch(`/api/v1/todos/${todoId}/completion`)
        .set(owner.authorization)
        .send({ completed })
        .expect(404);
    }
    await request(app.getHttpServer())
      .delete(`/api/v1/todos/${todoId}`)
      .set(owner.authorization)
      .expect(404);
    await request(app.getHttpServer())
      .get(`/api/v1/todos/${todoId}/subtasks`)
      .set(owner.authorization)
      .expect(404);
    await request(app.getHttpServer())
      .get(`/api/v1/subtasks/${subtaskId}`)
      .set(owner.authorization)
      .expect(404);
    await request(app.getHttpServer())
      .patch(`/api/v1/subtasks/${subtaskId}/completion`)
      .set(owner.authorization)
      .send({ completed: true })
      .expect(404);
    await request(app.getHttpServer())
      .delete(`/api/v1/subtasks/${subtaskId}`)
      .set(owner.authorization)
      .expect(404);
    await request(app.getHttpServer())
      .post(`/api/v1/todos/${todoId}/subtasks`)
      .set(owner.authorization)
      .send({ title: createUniqueName('Unavailable child') })
      .expect(404);
    await expect(
      prisma.subTask.findUniqueOrThrow({ where: { id: subtaskId }, select: { deletedAt: true } }),
    ).resolves.toEqual({ deletedAt: null });
  });

  it('soft deletes one SubTask atomically without hiding its parent or sibling', async () => {
    const owner = await register(app, 'subtask-delete-owner');
    const outsider = await register(app, 'subtask-delete-outsider');
    const { groupId, todoId } = await createTodoFixture(app, owner);
    const createSubTask = async (title: string): Promise<string> => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/todos/${todoId}/subtasks`)
        .set(owner.authorization)
        .send({ title })
        .expect(201);
      return requireString(response.body.id, 'subtask ID');
    };
    const subtaskId = await createSubTask(createUniqueName('Deleted child'));
    const siblingId = await createSubTask(createUniqueName('Visible sibling'));

    await request(app.getHttpServer())
      .delete(`/api/v1/subtasks/${subtaskId}`)
      .set(outsider.authorization)
      .expect(404)
      .expect({ code: ErrorCode.SUBTASK_NOT_FOUND });

    jest.spyOn(activityRepository, 'create').mockRejectedValueOnce(new Error('activity failed'));
    await request(app.getHttpServer())
      .delete(`/api/v1/subtasks/${subtaskId}`)
      .set(owner.authorization)
      .expect(500);
    await expect(
      prisma.subTask.findUniqueOrThrow({ where: { id: subtaskId }, select: { deletedAt: true } }),
    ).resolves.toEqual({ deletedAt: null });

    const responses = await Promise.all([
      request(app.getHttpServer()).delete(`/api/v1/subtasks/${subtaskId}`).set(owner.authorization),
      request(app.getHttpServer()).delete(`/api/v1/subtasks/${subtaskId}`).set(owner.authorization),
    ]);
    expect(responses.map(({ status }) => status).sort()).toEqual([200, 404]);

    await expect(prisma.subTask.findUniqueOrThrow({ where: { id: subtaskId } })).resolves.toEqual(
      expect.objectContaining({ id: subtaskId, deletedAt: expect.any(Date) }),
    );
    await expect(
      prisma.activityEvent.findMany({
        where: { entityId: subtaskId, type: ActivityType.SUBTASK_DELETED },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        groupId,
        performedById: owner.userId,
        entityType: ActivityEntityType.SUBTASK,
        entityId: subtaskId,
        type: ActivityType.SUBTASK_DELETED,
      }),
    ]);
    await expect(
      prisma.activityEvent.count({
        where: { entityId: subtaskId, type: ActivityType.SUBTASK_CREATED },
      }),
    ).resolves.toBe(1);

    await request(app.getHttpServer())
      .get(`/api/v1/subtasks/${subtaskId}`)
      .set(owner.authorization)
      .expect(404);
    await request(app.getHttpServer())
      .delete(`/api/v1/subtasks/${subtaskId}`)
      .set(owner.authorization)
      .expect(404);
    for (const completed of [true, false]) {
      await request(app.getHttpServer())
        .patch(`/api/v1/subtasks/${subtaskId}/completion`)
        .set(owner.authorization)
        .send({ completed })
        .expect(404);
    }
    await request(app.getHttpServer())
      .get(`/api/v1/todos/${todoId}`)
      .set(owner.authorization)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/v1/subtasks/${siblingId}`)
      .set(owner.authorization)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/v1/todos/${todoId}/subtasks`)
      .set(owner.authorization)
      .expect(200)
      .expect(({ body }) => expect(body.map(({ id }: { id: string }) => id)).toEqual([siblingId]));
  });
});
