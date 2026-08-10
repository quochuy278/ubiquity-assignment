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
import type { RealtimePublisher } from '../../../../src/shared/realtime/realtime.publisher';

describe('Subtask use-case behavior and authorization', () => {
  const subtask: SubTaskResult = {
    id: 'subtask-1',
    todoId: 'todo-1',
    title: 'Buy milk',
    completed: false,
    rank: new Prisma.Decimal(1000),
    createdAt: dayjs('2026-08-09T10:00:00.000Z').toDate(),
    updatedAt: dayjs('2026-08-09T10:00:00.000Z').toDate(),
    deletedAt: null,
  };
  const transactionClient = { subTask: {}, activityEvent: {} };
  const runTransaction = jest.fn();
  const createSubTask = jest.fn();
  const findByTodoId = jest.fn();
  const findSubTaskById = jest.fn();
  const updateCompletion = jest.fn();
  const softDelete = jest.fn();
  const findTodoWithGroup = jest.fn();
  const recordActivity = jest.fn();
  const log = jest.fn();
  const warn = jest.fn();
  const publishTodoListEvent = jest.fn();
  const prisma = { $transaction: runTransaction } as unknown as PrismaService;
  const subtasks = {
    createWithTransaction: createSubTask,
    findByTodoId,
    findById: findSubTaskById,
    updateCompletion,
    softDelete,
  } as unknown as SubTaskRepository;
  const todos = { findByIdWithGroup: findTodoWithGroup } as unknown as TodoService;
  const activities = { record: recordActivity } as unknown as ActivityService;
  const logger = { log, warn } as unknown as ApplicationLoggerService;
  const realtime = { publishTodoListEvent } as unknown as RealtimePublisher;
  const service = new SubTaskService(prisma, subtasks, todos, activities, logger, realtime);

  beforeEach(() => {
    jest.resetAllMocks();
    runTransaction.mockImplementation(
      (callback: (client: typeof transactionClient) => Promise<unknown>) =>
        callback(transactionClient),
    );
    findTodoWithGroup.mockResolvedValue({
      todo: { id: 'todo-1', todoListId: 'list-1' },
      groupId: 'group-1',
    });
    publishTodoListEvent.mockResolvedValue(undefined);
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
    expect(publishTodoListEvent).toHaveBeenCalledWith({
      type: 'SUBTASK_CREATED',
      todoListId: 'list-1',
      todoId: 'todo-1',
      subtaskId: 'subtask-1',
    });
  });

  it('does not publish when subtask creation fails inside the transaction', async () => {
    createSubTask.mockRejectedValue(new Error('subtask write failed'));

    await expect(service.create('user-1', 'todo-1', { title: 'Buy milk' })).rejects.toThrow(
      'subtask write failed',
    );

    expect(publishTodoListEvent).not.toHaveBeenCalled();
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
    expect(publishTodoListEvent).toHaveBeenCalledWith({
      type: 'SUBTASK_COMPLETION_CHANGED',
      todoListId: 'list-1',
      todoId: 'todo-1',
      subtaskId: 'subtask-1',
    });
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
    expect(publishTodoListEvent).not.toHaveBeenCalled();
  });

  it('does not publish when subtask completion fails inside the transaction', async () => {
    findSubTaskById.mockResolvedValue(subtask);
    updateCompletion.mockRejectedValue(new Error('completion write failed'));

    await expect(
      service.updateCompletion('user-1', 'subtask-1', { completed: true }),
    ).rejects.toThrow('completion write failed');

    expect(publishTodoListEvent).not.toHaveBeenCalled();
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
    expect(publishTodoListEvent).not.toHaveBeenCalled();
  });

  it('preserves a successful completion result when realtime publication fails', async () => {
    const updated = { ...subtask, completed: true };
    findSubTaskById.mockResolvedValue(subtask);
    updateCompletion.mockResolvedValue({ subtask: updated, transitioned: true });
    publishTodoListEvent.mockRejectedValue(new Error('Ably unavailable'));

    await expect(
      service.updateCompletion('user-1', 'subtask-1', { completed: true }),
    ).resolves.toBe(updated);

    expect(warn).toHaveBeenCalledWith(
      'Realtime publication failed after subtask mutation persisted',
      expect.objectContaining({
        eventType: 'SUBTASK_COMPLETION_CHANGED',
        todoListId: 'list-1',
        todoId: 'todo-1',
        subtaskId: 'subtask-1',
        errorMessage: 'Ably unavailable',
      }),
      SubTaskService.name,
    );
  });

  it('soft deletes an accessible subtask and records one activity in the transaction', async () => {
    const deletedSubTask = {
      ...subtask,
      deletedAt: dayjs('2026-08-10T10:00:00.000Z').toDate(),
    };
    findSubTaskById.mockResolvedValue(subtask);
    softDelete.mockResolvedValue({ subtask: deletedSubTask, transitioned: true });

    await expect(service.delete('user-1', 'subtask-1')).resolves.toBe(deletedSubTask);

    expect(softDelete).toHaveBeenCalledWith('subtask-1', expect.any(Date), transactionClient);
    expect(recordActivity).toHaveBeenCalledWith(
      {
        groupId: 'group-1',
        actorId: 'user-1',
        type: 'SUBTASK_DELETED',
        entityType: 'SUBTASK',
        entityId: 'subtask-1',
      },
      transactionClient,
    );
  });

  it('treats a lost subtask deletion race as not found without recording activity', async () => {
    findSubTaskById.mockResolvedValue(subtask);
    softDelete.mockResolvedValue({ subtask: null, transitioned: false });

    await expect(service.delete('user-1', 'subtask-1')).rejects.toMatchObject({
      code: ErrorCode.SUBTASK_NOT_FOUND,
    });
    expect(recordActivity).not.toHaveBeenCalled();
  });
});
