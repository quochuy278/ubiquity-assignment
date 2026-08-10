import { Prisma } from '@prisma/client';
import dayjs from 'dayjs';
import type { ActivityService } from '../../../../src/api/v1/activity/activity.service';
import type { TodoRepository } from '../../../../src/api/v1/todo/repositories/todo.repository';
import { TodoStatus } from '../../../../src/api/v1/todo/todo.constants';
import { TodoService } from '../../../../src/api/v1/todo/todo.service';
import type { TodoResult } from '../../../../src/api/v1/todo/todo.types';
import type { TodoListService } from '../../../../src/api/v1/todo-list/todo-list.service';
import { ErrorCode } from '../../../../src/common/exception/error-code';
import { GlobalException } from '../../../../src/common/exception/global.exception';
import type { ApplicationLoggerService } from '../../../../src/common/logger/logger.service';
import type { PrismaService } from '../../../../src/shared/database/prisma/prisma.service';

describe('Todo use-case behavior and authorization', () => {
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
  const findTodoListById = jest.fn();
  const createTodo = jest.fn();
  const findByTodoListId = jest.fn();
  const findTodoById = jest.fn();
  const updateCompletion = jest.fn();
  const softDelete = jest.fn();
  const recordActivity = jest.fn();
  const transactionClient = { activityEvent: {}, todo: {} };
  const runTransaction = jest.fn(
    (callback: (client: typeof transactionClient) => Promise<unknown>) =>
      callback(transactionClient),
  );
  const log = jest.fn();
  const todoLists = { findById: findTodoListById } as unknown as TodoListService;
  const todos = {
    createWithTransaction: createTodo,
    findByTodoListId,
    findById: findTodoById,
    updateCompletion,
    softDelete,
  } as unknown as TodoRepository;
  const prisma = { $transaction: runTransaction } as unknown as PrismaService;
  const activities = { record: recordActivity } as unknown as ActivityService;
  const logger = { log } as unknown as ApplicationLoggerService;
  const service = new TodoService(prisma, todos, todoLists, activities, logger);

  beforeEach(() => {
    jest.resetAllMocks();
    runTransaction.mockImplementation(
      (callback: (client: typeof transactionClient) => Promise<unknown>) =>
        callback(transactionClient),
    );
    findTodoListById.mockResolvedValue({ id: 'list-1', groupId: 'group-1' });
  });

  it('validates todo-list access before creating with session-derived ownership', async () => {
    createTodo.mockResolvedValue(todo);

    await expect(
      service.create('user-1', 'list-1', {
        title: 'Buy groceries',
        description: 'Milk and eggs',
        dueDate: '2026-08-10T18:00:00.000Z',
      }),
    ).resolves.toEqual(todo);

    expect(findTodoListById).toHaveBeenCalledWith('user-1', 'list-1');
    expect(createTodo).toHaveBeenCalledWith(
      'list-1',
      'user-1',
      {
        title: 'Buy groceries',
        description: 'Milk and eggs',
        dueDate: dayjs('2026-08-10T18:00:00.000Z').toDate(),
      },
      transactionClient,
    );
    expect(recordActivity).toHaveBeenCalledWith(
      {
        groupId: 'group-1',
        actorId: 'user-1',
        type: 'TODO_CREATED',
        entityType: 'TODO',
        entityId: 'todo-1',
      },
      transactionClient,
    );
    expect(findTodoListById.mock.invocationCallOrder[0]).toBeLessThan(
      createTodo.mock.invocationCallOrder[0],
    );
    expect(log).toHaveBeenCalledWith(
      'Todo created',
      { todoId: 'todo-1', todoListId: 'list-1', userId: 'user-1' },
      TodoService.name,
    );
  });

  it('does not query or create todos when todo-list access is denied', async () => {
    findTodoListById.mockRejectedValue(
      new GlobalException(ErrorCode.TODO_LIST_NOT_FOUND, {
        todoListId: 'list-1',
        userId: 'user-2',
      }),
    );

    await expect(service.create('user-2', 'list-1', { title: 'Hidden' })).rejects.toMatchObject({
      code: ErrorCode.TODO_LIST_NOT_FOUND,
    });
    await expect(service.findForTodoList('user-2', 'list-1')).rejects.toMatchObject({
      code: ErrorCode.TODO_LIST_NOT_FOUND,
    });

    expect(createTodo).not.toHaveBeenCalled();
    expect(findByTodoListId).not.toHaveBeenCalled();
  });

  it('retrieves a deterministically ordered collection only after list access validation', async () => {
    findByTodoListId.mockResolvedValue([todo]);

    await expect(service.findForTodoList('user-1', 'list-1')).resolves.toEqual([todo]);

    expect(findTodoListById).toHaveBeenCalledWith('user-1', 'list-1');
    expect(findByTodoListId).toHaveBeenCalledWith('list-1');
    expect(findTodoListById.mock.invocationCallOrder[0]).toBeLessThan(
      findByTodoListId.mock.invocationCallOrder[0],
    );
  });

  it('validates access through the owning todo list for a single todo', async () => {
    findTodoById.mockResolvedValue(todo);

    await expect(service.findById('user-1', 'todo-1')).resolves.toEqual(todo);

    expect(findTodoById).toHaveBeenCalledWith('todo-1');
    expect(findTodoListById).toHaveBeenCalledWith('user-1', 'list-1');
  });

  it('uses the same not-found code for inaccessible and nonexistent todos', async () => {
    findTodoById.mockResolvedValueOnce(todo).mockResolvedValueOnce(null);
    findTodoListById.mockRejectedValueOnce(
      new GlobalException(ErrorCode.TODO_LIST_NOT_FOUND, {
        todoListId: 'list-1',
        userId: 'user-2',
      }),
    );

    await expect(service.findById('user-2', 'todo-1')).rejects.toMatchObject({
      code: ErrorCode.TASK_NOT_FOUND,
      context: { todoId: 'todo-1', userId: 'user-2' },
    });
    await expect(service.findById('user-2', 'missing-todo')).rejects.toMatchObject({
      code: ErrorCode.TASK_NOT_FOUND,
      context: { todoId: 'missing-todo', userId: 'user-2' },
    });
  });

  it('marks an accessible todo complete and records the authenticated updater', async () => {
    const completedTodo = {
      ...todo,
      status: TodoStatus.COMPLETED,
      completedAt: dayjs('2026-08-07T12:00:00.000Z').toDate(),
      updatedById: 'user-1',
    };
    findTodoById.mockResolvedValue(todo);
    updateCompletion.mockResolvedValue({ todo: completedTodo, transitioned: true });

    await expect(service.updateCompletion('user-1', 'todo-1', { completed: true })).resolves.toBe(
      completedTodo,
    );

    expect(findTodoListById).toHaveBeenCalledWith('user-1', 'list-1');
    expect(updateCompletion).toHaveBeenCalledWith(
      'todo-1',
      {
        status: TodoStatus.COMPLETED,
        completedAt: expect.any(Date),
        updatedById: 'user-1',
      },
      transactionClient,
    );
    expect(recordActivity).toHaveBeenCalledWith(
      {
        groupId: 'group-1',
        actorId: 'user-1',
        type: 'TODO_COMPLETED',
        entityType: 'TODO',
        entityId: 'todo-1',
      },
      transactionClient,
    );
    expect(log).toHaveBeenCalledWith(
      'Todo completion updated',
      {
        todoId: 'todo-1',
        todoListId: 'list-1',
        userId: 'user-1',
        completed: true,
      },
      TodoService.name,
    );
  });

  it('reopens an accessible todo by clearing its completion timestamp', async () => {
    const completedTodo = {
      ...todo,
      status: TodoStatus.COMPLETED,
      completedAt: dayjs('2026-08-07T12:00:00.000Z').toDate(),
    };
    findTodoById.mockResolvedValue(completedTodo);
    updateCompletion.mockResolvedValue({ todo, transitioned: true });

    await service.updateCompletion('user-1', 'todo-1', { completed: false });

    expect(updateCompletion).toHaveBeenCalledWith(
      'todo-1',
      {
        status: TodoStatus.ACTIVE,
        completedAt: null,
        updatedById: 'user-1',
      },
      transactionClient,
    );
    expect(recordActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'TODO_UNCOMPLETED' }),
      transactionClient,
    );
  });

  it('returns the current todo without activity when completion is already at the target state', async () => {
    const completedTodo = {
      ...todo,
      status: TodoStatus.COMPLETED,
      completedAt: dayjs('2026-08-07T12:00:00.000Z').toDate(),
    };
    findTodoById.mockResolvedValue(completedTodo);
    updateCompletion.mockResolvedValue({ todo: completedTodo, transitioned: false });

    await expect(service.updateCompletion('user-1', 'todo-1', { completed: true })).resolves.toBe(
      completedTodo,
    );

    expect(updateCompletion).toHaveBeenCalled();
    expect(recordActivity).not.toHaveBeenCalled();
  });

  it('does not mutate an inaccessible todo', async () => {
    findTodoById.mockResolvedValue(todo);
    findTodoListById.mockRejectedValue(
      new GlobalException(ErrorCode.TODO_LIST_NOT_FOUND, {
        todoListId: 'list-1',
        userId: 'user-2',
      }),
    );

    await expect(
      service.updateCompletion('user-2', 'todo-1', { completed: true }),
    ).rejects.toMatchObject({ code: ErrorCode.TASK_NOT_FOUND });

    expect(updateCompletion).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });

  it('soft deletes an accessible todo and records one activity in the transaction', async () => {
    const deletedTodo = { ...todo, deletedAt: dayjs('2026-08-10T10:00:00.000Z').toDate() };
    findTodoById.mockResolvedValue(todo);
    softDelete.mockResolvedValue({ todo: deletedTodo, transitioned: true });

    await expect(service.delete('user-1', 'todo-1')).resolves.toBe(deletedTodo);

    expect(softDelete).toHaveBeenCalledWith('todo-1', expect.any(Date), transactionClient);
    expect(recordActivity).toHaveBeenCalledWith(
      {
        groupId: 'group-1',
        actorId: 'user-1',
        type: 'TODO_DELETED',
        entityType: 'TODO',
        entityId: 'todo-1',
      },
      transactionClient,
    );
  });

  it('treats a lost todo deletion race as not found without recording activity', async () => {
    findTodoById.mockResolvedValue(todo);
    softDelete.mockResolvedValue({ todo: null, transitioned: false });

    await expect(service.delete('user-1', 'todo-1')).rejects.toMatchObject({
      code: ErrorCode.TASK_NOT_FOUND,
    });
    expect(recordActivity).not.toHaveBeenCalled();
  });
});
