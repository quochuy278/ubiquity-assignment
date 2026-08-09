import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import type {
  CreateTodoInput,
  TodoCompletionTransitionResult,
  TodoResult,
  UpdateTodoCompletionInput,
} from '../todo.types';

const TODO_RANK_STEP = 1000;

@Injectable()
export class TodoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    todoListId: string,
    createdById: string,
    input: CreateTodoInput,
  ): Promise<TodoResult> {
    return this.createInTransaction(todoListId, createdById, input);
  }

  createWithTransaction(
    todoListId: string,
    createdById: string,
    input: CreateTodoInput,
    transaction: Prisma.TransactionClient,
  ): Promise<TodoResult> {
    return this.createInTransaction(todoListId, createdById, input, transaction);
  }

  private createInTransaction(
    todoListId: string,
    createdById: string,
    input: CreateTodoInput,
    transaction?: Prisma.TransactionClient,
  ): Promise<TodoResult> {
    const create = async (client: Prisma.TransactionClient): Promise<TodoResult> => {
      const lastTodo = await client.todo.findFirst({
        where: { todoListId },
        select: { rank: true },
        orderBy: [{ rank: 'desc' }, { id: 'asc' }],
      });
      const rank = lastTodo
        ? lastTodo.rank.add(TODO_RANK_STEP)
        : new Prisma.Decimal(TODO_RANK_STEP);

      return client.todo.create({
        data: {
          ...input,
          todoListId,
          createdById,
          rank,
        },
      });
    };
    return transaction ? create(transaction) : this.prisma.$transaction(create);
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

  async updateCompletion(
    todoId: string,
    input: UpdateTodoCompletionInput,
    transaction: Prisma.TransactionClient,
  ): Promise<TodoCompletionTransitionResult> {
    const update = await transaction.todo.updateMany({
      where: { id: todoId, status: { not: input.status } },
      data: input,
    });
    const todo = await transaction.todo.findUniqueOrThrow({ where: { id: todoId } });

    return { todo, transitioned: update.count === 1 };
  }
}
