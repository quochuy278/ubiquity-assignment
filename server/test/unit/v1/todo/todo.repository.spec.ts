import type { Prisma } from '@prisma/client';
import { Prisma as PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';
import { TodoRepository } from '../../../../src/api/v1/todo/repositories/todo.repository';
import { TodoStatus } from '../../../../src/api/v1/todo/todo.constants';
import type { TodoResult } from '../../../../src/api/v1/todo/todo.types';
import type { PrismaService } from '../../../../src/shared/database/prisma/prisma.service';

describe('Todo persistence ordering', () => {
  const findMany = jest.fn();
  const updateMany = jest.fn();
  const findFirst = jest.fn();
  const findUnique = jest.fn();
  const prisma = { todo: { findMany, findFirst } } as unknown as PrismaService;
  const todos = new TodoRepository(prisma);

  function createTodo(id: string, rank: string): TodoResult {
    return {
      id,
      todoListId: 'list-1',
      title: id,
      description: null,
      status: TodoStatus.ACTIVE,
      rank: new PrismaClient.Decimal(rank),
      dueDate: null,
      completedAt: null,
      assignedToId: null,
      createdById: 'user-1',
      updatedById: null,
      createdAt: dayjs('2026-08-10T10:00:00.000Z').toDate(),
      updatedAt: dayjs('2026-08-10T10:00:00.000Z').toDate(),
      deletedAt: null,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retrieves todo-list contents in deterministic rank order', async () => {
    findMany.mockResolvedValue([]);

    await expect(todos.findByTodoListId('list-1')).resolves.toEqual([]);

    expect(findMany).toHaveBeenCalledWith({
      where: { todoListId: 'list-1', deletedAt: null },
      orderBy: [{ rank: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
  });

  it.each([
    [1, true],
    [0, false],
  ] as const)(
    'reports whether a conditional completion update changed a row',
    async (count, transitioned) => {
      const todo = { id: 'todo-1', status: TodoStatus.COMPLETED };
      const transaction = { todo: { updateMany, findFirst } };
      updateMany.mockResolvedValue({ count });
      findFirst.mockResolvedValue(todo);

      await expect(
        todos.updateCompletion(
          'todo-1',
          { status: TodoStatus.COMPLETED, completedAt: null, updatedById: 'user-1' },
          transaction as unknown as Prisma.TransactionClient,
        ),
      ).resolves.toEqual({ todo, transitioned });
      expect(updateMany).toHaveBeenCalledWith({
        where: {
          id: 'todo-1',
          deletedAt: null,
          status: { not: TodoStatus.COMPLETED },
        },
        data: { status: TodoStatus.COMPLETED, completedAt: null, updatedById: 'user-1' },
      });
      expect(findFirst).toHaveBeenCalledWith({ where: { id: 'todo-1', deletedAt: null } });
    },
  );

  it.each([
    [1, true],
    [0, false],
  ] as const)('conditionally soft deletes an active todo', async (count, transitioned) => {
    const deletedAt = new Date('2026-08-10T10:00:00.000Z');
    const todo = { id: 'todo-1', deletedAt };
    const transaction = { todo: { updateMany, findUnique } };
    updateMany.mockResolvedValue({ count });
    findUnique.mockResolvedValue(todo);

    await expect(
      todos.softDelete('todo-1', deletedAt, transaction as unknown as Prisma.TransactionClient),
    ).resolves.toEqual({ todo: transitioned ? todo : null, transitioned });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'todo-1', deletedAt: null },
      data: { deletedAt },
    });
    expect(findUnique).toHaveBeenCalledTimes(transitioned ? 1 : 0);
  });

  it.each([
    ['between two todos', 'todo-c', 'todo-b', '1500'],
    ['to the beginning', 'todo-b', 'todo-a', '0'],
    ['to the end', 'todo-a', null, '4000'],
  ] as const)(
    'reorders %s with one fractional-rank update',
    async (_case, todoId, beforeTodoId, rank) => {
      const orderedTodos = [
        createTodo('todo-a', '1000'),
        createTodo('todo-b', '2000'),
        createTodo('todo-c', '3000'),
      ];
      const sourceTodo = orderedTodos.find((todo) => todo.id === todoId);
      if (!sourceTodo) throw new Error(`Missing fixture Todo ${todoId}`);
      const reorderedTodo = { ...sourceTodo, rank: new PrismaClient.Decimal(rank) };
      const transactionFindMany = jest.fn().mockResolvedValue(orderedTodos);
      const transactionUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
      const transactionFindFirst = jest.fn().mockResolvedValue(reorderedTodo);
      const transaction = {
        todo: {
          findMany: transactionFindMany,
          updateMany: transactionUpdateMany,
          findFirst: transactionFindFirst,
        },
      } as unknown as Prisma.TransactionClient;

      await expect(
        todos.reorder(todoId, 'list-1', beforeTodoId, 'user-1', transaction),
      ).resolves.toEqual({ kind: 'reordered', todo: reorderedTodo });

      expect(transactionUpdateMany).toHaveBeenCalledTimes(1);
      expect(transactionUpdateMany).toHaveBeenCalledWith({
        where: { id: todoId, todoListId: 'list-1', deletedAt: null },
        data: { rank: new PrismaClient.Decimal(rank), updatedById: 'user-1' },
      });
    },
  );

  it('returns a no-op without writing when the requested order already exists', async () => {
    const orderedTodos = [
      createTodo('todo-a', '1000'),
      createTodo('todo-b', '2000'),
      createTodo('todo-c', '3000'),
    ];
    const transactionUpdateMany = jest.fn();
    const transaction = {
      todo: {
        findMany: jest.fn().mockResolvedValue(orderedTodos),
        updateMany: transactionUpdateMany,
      },
    } as unknown as Prisma.TransactionClient;

    await expect(
      todos.reorder('todo-b', 'list-1', 'todo-c', 'user-1', transaction),
    ).resolves.toEqual({ kind: 'noOp', todo: orderedTodos[1] });
    expect(transactionUpdateMany).not.toHaveBeenCalled();
  });

  it('rejects an anchor outside the authoritative todo-list order', async () => {
    const transactionUpdateMany = jest.fn();
    const transaction = {
      todo: {
        findMany: jest.fn().mockResolvedValue([createTodo('todo-a', '1000')]),
        updateMany: transactionUpdateMany,
      },
    } as unknown as Prisma.TransactionClient;

    await expect(
      todos.reorder('todo-a', 'list-1', 'todo-from-another-list', 'user-1', transaction),
    ).resolves.toEqual({ kind: 'invalidAnchor' });
    expect(transactionUpdateMany).not.toHaveBeenCalled();
  });

  it('rebalances only the affected list when no strict midpoint is representable', async () => {
    const orderedTodos = [
      createTodo('todo-a', '1000'),
      createTodo('todo-b', '1000.0000000001'),
      createTodo('todo-c', '2000'),
    ];
    const reorderedTodo = { ...orderedTodos[2], rank: new PrismaClient.Decimal(2000) };
    const transactionUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    const transaction = {
      todo: {
        findMany: jest.fn().mockResolvedValue(orderedTodos),
        updateMany: transactionUpdateMany,
        findFirst: jest.fn().mockResolvedValue(reorderedTodo),
      },
    } as unknown as Prisma.TransactionClient;

    await expect(
      todos.reorder('todo-c', 'list-1', 'todo-b', 'user-1', transaction),
    ).resolves.toEqual({ kind: 'reordered', todo: reorderedTodo });

    expect(transactionUpdateMany).toHaveBeenCalledTimes(3);
    expect(transactionUpdateMany).toHaveBeenNthCalledWith(1, {
      where: { id: 'todo-a', todoListId: 'list-1', deletedAt: null },
      data: { rank: new PrismaClient.Decimal(1000) },
    });
    expect(transactionUpdateMany).toHaveBeenNthCalledWith(2, {
      where: { id: 'todo-c', todoListId: 'list-1', deletedAt: null },
      data: { rank: new PrismaClient.Decimal(2000), updatedById: 'user-1' },
    });
    expect(transactionUpdateMany).toHaveBeenNthCalledWith(3, {
      where: { id: 'todo-b', todoListId: 'list-1', deletedAt: null },
      data: { rank: new PrismaClient.Decimal(3000) },
    });
  });
});
