import { Prisma } from '@prisma/client';
import dayjs from 'dayjs';
import type { ActivityService } from '../../../../src/api/v1/activity/activity.service';
import type { SubTaskRepository } from '../../../../src/api/v1/subtask/repositories/subtask.repository';
import { SubTaskService } from '../../../../src/api/v1/subtask/subtask.service';
import type { SubTaskResult } from '../../../../src/api/v1/subtask/subtask.types';
import type { TodoService } from '../../../../src/api/v1/todo/todo.service';
import { ErrorCode } from '../../../../src/common/exception/error-code';
import { GlobalException } from '../../../../src/common/exception/global.exception';
import type { ApplicationLoggerService } from '../../../../src/common/logger/logger.service';
import type { PrismaService } from '../../../../src/shared/database/prisma/prisma.service';

describe('Subtask use-case behavior and authorization', () => {
  const subtask: SubTaskResult = {
    id: 'subtask-1',
    todoId: 'todo-1',
    title: 'Buy milk',
    completed: false,
    rank: new Prisma.Decimal(1000),
    createdAt: dayjs('2026-08-09T10:00:00.000Z').toDate(),
    updatedAt: dayjs('2026-08-09T10:00:00.000Z').toDate(),
  };
  const transactionClient = { subTask: {}, activityEvent: {} };
  const runTransaction = jest.fn();
  const createSubTask = jest.fn();
  const findByTodoId = jest.fn();
  const findSubTaskById = jest.fn();
  const updateCompletion = jest.fn();
  const findTodoWithGroup = jest.fn();
  const recordActivity = jest.fn();
  const log = jest.fn();
  const prisma = { $transaction: runTransaction } as unknown as PrismaService;
  const subtasks = {
    createWithTransaction: createSubTask,
    findByTodoId,
    findById: findSubTaskById,
    updateCompletion,
  } as unknown as SubTaskRepository;
  const todos = { findByIdWithGroup: findTodoWithGroup } as unknown as TodoService;
  const activities = { record: recordActivity } as unknown as ActivityService;
  const logger = { log } as unknown as ApplicationLoggerService;
  const service = new SubTaskService(prisma, subtasks, todos, activities, logger);

  beforeEach(() => {
    jest.resetAllMocks();
    runTransaction.mockImplementation(
      (callback: (client: typeof transactionClient) => Promise<unknown>) =>
        callback(transactionClient),
    );
    findTodoWithGroup.mockResolvedValue({ todo: { id: 'todo-1' }, groupId: 'group-1' });
  });

  it('creates a subtask and its activity in the same transaction', async () => {
    createSubTask.mockResolvedValue(subtask);

    await expect(service.create('user-1', 'todo-1', { title: 'Buy milk' })).resolves.toBe(subtask);
    expect(findTodoWithGroup).toHaveBeenCalledWith('user-1', 'todo-1');
    expect(createSubTask).toHaveBeenCalledWith('todo-1', { title: 'Buy milk' }, transactionClient);
    expect(recordActivity).toHaveBeenCalledWith(
      {
        groupId: 'group-1',
        actorId: 'user-1',
        type: 'SUBTASK_CREATED',
        entityType: 'SUBTASK',
        entityId: 'subtask-1',
      },
      transactionClient,
    );
  });

  it.each([
    [true, 'SUBTASK_COMPLETED'],
    [false, 'SUBTASK_UNCOMPLETED'],
  ] as const)('updates completion to %s with the expected activity', async (completed, type) => {
    const updated = { ...subtask, completed };
    findSubTaskById.mockResolvedValue(subtask);
    updateCompletion.mockResolvedValue({ subtask: updated, transitioned: true });

    await expect(service.updateCompletion('user-1', 'subtask-1', { completed })).resolves.toBe(
      updated,
    );
    expect(updateCompletion).toHaveBeenCalledWith('subtask-1', completed, transactionClient);
    expect(recordActivity).toHaveBeenCalledWith(
      {
        groupId: 'group-1',
        actorId: 'user-1',
        type,
        entityType: 'SUBTASK',
        entityId: 'subtask-1',
      },
      transactionClient,
    );
  });

  it('returns the current subtask without activity when completion is already at the target state', async () => {
    const completedSubTask = { ...subtask, completed: true };
    findSubTaskById.mockResolvedValue(completedSubTask);
    updateCompletion.mockResolvedValue({ subtask: completedSubTask, transitioned: false });

    await expect(
      service.updateCompletion('user-1', 'subtask-1', { completed: true }),
    ).resolves.toBe(completedSubTask);

    expect(updateCompletion).toHaveBeenCalled();
    expect(recordActivity).not.toHaveBeenCalled();
  });

  it('maps inaccessible and missing parent chains to the same subtask not-found result', async () => {
    findSubTaskById.mockResolvedValueOnce(subtask).mockResolvedValueOnce(null);
    findTodoWithGroup.mockRejectedValueOnce(
      new GlobalException(ErrorCode.TASK_NOT_FOUND, { todoId: 'todo-1', userId: 'user-2' }),
    );

    await expect(service.findById('user-2', 'subtask-1')).rejects.toMatchObject({
      code: ErrorCode.SUBTASK_NOT_FOUND,
    });
    await expect(service.findById('user-2', 'missing-subtask')).rejects.toMatchObject({
      code: ErrorCode.SUBTASK_NOT_FOUND,
    });
    expect(updateCompletion).not.toHaveBeenCalled();
    expect(recordActivity).not.toHaveBeenCalled();
  });
});
