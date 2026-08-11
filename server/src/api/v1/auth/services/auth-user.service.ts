import { Injectable } from '@nestjs/common';
import type { PublicUser, UserWithPassword } from '../auth.types';
import { AuthUserRepository, type CreateUserInput } from '../repositories/auth-user.repository';

@Injectable()
export class AuthUserService {
  constructor(private readonly users: AuthUserRepository) {}

  emailExists(email: string): Promise<boolean> {
    return this.users.emailExists(email);
  }

  findByEmailWithPassword(email: string): Promise<UserWithPassword | null> {
    return this.users.findByEmailWithPassword(email);
  }

  findByEmail(email: string): Promise<PublicUser | null> {
    return this.users.findByEmail(email);
  }

  findById(userId: string): Promise<PublicUser | null> {
    return this.users.findById(userId);
  }

  create(input: CreateUserInput): Promise<PublicUser> {
    return this.users.create(input);
  }
}
