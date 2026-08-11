import { Injectable } from '@nestjs/common';
import type { Invitation, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import { isGroupType } from '../../group/group.constants';
import { InvitationStatus } from '../invitation.constants';
import type { InvitationResult, PendingInvitationResult } from '../invitation.types';

export interface CreateInvitationInput {
  groupId: string;
  invitedById: string;
  email: string;
  token: string;
  expiresAt: Date;
}

@Injectable()
export class InvitationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateInvitationInput): Promise<InvitationResult> {
    const invitation = await this.prisma.invitation.create({
      data: { ...input, status: InvitationStatus.PENDING },
    });
    return this.toInvitationResult(invitation);
  }

  async findByGroupAndEmail(groupId: string, email: string): Promise<InvitationResult | null> {
    const invitation = await this.prisma.invitation.findUnique({
      where: { groupId_email: { groupId, email } },
    });
    return invitation ? this.toInvitationResult(invitation) : null;
  }

  async refreshExpired(
    invitationId: string,
    now: Date,
    input: Pick<CreateInvitationInput, 'invitedById' | 'token' | 'expiresAt'>,
  ): Promise<InvitationResult | null> {
    const refreshed = await this.prisma.invitation.updateMany({
      where: { id: invitationId, expiresAt: { lte: now } },
      data: { ...input, status: InvitationStatus.PENDING },
    });
    if (refreshed.count !== 1) return null;

    const invitation = await this.prisma.invitation.findUniqueOrThrow({
      where: { id: invitationId },
    });
    return this.toInvitationResult(invitation);
  }

  async findPendingForEmail(email: string, now: Date): Promise<PendingInvitationResult[]> {
    const invitations = await this.prisma.invitation.findMany({
      where: { email, status: InvitationStatus.PENDING, expiresAt: { gt: now } },
      include: {
        group: { select: { id: true, name: true, type: true } },
        inviter: { select: { id: true, displayName: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });

    return invitations.map((invitation) => {
      if (!isGroupType(invitation.group.type)) {
        throw new Error(`Unsupported persisted group type: ${invitation.group.type}`);
      }
      return {
        ...this.toInvitationResult(invitation),
        group: { ...invitation.group, type: invitation.group.type },
        inviter: invitation.inviter,
      };
    });
  }

  async findByToken(
    token: string,
    transaction: Prisma.TransactionClient,
  ): Promise<InvitationResult | null> {
    const invitation = await transaction.invitation.findUnique({ where: { token } });
    return invitation ? this.toInvitationResult(invitation) : null;
  }

  async acceptIfPending(
    invitationId: string,
    now: Date,
    transaction: Prisma.TransactionClient,
  ): Promise<boolean> {
    const result = await transaction.invitation.updateMany({
      where: {
        id: invitationId,
        status: InvitationStatus.PENDING,
        expiresAt: { gt: now },
      },
      data: { status: InvitationStatus.ACCEPTED },
    });
    return result.count === 1;
  }

  private toInvitationResult(invitation: Invitation): InvitationResult {
    if (!Object.values(InvitationStatus).includes(invitation.status as InvitationStatus)) {
      throw new Error(`Unsupported persisted invitation status: ${invitation.status}`);
    }
    return { ...invitation, status: invitation.status as InvitationStatus };
  }
}
