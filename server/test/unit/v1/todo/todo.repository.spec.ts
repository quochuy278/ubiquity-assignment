import type { Prisma } from '@prisma/client';
import { TodoRepository } from '../../../../src/api/v1/todo/repositories/todo.repository';
import { TodoStatus } from '../../../../src/api/v1/todo/todo.constants';
import type { PrismaService } from '../../../../src/shared/database/prisma/prisma.service';

describe('Todo persistence ordering', () => {
  const findMany = jest.fn();
  const updateMany = jest.fn();
  const findFirst = jest.fn();
  const findUnique = jest.fn();
  const prisma = { todo: { findMany, findFirst } } as unknown as PrismaService;
  const todos = new TodoRepository(prisma);

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
});
