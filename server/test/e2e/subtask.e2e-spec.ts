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

async function register(
  app: INestApplication<App>,
  prefix: string,
): Promise<{ authorization: { Authorization: string }; userId: string }> {
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

describe('Subtask completion over real HTTP and PostgreSQL', () => {
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

  it('persists completion and activities through the authorized parent chain with rollback', async () => {
    const owner = await register(app, 'subtask-owner');
    const outsider = await register(app, 'subtask-outsider');
    const group = await request(app.getHttpServer())
      .post('/api/v1/groups')
      .set(owner.authorization)
      .send({ type: GroupType.SHARED, name: createUniqueName('Subtask group') })
      .expect(201);
    const groupId = requireString(group.body.id, 'group ID');
    const list = await request(app.getHttpServer())
      .post(`/api/v1/groups/${groupId}/lists`)
      .set(owner.authorization)
      .send({ name: createUniqueName('Subtask list') })
      .expect(201);
    const listId = requireString(list.body.id, 'list ID');
    const todo = await request(app.getHttpServer())
      .post(`/api/v1/lists/${listId}/todos`)
      .set(owner.authorization)
      .send({ title: createUniqueName('Parent todo') })
      .expect(201);
    const todoId = requireString(todo.body.id, 'todo ID');

    const created = await request(app.getHttpServer())
      .post(`/api/v1/todos/${todoId}/subtasks`)
      .set(owner.authorization)
      .send({ title: createUniqueName('Child subtask') })
      .expect(201);
    const subtaskId = requireString(created.body.id, 'subtask ID');
    expect(created.body).toMatchObject({ todoId, completed: false });

    await request(app.getHttpServer())
      .get(`/api/v1/groups/${groupId}/activities`)
      .set(owner.authorization)
      .expect(200)
      .expect(({ body }) => {
        expect(body.items[0]).toMatchObject({
          groupId,
          actorId: owner.userId,
          type: ActivityType.SUBTASK_CREATED,
          entityType: ActivityEntityType.SUBTASK,
          entityId: subtaskId,
        });
      });

    await request(app.getHttpServer())
      .patch(`/api/v1/subtasks/${subtaskId}/completion`)
      .set(owner.authorization)
      .send({ completed: true })
      .expect(200)
      .expect(({ body }) => expect(body.completed).toBe(true));

    await request(app.getHttpServer())
      .get(`/api/v1/subtasks/${subtaskId}`)
      .set(owner.authorization)
      .expect(200)
      .expect(({ body }) => expect(body.completed).toBe(true));
    await request(app.getHttpServer())
      .get(`/api/v1/groups/${groupId}/activities`)
      .set(owner.authorization)
      .expect(200)
      .expect(({ body }) => {
        expect(body.items[0]).toMatchObject({
          actorId: owner.userId,
          type: ActivityType.SUBTASK_COMPLETED,
          entityType: ActivityEntityType.SUBTASK,
          entityId: subtaskId,
        });
      });

    await request(app.getHttpServer())
      .patch(`/api/v1/subtasks/${subtaskId}/completion`)
      .set(owner.authorization)
      .send({ completed: false })
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/v1/subtasks/${subtaskId}`)
      .set(owner.authorization)
      .expect(200)
      .expect(({ body }) => expect(body.completed).toBe(false));
    await request(app.getHttpServer())
      .get(`/api/v1/groups/${groupId}/activities`)
      .set(owner.authorization)
      .expect(200)
      .expect(({ body }) => {
        expect(body.items[0]).toMatchObject({
          type: ActivityType.SUBTASK_UNCOMPLETED,
          entityType: ActivityEntityType.SUBTASK,
          entityId: subtaskId,
        });
      });

    await request(app.getHttpServer())
      .get(`/api/v1/todos/${todoId}/subtasks`)
      .set(outsider.authorization)
      .expect(404)
      .expect({ code: ErrorCode.TASK_NOT_FOUND });
    await request(app.getHttpServer())
      .get(`/api/v1/subtasks/${subtaskId}`)
      .set(outsider.authorization)
      .expect(404)
      .expect({ code: ErrorCode.SUBTASK_NOT_FOUND });
    await request(app.getHttpServer())
      .patch(`/api/v1/subtasks/${subtaskId}/completion`)
      .set(outsider.authorization)
      .send({ completed: true })
      .expect(404)
      .expect({ code: ErrorCode.SUBTASK_NOT_FOUND });

    const activityCountBeforeRollback = await prisma.activityEvent.count({ where: { groupId } });
    jest
      .spyOn(activityRepository, 'create')
      .mockRejectedValueOnce(new Error('activity write failed'));
    await request(app.getHttpServer())
      .patch(`/api/v1/subtasks/${subtaskId}/completion`)
      .set(owner.authorization)
      .send({ completed: true })
      .expect(500)
      .expect({ code: ErrorCode.INTERNAL_ERROR });

    await expect(
      prisma.subTask.findUniqueOrThrow({ where: { id: subtaskId }, select: { completed: true } }),
    ).resolves.toEqual({ completed: false });
    await expect(prisma.activityEvent.count({ where: { groupId } })).resolves.toBe(
      activityCountBeforeRollback,
    );
  });
});
