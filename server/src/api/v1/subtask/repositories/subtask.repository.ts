import { Injectable } from '@nestjs/common';
import { Prisma, type SubTask } from '@prisma/client';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import type {
  CreateSubTaskInput,
  SubTaskCompletionTransitionResult,
  SubTaskDeletionTransitionResult,
  SubTaskResult,
} from '../subtask.types';

const SUBTASK_RANK_STEP = 1000;

@Injectable()
export class SubTaskRepository {
  constructor(private readonly prisma: PrismaService) {}

  createWithTransaction(
    todoId: string,
    input: CreateSubTaskInput,
    transaction: Prisma.TransactionClient,
  ): Promise<SubTaskResult> {
    return this.createInTransaction(todoId, input, transaction);
  }

  private async createInTransaction(
    todoId: string,
    input: CreateSubTaskInput,
    transaction: Prisma.TransactionClient,
  ): Promise<SubTaskResult> {
    const lastSubTask = await transaction.subTask.findFirst({
      where: { todoId, deletedAt: null },
      select: { rank: true },
      orderBy: [{ rank: 'desc' }, { id: 'asc' }],
    });
    const rank = lastSubTask
      ? lastSubTask.rank.add(SUBTASK_RANK_STEP)
      : new Prisma.Decimal(SUBTASK_RANK_STEP);

    return transaction.subTask.create({
      data: { ...input, todoId, rank },
    });
  }

  findByTodoId(todoId: string): Promise<SubTask[]> {
    return this.prisma.subTask.findMany({
      where: { todoId, deletedAt: null },
      orderBy: [{ rank: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  findById(subtaskId: string): Promise<SubTask | null> {
    return this.prisma.subTask.findFirst({
      where: { id: subtaskId, deletedAt: null, todo: { deletedAt: null } },
    });
  }

  async updateCompletion(
    subtaskId: string,
    completed: boolean,
    transaction: Prisma.TransactionClient,
  ): Promise<SubTaskCompletionTransitionResult> {
    const update = await transaction.subTask.updateMany({
      where: {
        id: subtaskId,
        deletedAt: null,
        todo: { deletedAt: null },
        completed: { not: completed },
      },
      data: { completed },
    });
    const subtask = await transaction.subTask.findFirst({
      where: { id: subtaskId, deletedAt: null, todo: { deletedAt: null } },
    });

    return { subtask, transitioned: update.count === 1 };
  }

  async softDelete(
    subtaskId: string,
    deletedAt: Date,
    transaction: Prisma.TransactionClient,
  ): Promise<SubTaskDeletionTransitionResult> {
    const update = await transaction.subTask.updateMany({
      where: { id: subtaskId, deletedAt: null, todo: { deletedAt: null } },
      data: { deletedAt },
    });
    const subtask =
      update.count === 1
        ? await transaction.subTask.findUnique({ where: { id: subtaskId } })
        : null;

    return { subtask, transitioned: update.count === 1 };
  }
}
