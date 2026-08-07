import { TodoRepository } from '../../../../src/api/v1/todo/repositories/todo.repository';
import type { PrismaService } from '../../../../src/shared/database/prisma/prisma.service';

describe('Todo persistence ordering', () => {
  const findMany = jest.fn();
  const prisma = { todo: { findMany } } as unknown as PrismaService;
  const todos = new TodoRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retrieves todo-list contents in deterministic rank order', async () => {
    findMany.mockResolvedValue([]);

    await expect(todos.findByTodoListId('list-1')).resolves.toEqual([]);

    expect(findMany).toHaveBeenCalledWith({
      where: { todoListId: 'list-1' },
      orderBy: [{ rank: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
  });
});
