import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiEndpoint } from '../../../shared/openapi/api-endpoint.decorator';
import { ErrorResponseDto } from '../../../shared/openapi/dto/error-response.dto';
import { Session } from '../../../shared/session/session.decorator';
import type { SessionContext } from '../../../shared/session/session.types';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { CreateTodoDto } from './dto/create-todo.dto';
import { TodoResponseDto } from './dto/todo-response.dto';
import { UpdateTodoCompletionDto } from './dto/update-todo-completion.dto';
import { TodoService } from './todo.service';
import { mapTodoResponse } from './utils/map-todo-response';

@ApiTags('todos')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller({ version: '1' })
export class TodoController {
  constructor(private readonly todos: TodoService) {}

  @Post('lists/:todoListId/todos')
  @ApiEndpoint({
    operation: { summary: 'Create a todo within a todo list' },
    params: [{ name: 'todoListId', type: String, description: 'Todo list ID' }],
    body: { type: CreateTodoDto, required: true },
    response: {
      status: HttpStatus.CREATED,
      description: 'The todo was created successfully',
      type: TodoResponseDto,
    },
    responses: [
      {
        status: HttpStatus.UNAUTHORIZED,
        description: 'The access token is missing or invalid',
        type: ErrorResponseDto,
      },
    ],
    notFound: { description: 'The todo list was not found' },
  })
  async create(
    @Session() session: SessionContext,
    @Param('todoListId') todoListId: string,
    @Body() input: CreateTodoDto,
  ): Promise<TodoResponseDto> {
    const todo = await this.todos.create(session.userId, todoListId, input);

    return mapTodoResponse(todo);
  }

  @Get('lists/:todoListId/todos')
  @ApiEndpoint({
    operation: { summary: 'Get the todos belonging to a todo list' },
    params: [{ name: 'todoListId', type: String, description: 'Todo list ID' }],
    response: {
      status: HttpStatus.OK,
      description: 'The todos were retrieved successfully',
      type: TodoResponseDto,
      isArray: true,
    },
    responses: [
      {
        status: HttpStatus.UNAUTHORIZED,
        description: 'The access token is missing or invalid',
        type: ErrorResponseDto,
      },
    ],
    notFound: { description: 'The todo list was not found' },
  })
  async findForTodoList(
    @Session() session: SessionContext,
    @Param('todoListId') todoListId: string,
  ): Promise<TodoResponseDto[]> {
    const todos = await this.todos.findForTodoList(session.userId, todoListId);

    return todos.map(mapTodoResponse);
  }

  @Get('todos/:todoId')
  @ApiEndpoint({
    operation: { summary: 'Get a todo by ID' },
    params: [{ name: 'todoId', type: String, description: 'Todo ID' }],
    response: {
      status: HttpStatus.OK,
      description: 'The todo was retrieved successfully',
      type: TodoResponseDto,
    },
    responses: [
      {
        status: HttpStatus.UNAUTHORIZED,
        description: 'The access token is missing or invalid',
        type: ErrorResponseDto,
      },
    ],
    notFound: { description: 'The todo was not found' },
  })
  async findById(
    @Session() session: SessionContext,
    @Param('todoId') todoId: string,
  ): Promise<TodoResponseDto> {
    const todo = await this.todos.findById(session.userId, todoId);

    return mapTodoResponse(todo);
  }

  @Patch('todos/:todoId/completion')
  @ApiEndpoint({
    operation: { summary: "Update a todo's completion state" },
    params: [{ name: 'todoId', type: String, description: 'Todo ID' }],
    body: { type: UpdateTodoCompletionDto, required: true },
    response: {
      status: HttpStatus.OK,
      description: 'The todo completion state was updated successfully',
      type: TodoResponseDto,
    },
    responses: [
      {
        status: HttpStatus.UNAUTHORIZED,
        description: 'The access token is missing or invalid',
        type: ErrorResponseDto,
      },
    ],
    notFound: { description: 'The todo was not found' },
  })
  async updateCompletion(
    @Session() session: SessionContext,
    @Param('todoId') todoId: string,
    @Body() input: UpdateTodoCompletionDto,
  ): Promise<TodoResponseDto> {
    const todo = await this.todos.updateCompletion(session.userId, todoId, input);

    return mapTodoResponse(todo);
  }

  @Delete('todos/:todoId')
  @ApiEndpoint({
    operation: { summary: 'Delete a todo' },
    params: [{ name: 'todoId', type: String, description: 'Todo ID' }],
    response: {
      status: HttpStatus.OK,
      description: 'The todo was deleted successfully',
      type: TodoResponseDto,
    },
    responses: [
      {
        status: HttpStatus.UNAUTHORIZED,
        description: 'The access token is missing or invalid',
        type: ErrorResponseDto,
      },
    ],
    notFound: { description: 'The todo was not found' },
  })
  async delete(
    @Session() session: SessionContext,
    @Param('todoId') todoId: string,
  ): Promise<TodoResponseDto> {
    return mapTodoResponse(await this.todos.delete(session.userId, todoId));
  }
}
