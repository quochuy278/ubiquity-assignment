import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import type { CreateTodoListInput, TodoListResult } from '../todo-list.types';

const TODO_LIST_RANK_STEP = 1000;

@Injectable()
export class TodoListRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(groupId: string, input: CreateTodoListInput): Promise<TodoListResult> {
    return this.createInTransaction(groupId, input);
  }

  createWithTransaction(
    groupId: string,
    input: CreateTodoListInput,
    transaction: Prisma.TransactionClient,
  ): Promise<TodoListResult> {
    return this.createInTransaction(groupId, input, transaction);
  }

  private createInTransaction(
    groupId: string,
    input: CreateTodoListInput,
    transaction?: Prisma.TransactionClient,
  ): Promise<TodoListResult> {
    const create = async (client: Prisma.TransactionClient): Promise<TodoListResult> => {
      const lastTodoList = await client.todoList.findFirst({
        where: { groupId },
        select: { rank: true },
        orderBy: [{ rank: 'desc' }, { id: 'asc' }],
      });
      const rank = lastTodoList
        ? lastTodoList.rank.add(TODO_LIST_RANK_STEP)
        : new Prisma.Decimal(TODO_LIST_RANK_STEP);

      return client.todoList.create({
        data: {
          ...input,
          groupId,
          rank,
        },
      });
    };

    return transaction ? create(transaction) : this.prisma.$transaction(create);
  }

  findByGroupId(groupId: string): Promise<TodoListResult[]> {
    return this.prisma.todoList.findMany({
      where: { groupId },
      orderBy: [{ rank: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  findById(todoListId: string): Promise<TodoListResult | null> {
    return this.prisma.todoList.findUnique({ where: { id: todoListId } });
  }
}
