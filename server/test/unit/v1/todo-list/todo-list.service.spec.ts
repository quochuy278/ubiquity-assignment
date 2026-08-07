import { Prisma } from '@prisma/client';
import dayjs from 'dayjs';
import type { GroupService } from '../../../../src/api/v1/group/group.service';
import type { TodoListRepository } from '../../../../src/api/v1/todo-list/repositories/todo-list.repository';
import { TodoListService } from '../../../../src/api/v1/todo-list/todo-list.service';
import type { TodoListResult } from '../../../../src/api/v1/todo-list/todo-list.types';
import { ErrorCode } from '../../../../src/common/exception/error-code';
import { GlobalException } from '../../../../src/common/exception/global.exception';
import type { ApplicationLoggerService } from '../../../../src/common/logger/logger.service';

describe('Todo list use-case orchestration', () => {
  const todoList: TodoListResult = {
    id: 'list-1',
    groupId: 'group-1',
    name: 'Shopping',
    icon: 'shopping-cart',
    color: '#2563EB',
    rank: new Prisma.Decimal(1000),
    createdAt: dayjs('2026-08-07T10:00:00.000Z').toDate(),
    updatedAt: dayjs('2026-08-07T10:00:00.000Z').toDate(),
  };
  const findGroupById = jest.fn();
  const createTodoList = jest.fn();
  const findByGroupId = jest.fn();
  const findTodoListById = jest.fn();
  const log = jest.fn();
  const groups = { findById: findGroupById } as unknown as GroupService;
  const todoLists = {
    create: createTodoList,
    findByGroupId,
    findById: findTodoListById,
  } as unknown as TodoListRepository;
  const logger = { log } as unknown as ApplicationLoggerService;
  const service = new TodoListService(todoLists, groups, logger);

  beforeEach(() => {
    jest.resetAllMocks();
    findGroupById.mockResolvedValue({ id: 'group-1' });
  });

  it('validates group access through GroupService before creating a todo list', async () => {
    const input = { name: 'Shopping', icon: 'shopping-cart', color: '#2563EB' };
    createTodoList.mockResolvedValue(todoList);

    await expect(service.create('user-1', 'group-1', input)).resolves.toEqual(todoList);

    expect(findGroupById).toHaveBeenCalledWith('user-1', 'group-1');
    expect(createTodoList).toHaveBeenCalledWith('group-1', input);
    expect(findGroupById.mock.invocationCallOrder[0]).toBeLessThan(
      createTodoList.mock.invocationCallOrder[0],
    );
    expect(log).toHaveBeenCalledWith(
      'Todo list created',
      { todoListId: 'list-1', groupId: 'group-1', userId: 'user-1' },
      TodoListService.name,
    );
  });

  it('does not create a todo list when group access is denied', async () => {
    findGroupById.mockRejectedValue(
      new GlobalException(ErrorCode.GROUP_NOT_FOUND, {
        groupId: 'group-1',
        userId: 'user-2',
      }),
    );

    await expect(service.create('user-2', 'group-1', { name: 'Shopping' })).rejects.toMatchObject({
      code: ErrorCode.GROUP_NOT_FOUND,
    });

    expect(createTodoList).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });

  it('validates group access before retrieving its todo lists', async () => {
    findByGroupId.mockResolvedValue([todoList]);

    await expect(service.findForGroup('user-1', 'group-1')).resolves.toEqual([todoList]);

    expect(findGroupById).toHaveBeenCalledWith('user-1', 'group-1');
    expect(findByGroupId).toHaveBeenCalledWith('group-1');
    expect(findGroupById.mock.invocationCallOrder[0]).toBeLessThan(
      findByGroupId.mock.invocationCallOrder[0],
    );
  });

  it('validates access to the owning group when retrieving a single todo list', async () => {
    findTodoListById.mockResolvedValue(todoList);

    await expect(service.findById('user-1', 'list-1')).resolves.toEqual(todoList);

    expect(findTodoListById).toHaveBeenCalledWith('list-1');
    expect(findGroupById).toHaveBeenCalledWith('user-1', 'group-1');
  });

  it('uses the same not-found outcome for an inaccessible and nonexistent todo list', async () => {
    findTodoListById.mockResolvedValueOnce(todoList).mockResolvedValueOnce(null);
    findGroupById.mockRejectedValueOnce(
      new GlobalException(ErrorCode.GROUP_NOT_FOUND, {
        groupId: 'group-1',
        userId: 'user-2',
      }),
    );

    const inaccessible = service.findById('user-2', 'list-1');
    const nonexistent = service.findById('user-2', 'missing-list');

    await expect(inaccessible).rejects.toMatchObject({
      code: ErrorCode.TODO_LIST_NOT_FOUND,
      context: { todoListId: 'list-1', userId: 'user-2' },
    });
    await expect(nonexistent).rejects.toMatchObject({
      code: ErrorCode.TODO_LIST_NOT_FOUND,
      context: { todoListId: 'missing-list', userId: 'user-2' },
    });
  });

  it('does not hide an unexpected failure from GroupService', async () => {
    const error = new Error('database unavailable');
    findTodoListById.mockResolvedValue(todoList);
    findGroupById.mockRejectedValue(error);

    await expect(service.findById('user-1', 'list-1')).rejects.toBe(error);
  });
});
