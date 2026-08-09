import { Prisma } from '@prisma/client';
import { SubTaskRepository } from '../../../../src/api/v1/subtask/repositories/subtask.repository';
import type { PrismaService } from '../../../../src/shared/database/prisma/prisma.service';

describe('Subtask persistence', () => {
  const findFirst = jest.fn();
  const create = jest.fn();
  const findMany = jest.fn();
  const updateMany = jest.fn();
  const findUniqueOrThrow = jest.fn();
  const transaction = { subTask: { findFirst, create, updateMany, findUniqueOrThrow } };
  const prisma = { subTask: { findMany } } as unknown as PrismaService;
  const repository = new SubTaskRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates the first subtask at the initial rank using the supplied transaction', async () => {
    findFirst.mockResolvedValue(null);
    create.mockResolvedValue({ id: 'subtask-1' });

    await repository.createWithTransaction(
      'todo-1',
      { title: 'Buy milk' },
      transaction as unknown as Prisma.TransactionClient,
    );
    expect(create).toHaveBeenCalledWith({
      data: {
        todoId: 'todo-1',
        title: 'Buy milk',
        rank: new Prisma.Decimal(1000),
      },
    });
  });

  it('reads a todo collection in deterministic rank order', async () => {
    findMany.mockResolvedValue([]);

    await expect(repository.findByTodoId('todo-1')).resolves.toEqual([]);
    expect(findMany).toHaveBeenCalledWith({
      where: { todoId: 'todo-1' },
      orderBy: [{ rank: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
  });

  it.each([
    [1, true],
    [0, false],
  ] as const)(
    'reports whether a conditional completion update changed a row',
    async (count, transitioned) => {
      const subtask = { id: 'subtask-1', completed: true };
      updateMany.mockResolvedValue({ count });
      findUniqueOrThrow.mockResolvedValue(subtask);

      await expect(
        repository.updateCompletion(
          'subtask-1',
          true,
          transaction as unknown as Prisma.TransactionClient,
        ),
      ).resolves.toEqual({ subtask, transitioned });
      expect(updateMany).toHaveBeenCalledWith({
        where: { id: 'subtask-1', completed: { not: true } },
        data: { completed: true },
      });
      expect(findUniqueOrThrow).toHaveBeenCalledWith({ where: { id: 'subtask-1' } });
    },
  );
});
