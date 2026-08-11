import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { GroupType } from '../../src/api/v1/group/group.constants';
import { MembershipRole } from '../../src/api/v1/membership/membership.constants';
import { TodoStatus } from '../../src/api/v1/todo/todo.constants';
import { ErrorCode } from '../../src/common/exception/error-code';
import { PrismaService } from '../../src/shared/database/prisma/prisma.service';
import { createE2eApplication } from './support/e2e-application';
import {
  createUniqueName,
  createUniqueUserInput,
  type UniqueUserInput,
} from './support/unique-test-data';

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Expected ${field} to be a non-empty string`);
  }

  return value;
}

interface AuthenticatedCustomer {
  authorization: { Authorization: string };
  userId: string;
}

async function registerAndAuthenticate(
  app: INestApplication<App>,
  input: UniqueUserInput,
): Promise<AuthenticatedCustomer> {
  const registration = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send(input)
    .expect(201);
  const userId = requireString(registration.body.user?.id, 'registered user ID');

  const authentication = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: input.email, password: input.password })
    .expect(200);
  const accessToken = requireString(authentication.body.accessToken, 'access token');

  return {
    authorization: { Authorization: `Bearer ${accessToken}` },
    userId,
  };
}

describe('Todo customer stories over real HTTP and PostgreSQL', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createE2eApplication();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('Story 1 — Core Todo Journey', async () => {
    // Given: a uniquely registered customer who authenticates with their credentials.
    const userInput = createUniqueUserInput('todo-owner');
    const { authorization, userId } = await registerAndAuthenticate(app, userInput);

    // When: the customer creates a group and retrieves it through their membership.
    const group = await request(app.getHttpServer())
      .post('/api/v1/groups')
      .set(authorization)
      .send({ type: GroupType.SHARED, name: createUniqueName('E2E group') })
      .expect(201);
    const groupId = requireString(group.body.id, 'group ID');

    await request(app.getHttpServer())
      .get(`/api/v1/groups/${groupId}`)
      .set(authorization)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ id: groupId, createdById: userId });
      });

    // And: the customer creates a list and a todo inside the owned group.
    const todoList = await request(app.getHttpServer())
      .post(`/api/v1/groups/${groupId}/lists`)
      .set(authorization)
      .send({ name: createUniqueName('E2E list') })
      .expect(201);
    const todoListId = requireString(todoList.body.id, 'todo list ID');

    const createdTodo = await request(app.getHttpServer())
      .post(`/api/v1/lists/${todoListId}/todos`)
      .set(authorization)
      .send({ title: createUniqueName('E2E todo') })
      .expect(201);
    const todoId = requireString(createdTodo.body.id, 'todo ID');

    // Then: the newly created todo is active and belongs to the current story's resources.
    await request(app.getHttpServer())
      .get(`/api/v1/todos/${todoId}`)
      .set(authorization)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: todoId,
          todoListId,
          status: TodoStatus.ACTIVE,
          completedAt: null,
          createdById: userId,
        });
      });

    // When: the customer completes the todo.
    await request(app.getHttpServer())
      .patch(`/api/v1/todos/${todoId}/completion`)
      .set(authorization)
      .send({ completed: true })
      .expect(200);

    // Then: a fresh read returns the persisted completed state.
    await request(app.getHttpServer())
      .get(`/api/v1/todos/${todoId}`)
      .set(authorization)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: todoId,
          status: TodoStatus.COMPLETED,
          updatedById: userId,
        });
        expect(body.completedAt).toEqual(expect.any(String));
      });
  });

  it('Story 2 — Shared member collaboration and outsider isolation', async () => {
    // Given: an owner, a legitimate member, an outsider, and a complete shared resource chain.
    const ownerInput = createUniqueUserInput('isolation-owner');
    const memberInput = createUniqueUserInput('shared-member');
    const outsiderInput = createUniqueUserInput('isolation-outsider');
    const owner = await registerAndAuthenticate(app, ownerInput);
    const member = await registerAndAuthenticate(app, memberInput);
    const outsider = await registerAndAuthenticate(app, outsiderInput);

    const group = await request(app.getHttpServer())
      .post('/api/v1/groups')
      .set(owner.authorization)
      .send({ type: GroupType.SHARED, name: createUniqueName('Private E2E group') })
      .expect(201);
    const groupId = requireString(group.body.id, 'private group ID');
    const todoList = await request(app.getHttpServer())
      .post(`/api/v1/groups/${groupId}/lists`)
      .set(owner.authorization)
      .send({ name: createUniqueName('Private E2E list') })
      .expect(201);
    const todoListId = requireString(todoList.body.id, 'private todo list ID');
    const todo = await request(app.getHttpServer())
      .post(`/api/v1/lists/${todoListId}/todos`)
      .set(owner.authorization)
      .send({ title: createUniqueName('Private E2E todo') })
      .expect(201);
    const todoId = requireString(todo.body.id, 'private todo ID');

    // And: the second customer is an existing MEMBER of the shared Group.
    await prisma.membership.create({
      data: { groupId, userId: member.userId, role: MembershipRole.MEMBER },
    });

    // When/Then: the member can discover the Group and collaborate through nested public APIs.
    await request(app.getHttpServer())
      .get('/api/v1/groups')
      .set(member.authorization)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(expect.arrayContaining([expect.objectContaining({ id: groupId })]));
      });

    await request(app.getHttpServer())
      .get(`/api/v1/groups/${groupId}/lists`)
      .set(member.authorization)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(expect.arrayContaining([expect.objectContaining({ id: todoListId })]));
      });

    await request(app.getHttpServer())
      .get(`/api/v1/lists/${todoListId}/todos`)
      .set(member.authorization)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(expect.arrayContaining([expect.objectContaining({ id: todoId })]));
      });

    const subtask = await request(app.getHttpServer())
      .post(`/api/v1/todos/${todoId}/subtasks`)
      .set(member.authorization)
      .send({ title: createUniqueName('Member-created subtask') })
      .expect(201);
    const subtaskId = requireString(subtask.body.id, 'member-created subtask ID');

    await request(app.getHttpServer())
      .patch(`/api/v1/todos/${todoId}/completion`)
      .set(member.authorization)
      .send({ completed: true })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: todoId,
          status: TodoStatus.COMPLETED,
          updatedById: member.userId,
        });
      });

    // And: the owner observes the member's persisted changes through fresh reads.
    await request(app.getHttpServer())
      .get(`/api/v1/todos/${todoId}`)
      .set(owner.authorization)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: todoId,
          status: TodoStatus.COMPLETED,
          updatedById: member.userId,
        });
      });
    await request(app.getHttpServer())
      .get(`/api/v1/todos/${todoId}/subtasks`)
      .set(owner.authorization)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(expect.arrayContaining([expect.objectContaining({ id: subtaskId })]));
      });

    // But: the unrelated customer receives the same not-found isolation across the chain.
    await request(app.getHttpServer())
      .get(`/api/v1/groups/${groupId}`)
      .set(outsider.authorization)
      .expect(404)
      .expect({ code: ErrorCode.GROUP_NOT_FOUND });

    await request(app.getHttpServer())
      .post(`/api/v1/lists/${todoListId}/todos`)
      .set(outsider.authorization)
      .send({ title: createUniqueName('Forbidden outsider todo') })
      .expect(404)
      .expect({ code: ErrorCode.TODO_LIST_NOT_FOUND });

    await request(app.getHttpServer())
      .patch(`/api/v1/todos/${todoId}/completion`)
      .set(outsider.authorization)
      .send({ completed: false })
      .expect(404)
      .expect({ code: ErrorCode.TASK_NOT_FOUND });

    await request(app.getHttpServer())
      .patch(`/api/v1/subtasks/${subtaskId}/completion`)
      .set(outsider.authorization)
      .send({ completed: true })
      .expect(404)
      .expect({ code: ErrorCode.SUBTASK_NOT_FOUND });
  });
});
