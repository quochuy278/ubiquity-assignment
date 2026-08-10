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
import { CreateSubTaskDto } from './dto/create-subtask.dto';
import { SubTaskResponseDto } from './dto/subtask-response.dto';
import { UpdateSubTaskCompletionDto } from './dto/update-subtask-completion.dto';
import { SubTaskService } from './subtask.service';
import { mapSubTaskResponse } from './utils/map-subtask-response';

@ApiTags('subtasks')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller({ version: '1' })
export class SubTaskController {
  constructor(private readonly subtasks: SubTaskService) {}

  @Post('todos/:todoId/subtasks')
  @ApiEndpoint({
    operation: { summary: 'Create a subtask within a todo' },
    params: [{ name: 'todoId', type: String, description: 'Todo ID' }],
    body: { type: CreateSubTaskDto, required: true },
    response: {
      status: HttpStatus.CREATED,
      description: 'The subtask was created successfully',
      type: SubTaskResponseDto,
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
  async create(
    @Session() session: SessionContext,
    @Param('todoId') todoId: string,
    @Body() input: CreateSubTaskDto,
  ): Promise<SubTaskResponseDto> {
    return mapSubTaskResponse(await this.subtasks.create(session.userId, todoId, input));
  }

  @Get('todos/:todoId/subtasks')
  @ApiEndpoint({
    operation: { summary: 'Get the subtasks belonging to a todo' },
    params: [{ name: 'todoId', type: String, description: 'Todo ID' }],
    response: {
      status: HttpStatus.OK,
      description: 'The subtasks were retrieved successfully',
      type: SubTaskResponseDto,
      isArray: true,
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
  async findForTodo(
    @Session() session: SessionContext,
    @Param('todoId') todoId: string,
  ): Promise<SubTaskResponseDto[]> {
    const subtasks = await this.subtasks.findForTodo(session.userId, todoId);
    return subtasks.map(mapSubTaskResponse);
  }

  @Get('subtasks/:subtaskId')
  @ApiEndpoint({
    operation: { summary: 'Get a subtask by ID' },
    params: [{ name: 'subtaskId', type: String, description: 'Subtask ID' }],
    response: {
      status: HttpStatus.OK,
      description: 'The subtask was retrieved successfully',
      type: SubTaskResponseDto,
    },
    responses: [
      {
        status: HttpStatus.UNAUTHORIZED,
        description: 'The access token is missing or invalid',
        type: ErrorResponseDto,
      },
    ],
    notFound: { description: 'The subtask was not found' },
  })
  async findById(
    @Session() session: SessionContext,
    @Param('subtaskId') subtaskId: string,
  ): Promise<SubTaskResponseDto> {
    return mapSubTaskResponse(await this.subtasks.findById(session.userId, subtaskId));
  }

  @Patch('subtasks/:subtaskId/completion')
  @ApiEndpoint({
    operation: { summary: "Update a subtask's completion state" },
    params: [{ name: 'subtaskId', type: String, description: 'Subtask ID' }],
    body: { type: UpdateSubTaskCompletionDto, required: true },
    response: {
      status: HttpStatus.OK,
      description: 'The subtask completion state was updated successfully',
      type: SubTaskResponseDto,
    },
    responses: [
      {
        status: HttpStatus.UNAUTHORIZED,
        description: 'The access token is missing or invalid',
        type: ErrorResponseDto,
      },
    ],
    notFound: { description: 'The subtask was not found' },
  })
  async updateCompletion(
    @Session() session: SessionContext,
    @Param('subtaskId') subtaskId: string,
    @Body() input: UpdateSubTaskCompletionDto,
  ): Promise<SubTaskResponseDto> {
    return mapSubTaskResponse(
      await this.subtasks.updateCompletion(session.userId, subtaskId, input),
    );
  }

  @Delete('subtasks/:subtaskId')
  @ApiEndpoint({
    operation: { summary: 'Delete a subtask' },
    params: [{ name: 'subtaskId', type: String, description: 'Subtask ID' }],
    response: {
      status: HttpStatus.OK,
      description: 'The subtask was deleted successfully',
      type: SubTaskResponseDto,
    },
    responses: [
      {
        status: HttpStatus.UNAUTHORIZED,
        description: 'The access token is missing or invalid',
        type: ErrorResponseDto,
      },
    ],
    notFound: { description: 'The subtask was not found' },
  })
  async delete(
    @Session() session: SessionContext,
    @Param('subtaskId') subtaskId: string,
  ): Promise<SubTaskResponseDto> {
    return mapSubTaskResponse(await this.subtasks.delete(session.userId, subtaskId));
  }
}
