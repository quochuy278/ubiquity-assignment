import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiEndpoint } from '../../../shared/openapi/api-endpoint.decorator';
import { ErrorResponseDto } from '../../../shared/openapi/dto/error-response.dto';
import { Session } from '../../../shared/session/session.decorator';
import type { SessionContext } from '../../../shared/session/session.types';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { GroupResponseDto } from '../group/dto/group-response.dto';
import { mapGroupResponse } from '../group/utils/map-group-response';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { InvitationResponseDto } from './dto/invitation-response.dto';
import { PendingInvitationResponseDto } from './dto/pending-invitation-response.dto';
import { InvitationService } from './invitation.service';
import {
  mapInvitationResponse,
  mapPendingInvitationResponse,
} from './utils/map-invitation-response';

@ApiTags('invitations')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller({ version: '1' })
export class InvitationController {
  constructor(private readonly invitations: InvitationService) {}

  @Post('groups/:groupId/invitations')
  @ApiEndpoint({
    operation: { summary: 'Invite a registered user to a shared group' },
    params: [{ name: 'groupId', type: String, description: 'Group ID' }],
    body: { type: CreateInvitationDto, required: true },
    response: {
      status: HttpStatus.CREATED,
      description: 'The invitation was created successfully',
      type: InvitationResponseDto,
    },
    responses: [
      {
        status: HttpStatus.UNAUTHORIZED,
        description: 'The access token is missing or invalid',
        type: ErrorResponseDto,
      },
      {
        status: HttpStatus.FORBIDDEN,
        description: 'Only the group owner may create invitations',
        type: ErrorResponseDto,
      },
      {
        status: HttpStatus.CONFLICT,
        description: 'The group or invitation state does not allow this invitation',
        type: ErrorResponseDto,
      },
    ],
    notFound: { description: 'The group or invitee was not found' },
  })
  async create(
    @Session() session: SessionContext,
    @Param('groupId') groupId: string,
    @Body() input: CreateInvitationDto,
  ): Promise<InvitationResponseDto> {
    return mapInvitationResponse(await this.invitations.create(session.userId, groupId, input));
  }

  @Get('invitations')
  @ApiEndpoint({
    operation: { summary: "Get the authenticated user's pending invitations" },
    response: {
      status: HttpStatus.OK,
      description: 'Pending invitations were retrieved successfully',
      type: PendingInvitationResponseDto,
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
  async findPending(@Session() session: SessionContext): Promise<PendingInvitationResponseDto[]> {
    const invitations = await this.invitations.findPendingForUser(session.userId);
    return invitations.map(mapPendingInvitationResponse);
  }

  @Post('invitations/:token/accept')
  @HttpCode(HttpStatus.OK)
  @ApiEndpoint({
    operation: { summary: 'Accept a pending group invitation' },
    params: [{ name: 'token', type: String, description: 'Invitation token' }],
    response: {
      status: HttpStatus.OK,
      description: 'The invitation was accepted successfully',
      type: GroupResponseDto,
    },
    responses: [
      {
        status: HttpStatus.UNAUTHORIZED,
        description: 'The access token is missing or invalid',
        type: ErrorResponseDto,
      },
      {
        status: HttpStatus.CONFLICT,
        description: 'The user is already a member of the group',
        type: ErrorResponseDto,
      },
    ],
    notFound: { description: 'A pending invitation was not found for the authenticated user' },
  })
  async accept(
    @Session() session: SessionContext,
    @Param('token') token: string,
  ): Promise<GroupResponseDto> {
    return mapGroupResponse(await this.invitations.accept(session.userId, token));
  }
}
