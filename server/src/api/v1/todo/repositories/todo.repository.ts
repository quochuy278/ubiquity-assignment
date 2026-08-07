import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import type { CreateTodoInput, TodoResult, UpdateTodoCompletionInput } from '../todo.types';

const TODO_RANK_STEP = 1000;

@Injectable()
export class TodoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    todoListId: string,
    createdById: string,
    input: CreateTodoInput,
  ): Promise<TodoResult> {
    return this.prisma.$transaction(async (transaction) => {
      const lastTodo = await transaction.todo.findFirst({
        where: { todoListId },
        select: { rank: true },
        orderBy: [{ rank: 'desc' }, { id: 'asc' }],
      });
      const rank = lastTodo
        ? lastTodo.rank.add(TODO_RANK_STEP)
        : new Prisma.Decimal(TODO_RANK_STEP);

      return transaction.todo.create({
        data: {
          ...input,
          todoListId,
          createdById,
          rank,
        },
      });
    });
  }

  findByTodoListId(todoListId: string): Promise<TodoResult[]> {
    return this.prisma.todo.findMany({
      where: { todoListId },
      orderBy: [{ rank: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  findById(todoId: string): Promise<TodoResult | null> {
    return this.prisma.todo.findUnique({ where: { id: todoId } });
  }

  updateCompletion(todoId: string, input: UpdateTodoCompletionInput): Promise<TodoResult> {
    return this.prisma.todo.update({
      where: { id: todoId },
      data: input,
    });
  }
}
