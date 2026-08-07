import dayjs from 'dayjs';
import type { PublicUser, UserWithPassword } from '../../src/api/v1/auth/auth.types';

export function createPublicUserFixture(overrides: Partial<PublicUser> = {}): PublicUser {
  return {
    id: 'user-1',
    email: 'alex@example.com',
    displayName: 'Alex',
    avatarUrl: null,
    createdAt: dayjs('2026-08-01T10:00:00.000Z').toDate(),
    updatedAt: dayjs('2026-08-01T10:00:00.000Z').toDate(),
    ...overrides,
  };
}

export function createUserWithPasswordFixture(
  overrides: Partial<UserWithPassword> = {},
): UserWithPassword {
  return {
    ...createPublicUserFixture(overrides),
    passwordHash: 'password-hash',
    ...overrides,
  };
}
