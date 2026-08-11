import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';
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
import { GroupType } from '../group/group.constants';
import { TodoListService } from '../todo-list/todo-list.service';
import type { CreateTodoDto } from './dto/create-todo.dto';
import type { ReorderTodoDto } from './dto/reorder-todo.dto';
import type { UpdateTodoCompletionDto } from './dto/update-todo-completion.dto';
import { TodoRepository } from './repositories/todo.repository';
import { TodoStatus } from './todo.constants';
import type { CreateTodoInput, TodoAccessResult, TodoResult } from './todo.types';

@Injectable()
export class TodoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly todos: TodoRepository,
    private readonly todoLists: TodoListService,
    private readonly activities: ActivityService,
    private readonly logger: ApplicationLoggerService,
    private readonly realtime: RealtimePublisher,
  ) {}

  async create(userId: string, todoListId: string, input: CreateTodoDto): Promise<TodoResult> {
    const { group, todoList } = await this.todoLists.findByIdWithGroup(userId, todoListId);

    const todo = await this.prisma.$transaction(async (transaction) => {
      const created = await this.todos.createWithTransaction(
        todoListId,
        userId,
        this.toCreateInput(input),
        transaction,
      );
      await this.activities.record(
        {
          groupId: todoList.groupId,
          actorId: userId,
          type: ActivityType.TODO_CREATED,
          entityType: ActivityEntityType.TODO,
          entityId: created.id,
        },
        transaction,
      );
      return created;
    });

    if (group.type === GroupType.SHARED) {
      await this.publishRealtimeEvent({
        type: TodoListRealtimeEventType.TODO_CREATED,
        todoListId,
        todoId: todo.id,
      });
    }

    this.logger.log('Todo created', { todoId: todo.id, todoListId, userId }, TodoService.name);

    return todo;
  }

  async findForTodoList(userId: string, todoListId: string): Promise<TodoResult[]> {
    await this.todoLists.findById(userId, todoListId);

    return this.todos.findByTodoListId(todoListId);
  }

  async findById(userId: string, todoId: string): Promise<TodoResult> {
    const { todo } = await this.findByIdWithGroup(userId, todoId);
    return todo;
  }

  async updateCompletion(
    userId: string,
    todoId: string,
    input: UpdateTodoCompletionDto,
  ): Promise<TodoResult> {
    const { todo, groupId, groupType } = await this.findByIdWithGroup(userId, todoId);
    const completedAt = input.completed ? now().toDate() : null;
    const status = input.completed ? TodoStatus.COMPLETED : TodoStatus.ACTIVE;
    const transition = await this.prisma.$transaction(async (transaction) => {
      const transition = await this.todos.updateCompletion(
        todo.id,
        {
          status,
          completedAt,
          updatedById: userId,
        },
        transaction,
      );
      if (!transition.todo) {
        throw this.notFound(todoId, userId);
      }
      const updatedTodo = transition.todo;
      if (transition.transitioned) {
        await this.activities.record(
          {
            groupId,
            actorId: userId,
            type: input.completed ? ActivityType.TODO_COMPLETED : ActivityType.TODO_UNCOMPLETED,
            entityType: ActivityEntityType.TODO,
            entityId: updatedTodo.id,
          },
          transaction,
        );
      }
      return { todo: updatedTodo, transitioned: transition.transitioned };
    });

    if (transition.transitioned && groupType === GroupType.SHARED) {
      await this.publishRealtimeEvent({
        type: TodoListRealtimeEventType.TODO_COMPLETION_CHANGED,
        todoListId: todo.todoListId,
        todoId: transition.todo.id,
      });
    }

    this.logger.log(
      'Todo completion updated',
      { todoId, todoListId: todo.todoListId, userId, completed: input.completed },
      TodoService.name,
    );

    return transition.todo;
  }

  async reorder(userId: string, todoId: string, input: ReorderTodoDto): Promise<TodoResult> {
    if (input.beforeTodoId === todoId) {
      throw new GlobalException(ErrorCode.VALIDATION_ERROR, {
        errors: [{ field: 'beforeTodoId', messages: ['beforeTodoId must differ from todoId'] }],
      });
    }

    const { todo, groupId, groupType } = await this.findByIdWithGroup(userId, todoId);
    const transition = await this.prisma.$transaction(async (transaction) => {
      const result = await this.todos.reorder(
        todo.id,
        todo.todoListId,
        input.beforeTodoId,
        userId,
        transaction,
      );
      if (result.kind === 'notFound') throw this.notFound(todoId, userId);
      if (result.kind === 'invalidAnchor') {
        throw this.notFound(input.beforeTodoId ?? todoId, userId);
      }
      if (result.kind === 'reordered') {
        await this.activities.record(
          {
            groupId,
            actorId: userId,
            type: ActivityType.TODO_REORDERED,
            entityType: ActivityEntityType.TODO,
            entityId: todo.id,
          },
          transaction,
        );
      }
      return result;
    });

    if (transition.kind === 'reordered') {
      if (groupType === GroupType.SHARED) {
        await this.publishRealtimeEvent({
          type: TodoListRealtimeEventType.TODO_REORDERED,
          todoListId: todo.todoListId,
          todoId: transition.todo.id,
        });
      }
      this.logger.log(
        'Todo reordered',
        { todoId, todoListId: todo.todoListId, userId, beforeTodoId: input.beforeTodoId },
        TodoService.name,
      );
    }
    return transition.todo;
  }

  async delete(userId: string, todoId: string): Promise<TodoResult> {
    const { todo, groupId } = await this.findByIdWithGroup(userId, todoId);
    const deletedTodo = await this.prisma.$transaction(async (transaction) => {
      const transition = await this.todos.softDelete(todo.id, now().toDate(), transaction);
      if (!transition.transitioned || !transition.todo) {
        throw this.notFound(todoId, userId);
      }
      await this.activities.record(
        {
          groupId,
          actorId: userId,
          type: ActivityType.TODO_DELETED,
          entityType: ActivityEntityType.TODO,
          entityId: todo.id,
        },
        transaction,
      );
      return transition.todo;
    });

    this.logger.log(
      'Todo deleted',
      { todoId, todoListId: todo.todoListId, userId },
      TodoService.name,
    );
    return deletedTodo;
  }

  async findByIdWithGroup(userId: string, todoId: string): Promise<TodoAccessResult> {
    const todo = await this.todos.findById(todoId);

    if (!todo) {
      throw this.notFound(todoId, userId);
    }

    try {
      const { group, todoList } = await this.todoLists.findByIdWithGroup(userId, todo.todoListId);
      return { todo, groupId: todoList.groupId, groupType: group.type };
    } catch (error: unknown) {
      if (error instanceof GlobalException && error.code === ErrorCode.TODO_LIST_NOT_FOUND) {
        throw this.notFound(todoId, userId);
      }

      throw error;
    }
  }

  private toCreateInput(input: CreateTodoDto): CreateTodoInput {
    return {
      title: input.title,
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.dueDate !== undefined
        ? { dueDate: input.dueDate === null ? null : dayjs(input.dueDate).toDate() }
        : {}),
    };
  }

  private async publishRealtimeEvent(event: TodoListRealtimeEvent): Promise<void> {
    try {
      await this.realtime.publishTodoListEvent(event);
    } catch (error: unknown) {
      this.logger.warn(
        'Realtime publication failed after todo mutation persisted',
        {
          eventType: event.type,
          todoListId: event.todoListId,
          todoId: event.todoId,
          errorMessage: error instanceof Error ? error.message : 'Unknown publication error',
        },
        TodoService.name,
      );
    }
  }

  private notFound(todoId: string, userId: string): GlobalException {
    return new GlobalException(ErrorCode.TASK_NOT_FOUND, { todoId, userId });
  }
}
