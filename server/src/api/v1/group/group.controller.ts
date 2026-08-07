import { Body, Controller, Get, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiEndpoint } from '../../../shared/openapi/api-endpoint.decorator';
import { ErrorResponseDto } from '../../../shared/openapi/dto/error-response.dto';
import { Session } from '../../../shared/session/session.decorator';
import type { SessionContext } from '../../../shared/session/session.types';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { CreateGroupDto } from './dto/create-group.dto';
import { GroupResponseDto } from './dto/group-response.dto';
import { GroupService } from './group.service';
import { mapGroupResponse } from './utils/map-group-response';

@ApiTags('groups')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller({ path: 'groups', version: '1' })
export class GroupController {
  constructor(private readonly groups: GroupService) {}

  @Get()
  @ApiEndpoint({
    operation: { summary: "Get the authenticated user's groups" },
    response: {
      status: HttpStatus.OK,
      description: 'The groups were retrieved successfully',
      type: GroupResponseDto,
      isArray: true,
    },
    responses: [
      {
        status: HttpStatus.UNAUTHORIZED,
        description: 'The access token is missing or invalid',
        type: ErrorResponseDto,
      },
    ],
  })
  async findForUser(@Session() session: SessionContext): Promise<GroupResponseDto[]> {
    const groups = await this.groups.findForUser(session.userId);

    return groups.map(mapGroupResponse);
  }

  @Get(':groupId')
  @ApiEndpoint({
    operation: { summary: 'Get a group by ID' },
    params: [{ name: 'groupId', type: String, description: 'Group ID' }],
    response: {
      status: HttpStatus.OK,
      description: 'The group was retrieved successfully',
      type: GroupResponseDto,
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
  async findById(
    @Session() session: SessionContext,
    @Param('groupId') groupId: string,
  ): Promise<GroupResponseDto> {
    const group = await this.groups.findById(session.userId, groupId);

    return mapGroupResponse(group);
  }

  @Post()
  @ApiEndpoint({
    operation: { summary: 'Create a group' },
    body: { type: CreateGroupDto, required: true },
    response: {
      status: HttpStatus.CREATED,
      description: 'The group was created successfully',
      type: GroupResponseDto,
    },
    responses: [
      {
        status: HttpStatus.UNAUTHORIZED,
        description: 'The access token is missing or invalid',
        type: ErrorResponseDto,
      },
    ],
  })
  async create(
    @Session() session: SessionContext,
    @Body() input: CreateGroupDto,
  ): Promise<GroupResponseDto> {
    const group = await this.groups.create(session.userId, input);

    return mapGroupResponse(group);
  }
}
