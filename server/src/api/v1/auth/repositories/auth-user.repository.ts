import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ErrorCode } from '../../../../common/exception/error-code';
import { GlobalException } from '../../../../common/exception/global.exception';
import { PrismaService } from '../../../../shared/database/prisma/prisma.service';
import type { PublicUser, UserWithPassword } from '../auth.types';
import { PUBLIC_USER_SELECT, USER_WITH_PASSWORD_SELECT } from './auth-repository.constants';

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  displayName: string;
}

@Injectable()
export class AuthUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async emailExists(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    return user !== null;
  }

  findByEmailWithPassword(email: string): Promise<UserWithPassword | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: USER_WITH_PASSWORD_SELECT,
    });
  }

  findByEmail(email: string): Promise<PublicUser | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: PUBLIC_USER_SELECT,
    });
  }

  findById(userId: string): Promise<PublicUser | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: PUBLIC_USER_SELECT,
    });
  }

  async create(input: CreateUserInput): Promise<PublicUser> {
    try {
      return await this.prisma.user.create({
        data: input,
        select: PUBLIC_USER_SELECT,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new GlobalException(ErrorCode.EMAIL_ALREADY_REGISTERED, {
          email: input.email,
        });
      }

      throw error;
    }
  }
}
