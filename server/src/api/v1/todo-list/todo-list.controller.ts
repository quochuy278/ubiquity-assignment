import { Body, Controller, Get, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiEndpoint } from '../../../shared/openapi/api-endpoint.decorator';
import { ErrorResponseDto } from '../../../shared/openapi/dto/error-response.dto';
import { Session } from '../../../shared/session/session.decorator';
import type { SessionContext } from '../../../shared/session/session.types';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { CreateTodoListDto } from './dto/create-todo-list.dto';
import { TodoListResponseDto } from './dto/todo-list-response.dto';
import { TodoListService } from './todo-list.service';
import { mapTodoListResponse } from './utils/map-todo-list-response';

@ApiTags('todo-lists')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller({ version: '1' })
export class TodoListController {
  constructor(private readonly todoLists: TodoListService) {}

  @Post('groups/:groupId/lists')
  @ApiEndpoint({
    operation: { summary: 'Create a todo list within a group' },
    params: [{ name: 'groupId', type: String, description: 'Group ID' }],
    body: { type: CreateTodoListDto, required: true },
    response: {
      status: HttpStatus.CREATED,
      description: 'The todo list was created successfully',
      type: TodoListResponseDto,
    },
    responses: [
      {
        status: HttpStatus.UNAUTHORIZED,
        description: 'The access token is missing or invalid',
        type: ErrorResponseDto,
      },
    ],
    notFound: { description: 'The group was not found' },
  })
  async create(
    @Session() session: SessionContext,
    @Param('groupId') groupId: string,
    @Body() input: CreateTodoListDto,
  ): Promise<TodoListResponseDto> {
    const todoList = await this.todoLists.create(session.userId, groupId, input);

    return mapTodoListResponse(todoList);
  }

  @Get('groups/:groupId/lists')
  @ApiEndpoint({
    operation: { summary: 'Get the todo lists belonging to a group' },
    params: [{ name: 'groupId', type: String, description: 'Group ID' }],
    response: {
      status: HttpStatus.OK,
      description: 'The todo lists were retrieved successfully',
      type: TodoListResponseDto,
      isArray: true,
    },
    responses: [
      {
        status: HttpStatus.UNAUTHORIZED,
        description: 'The access token is missing or invalid',
        type: ErrorResponseDto,
      },
    ],
    notFound: { description: 'The group was not found' },
  })
  async findForGroup(
    @Session() session: SessionContext,
    @Param('groupId') groupId: string,
  ): Promise<TodoListResponseDto[]> {
    const todoLists = await this.todoLists.findForGroup(session.userId, groupId);

    return todoLists.map(mapTodoListResponse);
  }

  @Get('lists/:todoListId')
  @ApiEndpoint({
    operation: { summary: 'Get a todo list by ID' },
    params: [{ name: 'todoListId', type: String, description: 'Todo list ID' }],
    response: {
      status: HttpStatus.OK,
      description: 'The todo list was retrieved successfully',
      type: TodoListResponseDto,
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
  async findById(
    @Session() session: SessionContext,
    @Param('todoListId') todoListId: string,
  ): Promise<TodoListResponseDto> {
    const todoList = await this.todoLists.findById(session.userId, todoListId);

    return mapTodoListResponse(todoList);
  }
}
