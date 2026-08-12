import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { type GroupResponseDto, GroupType } from '@/api/generated';
import { groupsApi } from '@/api/groups';
import { invitationsApi } from '@/api/invitations';
import { queryKeys } from '@/api/query-keys';
import { GroupsPage } from '@/features/groups';

const createdGroup: GroupResponseDto = {
  id: 'group-1',
  type: GroupType.Shared,
  currentUserRole: 'OWNER',
  name: 'Product team',
  createdById: 'user-1',
  createdAt: '2026-08-10T10:00:00.000Z',
  updatedAt: '2026-08-10T10:00:00.000Z',
};

const existingGroup: GroupResponseDto = {
  ...createdGroup,
  id: 'group-existing',
  type: GroupType.Personal,
  name: 'Personal',
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
  await user.click(await screen.findByRole('button', { name: 'Create workspace' }));
  await user.type(screen.getByLabelText('Workspace name'), createdGroup.name);
  await user.click(screen.getByRole('combobox', { name: 'Workspace type' }));
  await user.click(screen.getByRole('option', { name: 'Shared' }));
}

describe('create group', () => {
  beforeEach(() => {
    vi.spyOn(invitationsApi, 'invitationControllerFindPendingV1').mockResolvedValue({
      data: [],
    } as never);
  });

  afterEach(() => vi.restoreAllMocks());

  it('defaults to a personal group and explains shared-group invitations', async () => {
    const user = userEvent.setup();
    vi.spyOn(groupsApi, 'groupControllerFindForUserV1').mockResolvedValue({
      data: [existingGroup],
    } as never);
    renderGroupsPage();

    await user.click(await screen.findByRole('button', { name: 'Create workspace' }));

    expect(screen.getByRole('combobox', { name: 'Workspace type' })).toHaveTextContent('Personal');
    expect(
      screen.getByText(
        'Shared workspaces let you invite registered users and sync collaborative changes.',
      ),
    ).toBeInTheDocument();
  });

  it('supports keyboard selection and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    vi.spyOn(groupsApi, 'groupControllerFindForUserV1').mockResolvedValue({
      data: [existingGroup],
    } as never);
    renderGroupsPage();

    await user.click(await screen.findByRole('button', { name: 'Create workspace' }));
    const select = screen.getByRole('combobox', { name: 'Workspace type' });
    select.focus();

    await user.keyboard('{Enter}');
    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeInTheDocument();
    expect(listbox.closest('[data-side]')).toHaveAttribute('data-side', 'bottom');
    await user.keyboard('{Escape}');
    expect(select).toHaveFocus();

    await user.keyboard('{Enter}{ArrowDown}{Enter}');
    expect(select).toHaveTextContent('Shared');

    await user.keyboard('{Enter}');
    const sharedListbox = screen.getByRole('listbox');
    expect(sharedListbox.closest('[data-side]')).toHaveAttribute('data-side', 'bottom');
    await user.keyboard('{Escape}');
    expect(select).toHaveFocus();
  });

  it('creates a group, updates the cached list, and invalidates it', async () => {
    const user = userEvent.setup();
    const findGroups = vi
      .spyOn(groupsApi, 'groupControllerFindForUserV1')
      .mockResolvedValueOnce({ data: [existingGroup] } as never)
      .mockResolvedValue({ data: [existingGroup, createdGroup] } as never);
    const createGroup = vi
      .spyOn(groupsApi, 'groupControllerCreateV1')
      .mockResolvedValue({ data: createdGroup } as never);
    const queryClient = renderGroupsPage();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

    await openAndFillCreateGroupForm(user);
    await user.click(screen.getByRole('button', { name: 'Create workspace' }));

    expect(createGroup).toHaveBeenCalledWith({
      createGroupDto: { name: createdGroup.name, type: GroupType.Shared },
    });
    expect(await screen.findByRole('link', { name: /Product team/ })).toBeInTheDocument();
    expect(screen.getByText(createdGroup.name)).toHaveClass('truncate');
    expect(screen.getByText(createdGroup.name)).toHaveAttribute('title', createdGroup.name);
    expect(screen.getByText('Shared')).toBeInTheDocument();
    expect(screen.queryByText(GroupType.Shared)).not.toBeInTheDocument();
    expect(queryClient.getQueryData(queryKeys.groups.all)).toEqual([existingGroup, createdGroup]);
    expect(queryClient.getQueryData(queryKeys.groups.detail(createdGroup.id))).toEqual(
      createdGroup,
    );
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.groups.all,
      exact: true,
    });
    expect(findGroups).toHaveBeenCalledTimes(2);
  });

  it('keeps the form open and shows an API error when creation fails', async () => {
    const user = userEvent.setup();
    vi.spyOn(groupsApi, 'groupControllerFindForUserV1')
      .mockResolvedValueOnce({ data: [existingGroup] } as never)
      .mockResolvedValue({ data: [existingGroup, createdGroup] } as never);
    const createGroup = vi
      .spyOn(groupsApi, 'groupControllerCreateV1')
      .mockRejectedValueOnce(new Error('Create failed'))
      .mockResolvedValueOnce({ data: createdGroup } as never);
    renderGroupsPage();

    await openAndFillCreateGroupForm(user);
    await user.click(screen.getByRole('button', { name: 'Create workspace' }));

    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(createGroup).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: 'Create workspace' }));
    expect(await screen.findByRole('link', { name: /Product team/ })).toBeInTheDocument();
    expect(createGroup).toHaveBeenCalledTimes(2);
  });

  it('does not impose a name length limit absent from the API contract', async () => {
    const user = userEvent.setup();
    vi.spyOn(groupsApi, 'groupControllerFindForUserV1').mockResolvedValue({
      data: [existingGroup],
    } as never);
    renderGroupsPage();

    await user.click(await screen.findByRole('button', { name: 'Create workspace' }));

    expect(screen.getByLabelText('Workspace name')).not.toHaveAttribute('maxlength');
  });

  it('shows a pending state and prevents duplicate submission', async () => {
    const user = userEvent.setup();
    let resolveCreate: (value: { data: GroupResponseDto }) => void = () => undefined;
    vi.spyOn(groupsApi, 'groupControllerFindForUserV1')
      .mockResolvedValueOnce({ data: [existingGroup] } as never)
      .mockResolvedValue({ data: [existingGroup, createdGroup] } as never);
    const createGroup = vi.spyOn(groupsApi, 'groupControllerCreateV1').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve as typeof resolveCreate;
        }) as never,
    );
    renderGroupsPage();

    await openAndFillCreateGroupForm(user);
    const form = screen.getByRole('dialog').querySelector('form');
    if (!form) throw new Error('Create group form not found');
    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    const pendingButton = await screen.findByRole('button', { name: 'Creating workspace...' });
    expect(pendingButton).toBeDisabled();
    expect(createGroup).toHaveBeenCalledOnce();

    resolveCreate({ data: createdGroup });
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Creating workspace...' }),
      ).not.toBeInTheDocument(),
    );
  });
});
