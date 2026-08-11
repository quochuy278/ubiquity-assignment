import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import dayjs from 'dayjs';
import { ErrorCode } from '../../../common/exception/error-code';
import { GlobalException } from '../../../common/exception/global.exception';
import { ApplicationLoggerService } from '../../../common/logger/logger.service';
import { PrismaService } from '../../../shared/database/prisma/prisma.service';
import { AuthUserService } from '../auth/services/auth-user.service';
import { normalizeEmail } from '../auth/utils/normalize-email';
import { GroupType } from '../group/group.constants';
import { GroupService } from '../group/group.service';
import type { GroupResult } from '../group/group.types';
import { MembershipRole } from '../membership/membership.constants';
import { MembershipService } from '../membership/membership.service';
import type { CreateInvitationDto } from './dto/create-invitation.dto';
import { INVITATION_EXPIRATION_DAYS, InvitationStatus } from './invitation.constants';
import type { InvitationResult, PendingInvitationResult } from './invitation.types';
import { InvitationRepository } from './repositories/invitation.repository';

@Injectable()
export class InvitationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invitations: InvitationRepository,
    private readonly groups: GroupService,
    private readonly memberships: MembershipService,
    private readonly users: AuthUserService,
    private readonly logger: ApplicationLoggerService,
  ) {}

  async create(
    invitedById: string,
    groupId: string,
    input: CreateInvitationDto,
  ): Promise<InvitationResult> {
    const group = await this.groups.findById(invitedById, groupId);
    if (group.currentUserRole !== MembershipRole.OWNER) {
      throw new GlobalException(ErrorCode.INVITATION_FORBIDDEN, { groupId, invitedById });
    }
    if (group.type !== GroupType.SHARED) {
      throw new GlobalException(ErrorCode.INVITATION_NOT_ALLOWED, { groupId });
    }

    const email = normalizeEmail(input.email);
    const invitee = await this.users.findByEmail(email);
    if (!invitee) {
      throw new GlobalException(ErrorCode.INVITEE_NOT_FOUND, { groupId, email });
    }
    if (await this.memberships.isMember(groupId, invitee.id)) {
      throw new GlobalException(ErrorCode.GROUP_MEMBER_ALREADY_EXISTS, {
        groupId,
        userId: invitee.id,
      });
    }

    const now = new Date();
    const existing = await this.invitations.findByGroupAndEmail(groupId, email);
    const invitation = existing
      ? await this.refreshOrReject(existing, invitedById, now)
      : await this.createOrResolveRace(groupId, invitedById, email, now);

    this.logger.log(
      'Group invitation created',
      { invitationId: invitation.id, groupId, invitedById },
      InvitationService.name,
    );
    return invitation;
  }

  async findPendingForUser(userId: string): Promise<PendingInvitationResult[]> {
    const user = await this.users.findById(userId);
    if (!user) throw new GlobalException(ErrorCode.UNAUTHORIZED, { userId });

    return this.invitations.findPendingForEmail(normalizeEmail(user.email), new Date());
  }

  async accept(userId: string, token: string): Promise<GroupResult> {
    const user = await this.users.findById(userId);
    if (!user) throw new GlobalException(ErrorCode.UNAUTHORIZED, { userId });
    const email = normalizeEmail(user.email);
    const now = new Date();

    let groupId: string;
    try {
      groupId = await this.prisma.$transaction(async (transaction) => {
        const invitation = await this.invitations.findByToken(token, transaction);
        if (
          !invitation ||
          invitation.status !== InvitationStatus.PENDING ||
          invitation.expiresAt <= now ||
          invitation.email !== email
        ) {
          throw new GlobalException(ErrorCode.INVITATION_NOT_FOUND, { userId });
        }
        if (await this.memberships.isMember(invitation.groupId, userId, transaction)) {
          throw new GlobalException(ErrorCode.GROUP_MEMBER_ALREADY_EXISTS, {
            groupId: invitation.groupId,
            userId,
          });
        }

        const accepted = await this.invitations.acceptIfPending(invitation.id, now, transaction);
        if (!accepted) {
          throw new GlobalException(ErrorCode.INVITATION_NOT_FOUND, { userId });
        }
        await this.memberships.createMember(invitation.groupId, userId, transaction);
        return invitation.groupId;
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new GlobalException(
          ErrorCode.GROUP_MEMBER_ALREADY_EXISTS,
          { userId },
          { cause: error },
        );
      }
      throw error;
    }

    this.logger.log('Group invitation accepted', { groupId, userId }, InvitationService.name);
    return this.groups.findById(userId, groupId);
  }

  private async createOrResolveRace(
    groupId: string,
    invitedById: string,
    email: string,
    now: Date,
  ): Promise<InvitationResult> {
    try {
      return await this.invitations.create({
        groupId,
        invitedById,
        email,
        token: this.createToken(),
        expiresAt: this.createExpiration(now),
      });
    } catch (error: unknown) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        throw error;
      }
      const existing = await this.invitations.findByGroupAndEmail(groupId, email);
      if (!existing) throw error;
      return this.refreshOrReject(existing, invitedById, now);
    }
  }

  private async refreshOrReject(
    existing: InvitationResult,
    invitedById: string,
    now: Date,
  ): Promise<InvitationResult> {
    if (existing.expiresAt > now) {
      throw new GlobalException(ErrorCode.INVITATION_ALREADY_PENDING, {
        groupId: existing.groupId,
        email: existing.email,
      });
    }

    const refreshed = await this.invitations.refreshExpired(existing.id, now, {
      invitedById,
      token: this.createToken(),
      expiresAt: this.createExpiration(now),
    });
    if (!refreshed) {
      throw new GlobalException(ErrorCode.INVITATION_ALREADY_PENDING, {
        groupId: existing.groupId,
        email: existing.email,
      });
    }
    return refreshed;
  }

  private createToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private createExpiration(now: Date): Date {
    return dayjs(now).add(INVITATION_EXPIRATION_DAYS, 'day').toDate();
  }
}
