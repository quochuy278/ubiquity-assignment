import { Injectable } from '@nestjs/common';
import { ErrorCode } from '../../../common/exception/error-code';
import { GlobalException } from '../../../common/exception/global.exception';
import { ApplicationLoggerService } from '../../../common/logger/logger.service';
import { GroupService } from '../group/group.service';
import type { CreateTodoListDto } from './dto/create-todo-list.dto';
import { TodoListRepository } from './repositories/todo-list.repository';
import type { TodoListResult } from './todo-list.types';

@Injectable()
export class TodoListService {
  constructor(
    private readonly todoLists: TodoListRepository,
    private readonly groups: GroupService,
    private readonly logger: ApplicationLoggerService,
  ) {}

  async create(userId: string, groupId: string, input: CreateTodoListDto): Promise<TodoListResult> {
    await this.groups.findById(userId, groupId);

    const todoList = await this.todoLists.create(groupId, input);

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

  private notFound(todoListId: string, userId: string): GlobalException {
    return new GlobalException(ErrorCode.TODO_LIST_NOT_FOUND, { todoListId, userId });
  }
}
