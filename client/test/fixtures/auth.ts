import type { AuthResponseDto, UserResponseDto } from '@/api/generated';

export const testUser: UserResponseDto = {
  id: 'user-1',
  email: 'alex@example.com',
  displayName: 'Alex',
  avatarUrl: null,
  createdAt: '2026-08-10T10:00:00.000Z',
  updatedAt: '2026-08-10T10:00:00.000Z',
};

export function createAuthResponse(
  accessToken = 'access-token',
  refreshToken = 'refresh-token',
): AuthResponseDto {
  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: 900,
    user: testUser,
  };
}
