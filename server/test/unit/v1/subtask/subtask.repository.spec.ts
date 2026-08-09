import { Prisma } from '@prisma/client';
import { SubTaskRepository } from '../../../../src/api/v1/subtask/repositories/subtask.repository';
import type { PrismaService } from '../../../../src/shared/database/prisma/prisma.service';

describe('Subtask persistence', () => {
  const findFirst = jest.fn();
  const create = jest.fn();
  const findMany = jest.fn();
  const update = jest.fn();
  const transaction = { subTask: { findFirst, create, update } };
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

  it('updates completion through the supplied transaction', async () => {
    update.mockResolvedValue({ id: 'subtask-1', completed: true });

    await repository.updateCompletion(
      'subtask-1',
      true,
      transaction as unknown as Prisma.TransactionClient,
    );
    expect(update).toHaveBeenCalledWith({
      where: { id: 'subtask-1' },
      data: { completed: true },
    });
  });
});
