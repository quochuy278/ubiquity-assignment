import { Controller, Get, HttpStatus, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiEndpoint } from '../../../shared/openapi/api-endpoint.decorator';
import { ErrorResponseDto } from '../../../shared/openapi/dto/error-response.dto';
import { Session } from '../../../shared/session/session.decorator';
import type { SessionContext } from '../../../shared/session/session.types';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { MAX_ACTIVITY_PAGE_SIZE } from './activity.constants';
import { ActivityService } from './activity.service';
import { ActivityQueryDto } from './dto/activity-query.dto';
import { ActivityPageResponseDto } from './dto/activity-response.dto';
import { mapActivityPageResponse } from './utils/map-activity-response';

@ApiTags('activities')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller({ version: '1' })
export class ActivityController {
  constructor(private readonly activities: ActivityService) {}

  @Get('groups/:groupId/activities')
  @ApiEndpoint({
    operation: { summary: 'Get activity history for a group' },
    params: [{ name: 'groupId', type: String, description: 'Group ID' }],
    queries: [
      { name: 'cursor', type: String, required: false, description: 'Previous page cursor' },
      {
        name: 'limit',
        type: Number,
        required: false,
        description: `Page size, up to ${MAX_ACTIVITY_PAGE_SIZE}`,
      },
    ],
    response: {
      status: HttpStatus.OK,
      description: 'The group activity history was retrieved successfully',
      type: ActivityPageResponseDto,
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
    @Query() query: ActivityQueryDto,
  ): Promise<ActivityPageResponseDto> {
    const page = await this.activities.findForGroup(
      session.userId,
      groupId,
      query.limit,
      query.cursor,
    );
    return mapActivityPageResponse(page);
  }
}
