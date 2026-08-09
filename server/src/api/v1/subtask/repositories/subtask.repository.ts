import { Injectable } from '@nestjs/common';
import { Prisma, type SubTask } from '@prisma/client';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import type { CreateSubTaskInput, SubTaskResult } from '../subtask.types';

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
      where: { todoId },
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
      where: { todoId },
      orderBy: [{ rank: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  findById(subtaskId: string): Promise<SubTask | null> {
    return this.prisma.subTask.findUnique({ where: { id: subtaskId } });
  }

  updateCompletion(
    subtaskId: string,
    completed: boolean,
    transaction: Prisma.TransactionClient,
  ): Promise<SubTask> {
    return transaction.subTask.update({
      where: { id: subtaskId },
      data: { completed },
    });
  }
}
