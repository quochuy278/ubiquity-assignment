import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';
import { ErrorCode } from '../../../common/exception/error-code';
import { GlobalException } from '../../../common/exception/global.exception';
import { ApplicationLoggerService } from '../../../common/logger/logger.service';
import { now } from '../../../shared/utils/time.utilities';
import { TodoListService } from '../todo-list/todo-list.service';
import type { CreateTodoDto } from './dto/create-todo.dto';
import type { UpdateTodoCompletionDto } from './dto/update-todo-completion.dto';
import { TodoRepository } from './repositories/todo.repository';
import { TodoStatus } from './todo.constants';
import type { CreateTodoInput, TodoResult } from './todo.types';

@Injectable()
export class TodoService {
  constructor(
    private readonly todos: TodoRepository,
    private readonly todoLists: TodoListService,
    private readonly logger: ApplicationLoggerService,
  ) {}

  async create(userId: string, todoListId: string, input: CreateTodoDto): Promise<TodoResult> {
    await this.todoLists.findById(userId, todoListId);

    const todo = await this.todos.create(todoListId, userId, this.toCreateInput(input));

    this.logger.log('Todo created', { todoId: todo.id, todoListId, userId }, TodoService.name);

    return todo;
  }

  async findForTodoList(userId: string, todoListId: string): Promise<TodoResult[]> {
    await this.todoLists.findById(userId, todoListId);

    return this.todos.findByTodoListId(todoListId);
  }

  async findById(userId: string, todoId: string): Promise<TodoResult> {
    return this.findAccessibleTodo(userId, todoId);
  }

  async updateCompletion(
    userId: string,
    todoId: string,
    input: UpdateTodoCompletionDto,
  ): Promise<TodoResult> {
    const todo = await this.findAccessibleTodo(userId, todoId);
    const completedAt = input.completed ? now().toDate() : null;
    const status = input.completed ? TodoStatus.COMPLETED : TodoStatus.ACTIVE;
    const updatedTodo = await this.todos.updateCompletion(todo.id, {
      status,
      completedAt,
      updatedById: userId,
    });

    this.logger.log(
      'Todo completion updated',
      { todoId, todoListId: todo.todoListId, userId, completed: input.completed },
      TodoService.name,
    );

    return updatedTodo;
  }

  private async findAccessibleTodo(userId: string, todoId: string): Promise<TodoResult> {
    const todo = await this.todos.findById(todoId);

    if (!todo) {
      throw this.notFound(todoId, userId);
    }

    try {
      await this.todoLists.findById(userId, todo.todoListId);
    } catch (error: unknown) {
      if (error instanceof GlobalException && error.code === ErrorCode.TODO_LIST_NOT_FOUND) {
        throw this.notFound(todoId, userId);
      }

      throw error;
    }

    return todo;
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

  private notFound(todoId: string, userId: string): GlobalException {
    return new GlobalException(ErrorCode.TASK_NOT_FOUND, { todoId, userId });
  }
}
