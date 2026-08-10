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

async function register(app: INestApplication<App>, prefix: string) {
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send(createUniqueUserInput(prefix))
    .expect(201);
  return {
    authorization: {
      Authorization: `Bearer ${requireString(response.body.accessToken, 'access token')}`,
    },
  };
}

describe('Todo reorder over real HTTP and PostgreSQL', () => {
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

  it('persists fractional ordering, validates access and rolls back failed activity writes', async () => {
    const owner = await register(app, 'reorder-owner');
    const outsider = await register(app, 'reorder-outsider');
    const group = await request(app.getHttpServer())
      .post('/api/v1/groups')
      .set(owner.authorization)
      .send({ type: GroupType.SHARED, name: createUniqueName('Reorder group') })
      .expect(201);
    const groupId = requireString(group.body.id, 'group ID');
    const firstList = await request(app.getHttpServer())
      .post(`/api/v1/groups/${groupId}/lists`)
      .set(owner.authorization)
      .send({ name: createUniqueName('Reorder list') })
      .expect(201);
    const secondList = await request(app.getHttpServer())
      .post(`/api/v1/groups/${groupId}/lists`)
      .set(owner.authorization)
      .send({ name: createUniqueName('Other list') })
      .expect(201);
    const todoListId = requireString(firstList.body.id, 'todo list ID');
    const otherTodoListId = requireString(secondList.body.id, 'other todo list ID');

    const todoIds: string[] = [];
    for (const title of ['A', 'B', 'C']) {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/lists/${todoListId}/todos`)
        .set(owner.authorization)
        .send({ title: createUniqueName(`Todo ${title}`) })
        .expect(201);
      todoIds.push(requireString(response.body.id, `Todo ${title} ID`));
    }
    const [todoA, todoB, todoC] = todoIds;
    const otherTodo = await request(app.getHttpServer())
      .post(`/api/v1/lists/${otherTodoListId}/todos`)
      .set(owner.authorization)
      .send({ title: createUniqueName('Cross-list Todo') })
      .expect(201);
    const otherTodoId = requireString(otherTodo.body.id, 'cross-list Todo ID');

    await request(app.getHttpServer())
      .patch(`/api/v1/todos/${todoC}/reorder`)
      .set(owner.authorization)
      .send({ beforeTodoId: todoB })
      .expect(200)
      .expect(({ body }) => expect(body.rank).toBe('1500'));
    await request(app.getHttpServer())
      .get(`/api/v1/lists/${todoListId}/todos`)
      .set(owner.authorization)
      .expect(200)
      .expect(({ body }) =>
        expect(body.map((todo: { id: string }) => todo.id)).toEqual([todoA, todoC, todoB]),
      );

    await request(app.getHttpServer())
      .patch(`/api/v1/todos/${todoB}/reorder`)
      .set(owner.authorization)
      .send({ beforeTodoId: todoA })
      .expect(200)
      .expect(({ body }) => expect(body.rank).toBe('0'));
    await request(app.getHttpServer())
      .patch(`/api/v1/todos/${todoB}/reorder`)
      .set(owner.authorization)
      .send({ beforeTodoId: null })
      .expect(200);

    const persistedOrder = await request(app.getHttpServer())
      .get(`/api/v1/lists/${todoListId}/todos`)
      .set(owner.authorization)
      .expect(200);
    expect(persistedOrder.body.map((todo: { id: string }) => todo.id)).toEqual([
      todoA,
      todoC,
      todoB,
    ]);

    const persistedTodo = await prisma.todo.findUniqueOrThrow({ where: { id: todoB } });
    const reorderActivityCount = await prisma.activityEvent.count({
      where: { entityId: todoB, type: ActivityType.TODO_REORDERED },
    });
    await request(app.getHttpServer())
      .patch(`/api/v1/todos/${todoB}/reorder`)
      .set(owner.authorization)
      .send({ beforeTodoId: null })
      .expect(200);
    await expect(prisma.todo.findUniqueOrThrow({ where: { id: todoB } })).resolves.toEqual(
      persistedTodo,
    );
    await expect(
      prisma.activityEvent.count({
        where: { entityId: todoB, type: ActivityType.TODO_REORDERED },
      }),
    ).resolves.toBe(reorderActivityCount);

    await request(app.getHttpServer())
      .patch(`/api/v1/todos/${todoA}/reorder`)
      .set(owner.authorization)
      .send({ beforeTodoId: otherTodoId })
      .expect(404)
      .expect({ code: ErrorCode.TASK_NOT_FOUND });
    await request(app.getHttpServer())
      .patch(`/api/v1/todos/${todoA}/reorder`)
      .set(outsider.authorization)
      .send({ beforeTodoId: null })
      .expect(404)
      .expect({ code: ErrorCode.TASK_NOT_FOUND });

    const orderBeforeFailure = await prisma.todo.findMany({
      where: { todoListId, deletedAt: null },
      orderBy: [{ rank: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true, rank: true },
    });
    const activityCountBeforeFailure = await prisma.activityEvent.count({
      where: {
        groupId,
        entityType: ActivityEntityType.TODO,
        type: ActivityType.TODO_REORDERED,
      },
    });
    jest.spyOn(activityRepository, 'create').mockRejectedValueOnce(new Error('activity failed'));
    await request(app.getHttpServer())
      .patch(`/api/v1/todos/${todoB}/reorder`)
      .set(owner.authorization)
      .send({ beforeTodoId: todoA })
      .expect(500)
      .expect({ code: ErrorCode.INTERNAL_ERROR });

    await expect(
      prisma.todo.findMany({
        where: { todoListId, deletedAt: null },
        orderBy: [{ rank: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
        select: { id: true, rank: true },
      }),
    ).resolves.toEqual(orderBeforeFailure);
    await expect(
      prisma.activityEvent.count({
        where: {
          groupId,
          entityType: ActivityEntityType.TODO,
          type: ActivityType.TODO_REORDERED,
        },
      }),
    ).resolves.toBe(activityCountBeforeFailure);
  });
});
