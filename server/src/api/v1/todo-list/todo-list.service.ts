import { Injectable } from '@nestjs/common';
import { ErrorCode } from '../../../common/exception/error-code';
import { GlobalException } from '../../../common/exception/global.exception';
import { ApplicationLoggerService } from '../../../common/logger/logger.service';
import { PrismaService } from '../../../shared/database/prisma/prisma.service';
import { GroupRealtimeEventType } from '../../../shared/realtime/realtime.constants';
import { RealtimePublisher } from '../../../shared/realtime/realtime.publisher';
import type { GroupRealtimeEvent } from '../../../shared/realtime/realtime.types';
import { ActivityEntityType, ActivityType } from '../activity/activity.constants';
import { ActivityService } from '../activity/activity.service';
import { GroupType } from '../group/group.constants';
import { GroupService } from '../group/group.service';
import type { CreateTodoListDto } from './dto/create-todo-list.dto';
import { TodoListRepository } from './repositories/todo-list.repository';
import type { TodoListResult } from './todo-list.types';

@Injectable()
export class TodoListService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly todoLists: TodoListRepository,
    private readonly groups: GroupService,
    private readonly activities: ActivityService,
    private readonly logger: ApplicationLoggerService,
    private readonly realtime: RealtimePublisher,
  ) {}

  async create(userId: string, groupId: string, input: CreateTodoListDto): Promise<TodoListResult> {
    const group = await this.groups.findById(userId, groupId);

    const todoList = await this.prisma.$transaction(async (transaction) => {
      const created = await this.todoLists.createWithTransaction(groupId, input, transaction);
      await this.activities.record(
        {
          groupId,
          actorId: userId,
          type: ActivityType.TODO_LIST_CREATED,
          entityType: ActivityEntityType.TODO_LIST,
          entityId: created.id,
        },
        transaction,
      );
      return created;
    });

    if (group.type === GroupType.SHARED) {
      await this.publishRealtimeEvent({
        type: GroupRealtimeEventType.TODO_LIST_CREATED,
        groupId,
        todoListId: todoList.id,
      });
    }

    this.logger.log(
      'Todo list created',
      { todoListId: todoList.id, groupId, userId },
      TodoListService.name,
    );

    return todoList;
  }

  async findForGroup(userId: string, groupId: string): Promise<TodoListResult[]> {
    await this.groups.findById(userId, groupId);

    return this.todoLists.findByGroupId(groupId);
  }

  async findById(userId: string, todoListId: string): Promise<TodoListResult> {
    const todoList = await this.todoLists.findById(todoListId);

    if (!todoList) {
      throw this.notFound(todoListId, userId);
    }

    try {
      await this.groups.findById(userId, todoList.groupId);
    } catch (error: unknown) {
      if (error instanceof GlobalException && error.code === ErrorCode.GROUP_NOT_FOUND) {
        throw this.notFound(todoListId, userId);
      }

      throw error;
    }

    return todoList;
  }

  private async publishRealtimeEvent(event: GroupRealtimeEvent): Promise<void> {
    try {
      await this.realtime.publishGroupEvent(event);
    } catch (error: unknown) {
      this.logger.warn(
        'Realtime publication failed after todo list mutation persisted',
        {
          eventType: event.type,
          groupId: event.groupId,
          todoListId: event.todoListId,
          errorMessage: error instanceof Error ? error.message : 'Unknown publication error',
        },
        TodoListService.name,
      );
    }
  }

  private notFound(todoListId: string, userId: string): GlobalException {
    return new GlobalException(ErrorCode.TODO_LIST_NOT_FOUND, { todoListId, userId });
  }
}
