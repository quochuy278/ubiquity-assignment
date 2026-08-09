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

interface AuthenticatedUser {
  authorization: { Authorization: string };
  userId: string;
}

async function register(app: INestApplication<App>, prefix: string): Promise<AuthenticatedUser> {
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

describe('Group activity history over real HTTP and PostgreSQL', () => {
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

  it('records mutations, returns newest-first pages, enforces membership, and rolls back failures', async () => {
    const owner = await register(app, 'activity-owner');
    const outsider = await register(app, 'activity-outsider');
    const group = await request(app.getHttpServer())
      .post('/api/v1/groups')
      .set(owner.authorization)
      .send({ type: GroupType.SHARED, name: createUniqueName('Activity group') })
      .expect(201);
    const groupId = requireString(group.body.id, 'group ID');

    const todoList = await request(app.getHttpServer())
      .post(`/api/v1/groups/${groupId}/lists`)
      .set(owner.authorization)
      .send({ name: createUniqueName('Activity list') })
      .expect(201);
    const todoListId = requireString(todoList.body.id, 'todo list ID');

    const todo = await request(app.getHttpServer())
      .post(`/api/v1/lists/${todoListId}/todos`)
      .set(owner.authorization)
      .send({ title: createUniqueName('Activity todo') })
      .expect(201);
    const todoId = requireString(todo.body.id, 'todo ID');

    await request(app.getHttpServer())
      .patch(`/api/v1/todos/${todoId}/completion`)
      .set(owner.authorization)
      .send({ completed: true })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/v1/todos/${todoId}/completion`)
      .set(owner.authorization)
      .send({ completed: false })
      .expect(200);

    const firstPage = await request(app.getHttpServer())
      .get(`/api/v1/groups/${groupId}/activities?limit=2`)
      .set(owner.authorization)
      .expect(200);
    expect(firstPage.body.items).toEqual([
      expect.objectContaining({
        groupId,
        actorId: owner.userId,
        type: ActivityType.TODO_UNCOMPLETED,
        entityType: ActivityEntityType.TODO,
        entityId: todoId,
      }),
      expect.objectContaining({
        groupId,
        actorId: owner.userId,
        type: ActivityType.TODO_COMPLETED,
        entityType: ActivityEntityType.TODO,
        entityId: todoId,
      }),
    ]);
    const nextCursor = requireString(firstPage.body.nextCursor, 'activity cursor');

    await request(app.getHttpServer())
      .get(`/api/v1/groups/${groupId}/activities?limit=2&cursor=${nextCursor}`)
      .set(owner.authorization)
      .expect(200)
      .expect(({ body }) => {
        expect(body.items).toEqual([
          expect.objectContaining({
            type: ActivityType.TODO_CREATED,
            entityType: ActivityEntityType.TODO,
            entityId: todoId,
          }),
          expect.objectContaining({
            type: ActivityType.TODO_LIST_CREATED,
            entityType: ActivityEntityType.TODO_LIST,
            entityId: todoListId,
          }),
        ]);
        expect(body.nextCursor).toBeNull();
      });

    await request(app.getHttpServer())
      .get(`/api/v1/groups/${groupId}/activities`)
      .set(outsider.authorization)
      .expect(404)
      .expect({ code: ErrorCode.GROUP_NOT_FOUND });

    const activityCountBeforeFailedMutation = await prisma.activityEvent.count({
      where: { groupId },
    });
    await request(app.getHttpServer())
      .patch('/api/v1/todos/nonexistent-todo/completion')
      .set(owner.authorization)
      .send({ completed: true })
      .expect(404);
    await expect(prisma.activityEvent.count({ where: { groupId } })).resolves.toBe(
      activityCountBeforeFailedMutation,
    );

    const rolledBackTitle = createUniqueName('Rolled back todo');
    jest
      .spyOn(activityRepository, 'create')
      .mockRejectedValueOnce(new Error('activity write failed'));
    await request(app.getHttpServer())
      .post(`/api/v1/lists/${todoListId}/todos`)
      .set(owner.authorization)
      .send({ title: rolledBackTitle })
      .expect(500)
      .expect({ code: ErrorCode.INTERNAL_ERROR });

    await expect(prisma.todo.count({ where: { title: rolledBackTitle } })).resolves.toBe(0);
    await expect(prisma.activityEvent.count({ where: { groupId } })).resolves.toBe(
      activityCountBeforeFailedMutation,
    );
  });
});
