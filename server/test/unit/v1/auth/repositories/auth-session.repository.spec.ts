import dayjs from 'dayjs';
import { AuthSessionRepository } from '../../../../../src/api/v1/auth/repositories/auth-session.repository';
import type { PrismaService } from '../../../../../src/shared/database/prisma/prisma.service';

describe('Authentication session persistence', () => {
  const create = jest.fn();
  const findUnique = jest.fn();
  const updateMany = jest.fn();
  const prisma = {
    userSession: { create, findUnique, updateMany },
  } as unknown as PrismaService;
  const sessions = new AuthSessionRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists session data without returning persistence details to the service', async () => {
    const input = {
      id: 'session-1',
      userId: 'user-1',
      refreshTokenHash: 'refresh-hash',
      expiresAt: dayjs('2026-09-06T12:00:00.000Z').toDate(),
    };
    create.mockResolvedValue({ id: 'session-1' });

    await expect(sessions.create(input)).resolves.toBeUndefined();
    expect(create).toHaveBeenCalledWith({ data: input });
  });

  it('uses compare-and-swap semantics when rotating a refresh session', async () => {
    const lastSeenAt = dayjs('2026-08-07T12:00:00.000Z').toDate();
    const expiresAt = dayjs('2026-09-06T12:00:00.000Z').toDate();
    updateMany.mockResolvedValue({ count: 1 });

    await expect(
      sessions.rotate({
        id: 'session-1',
        currentRefreshTokenHash: 'old-hash',
        nextRefreshTokenHash: 'next-hash',
        lastSeenAt,
        expiresAt,
      }),
    ).resolves.toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'session-1', refreshTokenHash: 'old-hash' },
      data: {
        refreshTokenHash: 'next-hash',
        lastSeenAt,
        expiresAt,
      },
    });
  });

  it('reports a failed rotation when another request already changed the token hash', async () => {
    updateMany.mockResolvedValue({ count: 0 });

    await expect(
      sessions.rotate({
        id: 'session-1',
        currentRefreshTokenHash: 'old-hash',
        nextRefreshTokenHash: 'next-hash',
        lastSeenAt: dayjs('2026-08-07T12:00:00.000Z').toDate(),
        expiresAt: dayjs('2026-09-06T12:00:00.000Z').toDate(),
      }),
    ).resolves.toBe(false);
  });
});
