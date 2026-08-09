import { Injectable } from '@nestjs/common';
import { ErrorCode } from '../../../common/exception/error-code';
import { GlobalException } from '../../../common/exception/global.exception';
import { ApplicationLoggerService } from '../../../common/logger/logger.service';
import { PrismaService } from '../../../shared/database/prisma/prisma.service';
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
  ) {}

  async create(userId: string, todoId: string, input: CreateSubTaskDto): Promise<SubTaskResult> {
    const { groupId } = await this.todos.findByIdWithGroup(userId, todoId);
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
    const { subtask, groupId } = await this.findAccessibleSubTask(userId, subtaskId);
    const updatedSubTask = await this.prisma.$transaction(async (transaction) => {
      const updated = await this.subtasks.updateCompletion(
        subtask.id,
        input.completed,
        transaction,
      );
      await this.activities.record(
        {
          groupId,
          actorId: userId,
          type: input.completed ? ActivityType.SUBTASK_COMPLETED : ActivityType.SUBTASK_UNCOMPLETED,
          entityType: ActivityEntityType.SUBTASK,
          entityId: updated.id,
        },
        transaction,
      );
      return updated;
    });

    this.logger.log(
      'Subtask completion updated',
      { subtaskId, todoId: subtask.todoId, userId, completed: input.completed },
      SubTaskService.name,
    );
    return updatedSubTask;
  }

  private async findAccessibleSubTask(
    userId: string,
    subtaskId: string,
  ): Promise<{ subtask: SubTaskResult; groupId: string }> {
    const subtask = await this.subtasks.findById(subtaskId);
    if (!subtask) {
      throw this.notFound(subtaskId, userId);
    }

    try {
      const { groupId } = await this.todos.findByIdWithGroup(userId, subtask.todoId);
      return { subtask, groupId };
    } catch (error: unknown) {
      if (error instanceof GlobalException && error.code === ErrorCode.TASK_NOT_FOUND) {
        throw this.notFound(subtaskId, userId);
      }
      throw error;
    }
  }

  private notFound(subtaskId: string, userId: string): GlobalException {
    return new GlobalException(ErrorCode.SUBTASK_NOT_FOUND, { subtaskId, userId });
  }
}
