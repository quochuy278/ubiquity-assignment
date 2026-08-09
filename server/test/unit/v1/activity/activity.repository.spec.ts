import dayjs from 'dayjs';
import {
  ActivityEntityType,
  ActivityType,
} from '../../../../src/api/v1/activity/activity.constants';
import { ActivityRepository } from '../../../../src/api/v1/activity/repositories/activity.repository';
import type { PrismaService } from '../../../../src/shared/database/prisma/prisma.service';

describe('Activity persistence', () => {
  const create = jest.fn();
  const findMany = jest.fn();
  const prisma = { activityEvent: { create, findMany } } as unknown as PrismaService;
  const repository = new ActivityRepository(prisma);
  const createdAt = dayjs('2026-08-09T10:00:00.000Z').toDate();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps the public actor ID to the existing performedById field', async () => {
    create.mockResolvedValue({
      id: 'activity-1',
      groupId: 'group-1',
      performedById: 'user-1',
      type: ActivityType.TODO_CREATED,
      entityType: ActivityEntityType.TODO,
      entityId: 'todo-1',
      metadata: null,
      createdAt,
    });

    await expect(
      repository.create({
        groupId: 'group-1',
        actorId: 'user-1',
        type: ActivityType.TODO_CREATED,
        entityType: ActivityEntityType.TODO,
        entityId: 'todo-1',
      }),
    ).resolves.toMatchObject({ actorId: 'user-1' });
    expect(create).toHaveBeenCalledWith({
      data: {
        groupId: 'group-1',
        performedById: 'user-1',
        type: ActivityType.TODO_CREATED,
        entityType: ActivityEntityType.TODO,
        entityId: 'todo-1',
      },
    });
  });

  it('reads one extra row in stable newest-first order to produce a cursor', async () => {
    findMany.mockResolvedValue([
      {
        id: 'activity-3',
        groupId: 'group-1',
        performedById: 'user-1',
        type: ActivityType.TODO_COMPLETED,
        entityType: ActivityEntityType.TODO,
        entityId: 'todo-1',
        metadata: null,
        createdAt,
      },
      {
        id: 'activity-2',
        groupId: 'group-1',
        performedById: 'user-1',
        type: ActivityType.TODO_CREATED,
        entityType: ActivityEntityType.TODO,
        entityId: 'todo-1',
        metadata: null,
        createdAt,
      },
      {
        id: 'activity-1',
        groupId: 'group-1',
        performedById: 'user-1',
        type: ActivityType.TODO_LIST_CREATED,
        entityType: ActivityEntityType.TODO_LIST,
        entityId: 'list-1',
        metadata: null,
        createdAt,
      },
    ]);

    await expect(repository.findPage('group-1', 2, 'cursor-0')).resolves.toMatchObject({
      items: [{ id: 'activity-3' }, { id: 'activity-2' }],
      nextCursor: 'activity-2',
    });
    expect(findMany).toHaveBeenCalledWith({
      where: { groupId: 'group-1' },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 3,
      cursor: { id: 'cursor-0' },
      skip: 1,
    });
  });
});
