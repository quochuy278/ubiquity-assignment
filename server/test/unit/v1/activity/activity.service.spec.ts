import { ActivityService } from '../../../../src/api/v1/activity/activity.service';
import type { ActivityRepository } from '../../../../src/api/v1/activity/repositories/activity.repository';
import type { GroupService } from '../../../../src/api/v1/group/group.service';

describe('Activity use-case authorization', () => {
  const findGroupById = jest.fn();
  const findPage = jest.fn();
  const repository = { findPage } as unknown as ActivityRepository;
  const groups = { findById: findGroupById } as unknown as GroupService;
  const service = new ActivityService(repository, groups);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('authorizes group membership before reading a page', async () => {
    const page = { items: [], nextCursor: null };
    findGroupById.mockResolvedValue({ id: 'group-1' });
    findPage.mockResolvedValue(page);

    await expect(service.findForGroup('user-1', 'group-1', 25, 'cursor-1')).resolves.toBe(page);
    expect(findGroupById).toHaveBeenCalledWith('user-1', 'group-1');
    expect(findPage).toHaveBeenCalledWith('group-1', 25, 'cursor-1');
    expect(findGroupById.mock.invocationCallOrder[0]).toBeLessThan(
      findPage.mock.invocationCallOrder[0],
    );
  });

  it('does not read activity when group access is denied', async () => {
    const error = new Error('group inaccessible');
    findGroupById.mockRejectedValue(error);

    await expect(service.findForGroup('user-2', 'group-1', 50)).rejects.toBe(error);
    expect(findPage).not.toHaveBeenCalled();
  });
});
