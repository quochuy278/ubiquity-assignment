import { Prisma } from '@prisma/client';
import { TodoListRepository } from '../../../../src/api/v1/todo-list/repositories/todo-list.repository';
import type { PrismaService } from '../../../../src/shared/database/prisma/prisma.service';

describe('Todo list persistence', () => {
  const findFirst = jest.fn();
  const create = jest.fn();
  const findMany = jest.fn();
  const findUnique = jest.fn();
  const transactionClient = { todoList: { findFirst, create } };
  const runTransaction = jest.fn();
  const prisma = {
    $transaction: runTransaction,
    todoList: { findMany, findUnique },
  } as unknown as PrismaService;
  const todoLists = new TodoListRepository(prisma);

  beforeEach(() => {
    jest.resetAllMocks();
    runTransaction.mockImplementation(
      (callback: (client: typeof transactionClient) => Promise<unknown>) =>
        callback(transactionClient),
    );
  });

  it('creates the first todo list with the initial rank', async () => {
    const created = { id: 'list-1' };
    findFirst.mockResolvedValue(null);
    create.mockResolvedValue(created);

    await expect(todoLists.create('group-1', { name: 'Shopping' })).resolves.toBe(created);

    expect(findFirst).toHaveBeenCalledWith({
      where: { groupId: 'group-1' },
      select: { rank: true },
      orderBy: [{ rank: 'desc' }, { id: 'asc' }],
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        name: 'Shopping',
        groupId: 'group-1',
        rank: new Prisma.Decimal(1000),
      },
    });
  });

  it('appends a todo list after the current highest rank', async () => {
    findFirst.mockResolvedValue({ rank: new Prisma.Decimal(2000) });
    create.mockResolvedValue({ id: 'list-3' });

    await todoLists.create('group-1', { name: 'Vacation', color: '#16A34A' });

    expect(create).toHaveBeenCalledWith({
      data: {
        name: 'Vacation',
        color: '#16A34A',
        groupId: 'group-1',
        rank: new Prisma.Decimal(3000),
      },
    });
  });

  it('retrieves a group collection in deterministic rank order', async () => {
    findMany.mockResolvedValue([]);

    await expect(todoLists.findByGroupId('group-1')).resolves.toEqual([]);

    expect(findMany).toHaveBeenCalledWith({
      where: { groupId: 'group-1' },
      orderBy: [{ rank: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
  });
});
