import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import type { CreateTodoListInput, TodoListResult } from '../todo-list.types';

const TODO_LIST_RANK_STEP = 1000;

@Injectable()
export class TodoListRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(groupId: string, input: CreateTodoListInput): Promise<TodoListResult> {
    return this.prisma.$transaction(async (transaction) => {
      const lastTodoList = await transaction.todoList.findFirst({
        where: { groupId },
        select: { rank: true },
        orderBy: [{ rank: 'desc' }, { id: 'asc' }],
      });
      const rank = lastTodoList
        ? lastTodoList.rank.add(TODO_LIST_RANK_STEP)
        : new Prisma.Decimal(TODO_LIST_RANK_STEP);

      return transaction.todoList.create({
        data: {
          ...input,
          groupId,
          rank,
        },
      });
    });
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
