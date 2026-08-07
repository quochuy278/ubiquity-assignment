import { Injectable } from '@nestjs/common';
import { ErrorCode } from '../../../common/exception/error-code';
import { GlobalException } from '../../../common/exception/global.exception';
import { ApplicationLoggerService } from '../../../common/logger/logger.service';
import { PrismaService } from '../../../shared/database/prisma/prisma.service';
import { MembershipService } from '../membership/membership.service';
import type { CreateGroupDto } from './dto/create-group.dto';
import type { GroupResult } from './group.types';
import { GroupRepository } from './repositories/group.repository';

@Injectable()
export class GroupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly groups: GroupRepository,
    private readonly memberships: MembershipService,
    private readonly logger: ApplicationLoggerService,
  ) {}

  async create(userId: string, input: CreateGroupDto): Promise<GroupResult> {
    const group = await this.prisma.$transaction(async (transaction) => {
      const createdGroup = await this.groups.create(input, userId, transaction);
      await this.memberships.createOwner(createdGroup.id, userId, transaction);

      return createdGroup;
    });

    this.logger.log('Group created', { groupId: group.id, userId }, GroupService.name);

    return group;
  }

  async findForUser(userId: string): Promise<GroupResult[]> {
    const groupIds = await this.memberships.findGroupIds(userId);

    return this.groups.findByIds(groupIds);
  }

  async findById(userId: string, groupId: string): Promise<GroupResult> {
    const isMember = await this.memberships.isMember(groupId, userId);

    if (!isMember) {
      throw new GlobalException(ErrorCode.GROUP_NOT_FOUND, { groupId, userId });
    }

    const group = await this.groups.findById(groupId);

    if (!group) {
      throw new GlobalException(ErrorCode.GROUP_NOT_FOUND, { groupId, userId });
    }

    return group;
  }
}
