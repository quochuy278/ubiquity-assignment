import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { GroupType } from '../../src/api/v1/group/group.constants';
import { TodoStatus } from '../../src/api/v1/todo/todo.constants';
import { ErrorCode } from '../../src/common/exception/error-code';
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

  beforeAll(async () => {
    app = await createE2eApplication();
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

  it('Story 2 — Cross-user isolation', async () => {
    // Given: two independently registered customers and resources created by the first customer.
    const ownerInput = createUniqueUserInput('isolation-owner');
    const outsiderInput = createUniqueUserInput('isolation-outsider');
    const owner = await registerAndAuthenticate(app, ownerInput);
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

    // When/Then: the second customer attempts to access those exact resource IDs.
    await request(app.getHttpServer())
      .get(`/api/v1/groups/${groupId}`)
      .set(outsider.authorization)
      .expect(404)
      .expect({ code: ErrorCode.GROUP_NOT_FOUND });

    await request(app.getHttpServer())
      .get(`/api/v1/lists/${todoListId}`)
      .set(outsider.authorization)
      .expect(404)
      .expect({ code: ErrorCode.TODO_LIST_NOT_FOUND });

    await request(app.getHttpServer())
      .get(`/api/v1/todos/${todoId}`)
      .set(outsider.authorization)
      .expect(404)
      .expect({ code: ErrorCode.TASK_NOT_FOUND });
  });
});
