import { Injectable } from '@nestjs/common';
import { ErrorCode } from '../../../common/exception/error-code';
import { GlobalException } from '../../../common/exception/global.exception';
import { ApplicationLoggerService } from '../../../common/logger/logger.service';
import { PrismaService } from '../../../shared/database/prisma/prisma.service';
import { TodoListRealtimeEventType } from '../../../shared/realtime/realtime.constants';
import { RealtimePublisher } from '../../../shared/realtime/realtime.publisher';
import type { TodoListRealtimeEvent } from '../../../shared/realtime/realtime.types';
import { now } from '../../../shared/utils/time.utilities';
import { ActivityEntityType, ActivityType } from '../activity/activity.constants';
import { ActivityService } from '../activity/activity.service';
import { TodoService } from '../todo/todo.service';
import type { CreateSubTaskDto } from './dto/create-subtask.dto';
import type { UpdateSubTaskCompletionDto } from './dto/update-subtask-completion.dto';
import { SubTaskRepository } from './repositories/subtask.repository';
import type { SubTaskResult } from './subtask.types';

@Injectable()
export class SubTaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subtasks: SubTaskRepository,
    private readonly todos: TodoService,
    private readonly activities: ActivityService,
    private readonly logger: ApplicationLoggerService,
    private readonly realtime: RealtimePublisher,
  ) {}

  async create(userId: string, todoId: string, input: CreateSubTaskDto): Promise<SubTaskResult> {
    const { todo, groupId } = await this.todos.findByIdWithGroup(userId, todoId);
    const subtask = await this.prisma.$transaction(async (transaction) => {
      const created = await this.subtasks.createWithTransaction(todoId, input, transaction);
      await this.activities.record(
        {
          groupId,
          actorId: userId,
          type: ActivityType.SUBTASK_CREATED,
          entityType: ActivityEntityType.SUBTASK,
          entityId: created.id,
        },
        transaction,
      );
      return created;
    });

    await this.publishRealtimeEvent({
      type: TodoListRealtimeEventType.SUBTASK_CREATED,
      todoListId: todo.todoListId,
      todoId,
      subtaskId: subtask.id,
    });

    this.logger.log(
      'Subtask created',
      { subtaskId: subtask.id, todoId, userId },
      SubTaskService.name,
    );
    return subtask;
  }

  async findForTodo(userId: string, todoId: string): Promise<SubTaskResult[]> {
    await this.todos.findByIdWithGroup(userId, todoId);
    return this.subtasks.findByTodoId(todoId);
  }

  async findById(userId: string, subtaskId: string): Promise<SubTaskResult> {
    const { subtask } = await this.findAccessibleSubTask(userId, subtaskId);
    return subtask;
  }

  async updateCompletion(
    userId: string,
    subtaskId: string,
    input: UpdateSubTaskCompletionDto,
  ): Promise<SubTaskResult> {
    const { subtask, groupId, todoListId } = await this.findAccessibleSubTask(userId, subtaskId);
    const transition = await this.prisma.$transaction(async (transaction) => {
      const transition = await this.subtasks.updateCompletion(
        subtask.id,
        input.completed,
        transaction,
      );
      if (!transition.subtask) {
        throw this.notFound(subtaskId, userId);
      }
      const updatedSubTask = transition.subtask;
      if (transition.transitioned) {
        await this.activities.record(
          {
            groupId,
            actorId: userId,
            type: input.completed
              ? ActivityType.SUBTASK_COMPLETED
              : ActivityType.SUBTASK_UNCOMPLETED,
            entityType: ActivityEntityType.SUBTASK,
            entityId: updatedSubTask.id,
          },
          transaction,
        );
      }
      return { subtask: updatedSubTask, transitioned: transition.transitioned };
    });

    if (transition.transitioned) {
      await this.publishRealtimeEvent({
        type: TodoListRealtimeEventType.SUBTASK_COMPLETION_CHANGED,
        todoListId,
        todoId: subtask.todoId,
        subtaskId: transition.subtask.id,
      });
    }

    this.logger.log(
      'Subtask completion updated',
      { subtaskId, todoId: subtask.todoId, userId, completed: input.completed },
      SubTaskService.name,
    );
    return transition.subtask;
  }

  async delete(userId: string, subtaskId: string): Promise<SubTaskResult> {
    const { subtask, groupId } = await this.findAccessibleSubTask(userId, subtaskId);
    const deletedSubTask = await this.prisma.$transaction(async (transaction) => {
      const transition = await this.subtasks.softDelete(subtask.id, now().toDate(), transaction);
      if (!transition.transitioned || !transition.subtask) {
        throw this.notFound(subtaskId, userId);
      }
      await this.activities.record(
        {
          groupId,
          actorId: userId,
          type: ActivityType.SUBTASK_DELETED,
          entityType: ActivityEntityType.SUBTASK,
          entityId: subtask.id,
        },
        transaction,
      );
      return transition.subtask;
    });

    this.logger.log(
      'Subtask deleted',
      { subtaskId, todoId: subtask.todoId, userId },
      SubTaskService.name,
    );
    return deletedSubTask;
  }

  private async findAccessibleSubTask(
    userId: string,
    subtaskId: string,
  ): Promise<{ subtask: SubTaskResult; groupId: string; todoListId: string }> {
    const subtask = await this.subtasks.findById(subtaskId);
    if (!subtask) {
      throw this.notFound(subtaskId, userId);
    }

    try {
      const { todo, groupId } = await this.todos.findByIdWithGroup(userId, subtask.todoId);
      return { subtask, groupId, todoListId: todo.todoListId };
    } catch (error: unknown) {
      if (error instanceof GlobalException && error.code === ErrorCode.TASK_NOT_FOUND) {
        throw this.notFound(subtaskId, userId);
      }
      throw error;
    }
  }

  private async publishRealtimeEvent(event: TodoListRealtimeEvent): Promise<void> {
    try {
      await this.realtime.publishTodoListEvent(event);
    } catch (error: unknown) {
      this.logger.warn(
        'Realtime publication failed after subtask mutation persisted',
        {
          eventType: event.type,
          todoListId: event.todoListId,
          todoId: event.todoId,
          subtaskId: 'subtaskId' in event ? event.subtaskId : undefined,
          errorMessage: error instanceof Error ? error.message : 'Unknown publication error',
        },
        SubTaskService.name,
      );
    }
  }

  private notFound(subtaskId: string, userId: string): GlobalException {
    return new GlobalException(ErrorCode.SUBTASK_NOT_FOUND, { subtaskId, userId });
  }
}
