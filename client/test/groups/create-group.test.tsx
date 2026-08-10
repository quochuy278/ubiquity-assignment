import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { groupsApi } from '@/api/groups';
import { GroupType, type GroupResponseDto } from '@/api/generated';
import { queryKeys } from '@/api/query-keys';
import { GroupsPage } from '@/features/groups';

const createdGroup: GroupResponseDto = {
  id: 'group-1',
  type: GroupType.Shared,
  name: 'Product team',
  createdById: 'user-1',
  createdAt: '2026-08-10T10:00:00.000Z',
  updatedAt: '2026-08-10T10:00:00.000Z',
};

function renderGroupsPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <GroupsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );

  return queryClient;
}

async function openAndFillCreateGroupForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Create group' }));
  await user.type(screen.getByLabelText('Name'), createdGroup.name);
  await user.selectOptions(screen.getByLabelText('Type'), GroupType.Shared);
}

describe('create group', () => {
  afterEach(() => vi.restoreAllMocks());

  it('creates a group, updates the cached list, and invalidates it', async () => {
    const user = userEvent.setup();
    const findGroups = vi
      .spyOn(groupsApi, 'groupControllerFindForUserV1')
      .mockResolvedValueOnce({ data: [] } as never)
      .mockResolvedValue({ data: [createdGroup] } as never);
    const createGroup = vi
      .spyOn(groupsApi, 'groupControllerCreateV1')
      .mockResolvedValue({ data: createdGroup } as never);
    const queryClient = renderGroupsPage();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

    await openAndFillCreateGroupForm(user);
    await user.click(screen.getByRole('button', { name: 'Create group' }));

    expect(createGroup).toHaveBeenCalledWith({
      createGroupDto: { name: createdGroup.name, type: GroupType.Shared },
    });
    expect(await screen.findByRole('link', { name: /Product team/ })).toBeInTheDocument();
    expect(queryClient.getQueryData(queryKeys.groups.all)).toEqual([createdGroup]);
    expect(queryClient.getQueryData(queryKeys.groups.detail(createdGroup.id))).toEqual(createdGroup);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.groups.all,
      exact: true,
    });
    expect(findGroups).toHaveBeenCalledTimes(2);
  });

  it('keeps the form open and shows an API error when creation fails', async () => {
    const user = userEvent.setup();
    vi.spyOn(groupsApi, 'groupControllerFindForUserV1').mockResolvedValue({ data: [] } as never);
    const createGroup = vi
      .spyOn(groupsApi, 'groupControllerCreateV1')
      .mockRejectedValue(new Error('Create failed'));
    renderGroupsPage();

    await openAndFillCreateGroupForm(user);
    await user.click(screen.getByRole('button', { name: 'Create group' }));

    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(createGroup).toHaveBeenCalledOnce();
  });

  it('shows a pending state and prevents duplicate submission', async () => {
    const user = userEvent.setup();
    let resolveCreate: (value: { data: GroupResponseDto }) => void = () => undefined;
    vi.spyOn(groupsApi, 'groupControllerFindForUserV1')
      .mockResolvedValueOnce({ data: [] } as never)
      .mockResolvedValue({ data: [createdGroup] } as never);
    const createGroup = vi.spyOn(groupsApi, 'groupControllerCreateV1').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve as typeof resolveCreate;
        }) as never,
    );
    renderGroupsPage();

    await openAndFillCreateGroupForm(user);
    await user.click(screen.getByRole('button', { name: 'Create group' }));

    const pendingButton = await screen.findByRole('button', { name: 'Creating group...' });
    expect(pendingButton).toBeDisabled();
    await user.click(pendingButton);
    expect(createGroup).toHaveBeenCalledOnce();

    resolveCreate({ data: createdGroup });
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Creating group...' })).not.toBeInTheDocument(),
    );
  });
});
