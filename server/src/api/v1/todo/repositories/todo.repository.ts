import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import type {
  CreateTodoInput,
  TodoCompletionTransitionResult,
  TodoDeletionTransitionResult,
  TodoReorderTransitionResult,
  TodoResult,
  UpdateTodoCompletionInput,
} from '../todo.types';

const TODO_RANK_STEP = 1000;
const TODO_RANK_SCALE = 10;
const TODO_MAX_RANK = new Prisma.Decimal('9999999999.9999999999');

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
        where: { todoListId, deletedAt: null },
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
      where: { todoListId, deletedAt: null },
      orderBy: [{ rank: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  findById(todoId: string): Promise<TodoResult | null> {
    return this.prisma.todo.findFirst({ where: { id: todoId, deletedAt: null } });
  }

  async reorder(
    todoId: string,
    todoListId: string,
    beforeTodoId: string | null,
    updatedById: string,
    transaction: Prisma.TransactionClient,
  ): Promise<TodoReorderTransitionResult> {
    const orderedTodos = await transaction.todo.findMany({
      where: { todoListId, deletedAt: null },
      orderBy: [{ rank: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
    const movedTodo = orderedTodos.find((todo) => todo.id === todoId);
    if (!movedTodo) return { kind: 'notFound' };

    const remainingTodos = orderedTodos.filter((todo) => todo.id !== todoId);
    const insertionIndex =
      beforeTodoId === null
        ? remainingTodos.length
        : remainingTodos.findIndex((todo) => todo.id === beforeTodoId);
    if (insertionIndex < 0) return { kind: 'invalidAnchor' };

    const reorderedTodos = [...remainingTodos];
    reorderedTodos.splice(insertionIndex, 0, movedTodo);
    if (reorderedTodos.every((todo, index) => todo.id === orderedTodos[index]?.id)) {
      return { kind: 'noOp', todo: movedTodo };
    }

    const previousTodo = reorderedTodos[insertionIndex - 1];
    const nextTodo = reorderedTodos[insertionIndex + 1];
    const rank = this.calculateRank(previousTodo?.rank, nextTodo?.rank);

    if (!rank) {
      return this.rebalance(reorderedTodos, todoId, updatedById, transaction);
    }

    const update = await transaction.todo.updateMany({
      where: { id: todoId, todoListId, deletedAt: null },
      data: { rank, updatedById },
    });
    if (update.count !== 1) return { kind: 'notFound' };

    const todo = await transaction.todo.findFirst({
      where: { id: todoId, todoListId, deletedAt: null },
    });
    return todo ? { kind: 'reordered', todo } : { kind: 'notFound' };
  }

  async updateCompletion(
    todoId: string,
    input: UpdateTodoCompletionInput,
    transaction: Prisma.TransactionClient,
  ): Promise<TodoCompletionTransitionResult> {
    const update = await transaction.todo.updateMany({
      where: { id: todoId, deletedAt: null, status: { not: input.status } },
      data: input,
    });
    const todo = await transaction.todo.findFirst({ where: { id: todoId, deletedAt: null } });

    return { todo, transitioned: update.count === 1 };
  }

  async softDelete(
    todoId: string,
    deletedAt: Date,
    transaction: Prisma.TransactionClient,
  ): Promise<TodoDeletionTransitionResult> {
    const update = await transaction.todo.updateMany({
      where: { id: todoId, deletedAt: null },
      data: { deletedAt },
    });
    const todo =
      update.count === 1 ? await transaction.todo.findUnique({ where: { id: todoId } }) : null;

    return { todo, transitioned: update.count === 1 };
  }

  private calculateRank(
    previousRank: Prisma.Decimal | undefined,
    nextRank: Prisma.Decimal | undefined,
  ): Prisma.Decimal | null {
    if (!previousRank && !nextRank) return null;

    const rank = previousRank
      ? nextRank
        ? previousRank.add(nextRank).div(2)
        : previousRank.add(TODO_RANK_STEP)
      : nextRank?.sub(TODO_RANK_STEP);
    if (!rank) return null;

    const persistedRank = rank.toDecimalPlaces(TODO_RANK_SCALE);
    const isStrictlyAfterPrevious = !previousRank || persistedRank.comparedTo(previousRank) > 0;
    const isStrictlyBeforeNext = !nextRank || persistedRank.comparedTo(nextRank) < 0;
    const isWithinDatabaseRange = persistedRank.abs().comparedTo(TODO_MAX_RANK) <= 0;

    return isStrictlyAfterPrevious && isStrictlyBeforeNext && isWithinDatabaseRange
      ? persistedRank
      : null;
  }

  private async rebalance(
    reorderedTodos: TodoResult[],
    movedTodoId: string,
    updatedById: string,
    transaction: Prisma.TransactionClient,
  ): Promise<TodoReorderTransitionResult> {
    for (const [index, todo] of reorderedTodos.entries()) {
      const update = await transaction.todo.updateMany({
        where: { id: todo.id, todoListId: todo.todoListId, deletedAt: null },
        data: {
          rank: new Prisma.Decimal((index + 1) * TODO_RANK_STEP),
          ...(todo.id === movedTodoId ? { updatedById } : {}),
        },
      });
      if (update.count !== 1) return { kind: 'notFound' };
    }

    const todo = await transaction.todo.findFirst({
      where: { id: movedTodoId, deletedAt: null },
    });
    return todo ? { kind: 'reordered', todo } : { kind: 'notFound' };
  }
}
