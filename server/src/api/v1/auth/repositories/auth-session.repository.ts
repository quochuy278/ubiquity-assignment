import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import type { PublicUser } from '../auth.types';
import { PUBLIC_USER_SELECT } from './auth-repository.constants';

interface CreateSessionInput {
  id: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
}

interface RotateSessionInput {
  id: string;
  currentRefreshTokenHash: string;
  nextRefreshTokenHash: string;
  lastSeenAt: Date;
  expiresAt: Date;
}

export interface RefreshSessionRecord {
  id: string;
  refreshTokenHash: string;
  expiresAt: Date;
  user: PublicUser;
}

@Injectable()
export class AuthSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateSessionInput): Promise<void> {
    await this.prisma.userSession.create({ data: input });
  }

  findById(sessionId: string): Promise<RefreshSessionRecord | null> {
    return this.prisma.userSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        refreshTokenHash: true,
        expiresAt: true,
        user: { select: PUBLIC_USER_SELECT },
      },
    });
  }

  async rotate(input: RotateSessionInput): Promise<boolean> {
    const result = await this.prisma.userSession.updateMany({
      where: {
        id: input.id,
        refreshTokenHash: input.currentRefreshTokenHash,
      },
      data: {
        refreshTokenHash: input.nextRefreshTokenHash,
        lastSeenAt: input.lastSeenAt,
        expiresAt: input.expiresAt,
      },
    });

    return result.count === 1;
  }

  async deleteForUser(sessionId: string, userId: string): Promise<void> {
    await this.prisma.userSession.deleteMany({
      where: { id: sessionId, userId },
    });
  }
}
