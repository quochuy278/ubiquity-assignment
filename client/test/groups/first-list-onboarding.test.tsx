import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import {
  type GroupResponseDto,
  GroupType,
  MembershipRole,
  type TodoListResponseDto,
} from '@/api/generated';
import { groupsApi, todoListsApi } from '@/api/groups';
import { invitationsApi } from '@/api/invitations';
import { GroupsPage } from '@/features/groups';

const personalGroup: GroupResponseDto = {
  id: 'group-personal',
  type: GroupType.Personal,
  currentUserRole: MembershipRole.Owner,
  name: 'Personal',
  createdById: 'user-1',
  createdAt: '2026-08-11T10:00:00.000Z',
  updatedAt: '2026-08-11T10:00:00.000Z',
};

const firstList: TodoListResponseDto = {
  id: 'list-first',
  groupId: personalGroup.id,
  name: 'My Todos',
  icon: null,
  color: null,
  rank: '1000',
  createdAt: '2026-08-11T10:00:00.000Z',
  updatedAt: '2026-08-11T10:00:00.000Z',
};

function renderGroupsPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/groups']}>
        <Routes>
          <Route path="/groups" element={<GroupsPage />} />
          <Route
            path="/groups/:groupId/lists/:todoListId"
            element={<h1>First list destination</h1>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function openFirstListDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Create my first list' }));
}

describe('first-list onboarding', () => {
  beforeEach(() => {
    vi.spyOn(invitationsApi, 'invitationControllerFindPendingV1').mockResolvedValue({
      data: [],
    } as never);
  });

  afterEach(() => vi.restoreAllMocks());

  it('guides a user with no workspaces toward creating a first list', async () => {
    vi.spyOn(groupsApi, 'groupControllerFindForUserV1').mockResolvedValue({ data: [] } as never);

    renderGroupsPage();

    expect(await screen.findByRole('heading', { name: 'Welcome' })).toBeInTheDocument();
    expect(screen.getByText('Create your first list')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create my first list' })).toBeInTheDocument();
  });

  it('keeps existing users in the normal workspace experience', async () => {
    vi.spyOn(groupsApi, 'groupControllerFindForUserV1').mockResolvedValue({
      data: [personalGroup],
    } as never);

    renderGroupsPage();

    expect(await screen.findByRole('heading', { name: 'Lists' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Personal/ })).toBeInTheDocument();
    expect(screen.queryByText('Create your first list')).not.toBeInTheDocument();
  });

  it('creates a personal workspace and list before navigating directly to the list', async () => {
    const user = userEvent.setup();
    vi.spyOn(groupsApi, 'groupControllerFindForUserV1')
      .mockResolvedValueOnce({ data: [] } as never)
      .mockResolvedValue({ data: [personalGroup] } as never);
    const createGroup = vi
      .spyOn(groupsApi, 'groupControllerCreateV1')
      .mockResolvedValue({ data: personalGroup } as never);
    const createTodoList = vi
      .spyOn(todoListsApi, 'todoListControllerCreateV1')
      .mockResolvedValue({ data: firstList } as never);
    renderGroupsPage();

    await openFirstListDialog(user);
    expect(screen.getByLabelText('List name')).toHaveValue('My Todos');
    await user.click(screen.getByRole('button', { name: 'Create list' }));

    expect(
      await screen.findByRole('heading', { name: 'First list destination' }),
    ).toBeInTheDocument();
    expect(createGroup).toHaveBeenCalledWith({
      createGroupDto: { name: 'Personal', type: GroupType.Personal },
    });
    expect(createTodoList).toHaveBeenCalledWith({
      groupId: personalGroup.id,
      createTodoListDto: { name: firstList.name },
    });
  });

  it('reuses the created workspace when list creation fails and is retried', async () => {
    const user = userEvent.setup();
    vi.spyOn(groupsApi, 'groupControllerFindForUserV1')
      .mockResolvedValueOnce({ data: [] } as never)
      .mockResolvedValue({ data: [personalGroup] } as never);
    const createGroup = vi
      .spyOn(groupsApi, 'groupControllerCreateV1')
      .mockResolvedValue({ data: personalGroup } as never);
    const createTodoList = vi
      .spyOn(todoListsApi, 'todoListControllerCreateV1')
      .mockRejectedValueOnce(new Error('List failed'))
      .mockResolvedValueOnce({ data: firstList } as never);
    renderGroupsPage();

    await openFirstListDialog(user);
    await user.click(screen.getByRole('button', { name: 'Create list' }));

    expect(
      await screen.findByText(/Your personal workspace was created, but the list was not/),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(createGroup).toHaveBeenCalledOnce();
    expect(createTodoList).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: 'Create list' }));

    expect(
      await screen.findByRole('heading', { name: 'First list destination' }),
    ).toBeInTheDocument();
    expect(createGroup).toHaveBeenCalledOnce();
    expect(createTodoList).toHaveBeenCalledTimes(2);
  });

  it('locks repeated submissions while first-list creation is pending', async () => {
    const user = userEvent.setup();
    let resolveGroup: (value: { data: GroupResponseDto }) => void = () => undefined;
    vi.spyOn(groupsApi, 'groupControllerFindForUserV1')
      .mockResolvedValueOnce({ data: [] } as never)
      .mockResolvedValue({ data: [personalGroup] } as never);
    const createGroup = vi.spyOn(groupsApi, 'groupControllerCreateV1').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGroup = resolve as typeof resolveGroup;
        }) as never,
    );
    const createTodoList = vi
      .spyOn(todoListsApi, 'todoListControllerCreateV1')
      .mockResolvedValue({ data: firstList } as never);
    renderGroupsPage();

    await openFirstListDialog(user);
    const form = screen.getByRole('dialog').querySelector('form');
    if (!form) throw new Error('First-list form not found');
    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(await screen.findByRole('button', { name: 'Creating your list...' })).toBeDisabled();
    expect(createGroup).toHaveBeenCalledOnce();

    resolveGroup({ data: personalGroup });
    await waitFor(() => expect(createTodoList).toHaveBeenCalledOnce());
  });
});
