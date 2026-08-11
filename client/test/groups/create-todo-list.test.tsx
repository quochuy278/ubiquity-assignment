import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { type GroupResponseDto, GroupType, type TodoListResponseDto } from '@/api/generated';
import { groupsApi, todoListsApi } from '@/api/groups';
import { queryKeys } from '@/api/query-keys';
import { GroupPage } from '@/features/groups';

const groupId = 'group-1';

const group: GroupResponseDto = {
  id: groupId,
  type: GroupType.Shared,
  name: 'Product team',
  createdById: 'user-1',
  createdAt: '2026-08-10T10:00:00.000Z',
  updatedAt: '2026-08-10T10:00:00.000Z',
};

const createdTodoList: TodoListResponseDto = {
  id: 'list-1',
  groupId,
  name: 'Sprint tasks',
  icon: null,
  color: null,
  rank: '1000',
  createdAt: '2026-08-10T10:00:00.000Z',
  updatedAt: '2026-08-10T10:00:00.000Z',
};

function renderGroupPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/groups/${groupId}`]}>
        <Routes>
          <Route path="/groups/:groupId" element={<GroupPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

  return queryClient;
}

function mockGroupQuery() {
  vi.spyOn(groupsApi, 'groupControllerFindByIdV1').mockResolvedValue({ data: group } as never);
}

async function openAndFillCreateListForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Create list' }));
  await user.type(screen.getByLabelText('Name'), createdTodoList.name);
}

describe('create todo list', () => {
  afterEach(() => vi.restoreAllMocks());

  it('offers the create action from the empty-list state', async () => {
    mockGroupQuery();
    vi.spyOn(todoListsApi, 'todoListControllerFindForGroupV1').mockResolvedValue({
      data: [],
    } as never);

    renderGroupPage();

    expect(await screen.findByText('No todo lists')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create list' })).toBeInTheDocument();
  });

  it('creates a list, updates the cached queries, and invalidates the group list query', async () => {
    const user = userEvent.setup();
    mockGroupQuery();
    const findTodoLists = vi
      .spyOn(todoListsApi, 'todoListControllerFindForGroupV1')
      .mockResolvedValueOnce({ data: [] } as never)
      .mockResolvedValue({ data: [createdTodoList] } as never);
    const createTodoList = vi
      .spyOn(todoListsApi, 'todoListControllerCreateV1')
      .mockResolvedValue({ data: createdTodoList } as never);
    const queryClient = renderGroupPage();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

    await openAndFillCreateListForm(user);
    await user.click(screen.getByRole('button', { name: 'Create list' }));

    expect(createTodoList).toHaveBeenCalledWith({
      groupId,
      createTodoListDto: { name: createdTodoList.name },
    });
    expect(await screen.findByRole('link', { name: createdTodoList.name })).toBeInTheDocument();
    expect(queryClient.getQueryData(queryKeys.todoLists.forGroup(groupId))).toEqual([
      createdTodoList,
    ]);
    expect(queryClient.getQueryData(queryKeys.todoLists.detail(createdTodoList.id))).toEqual(
      createdTodoList,
    );
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.todoLists.forGroup(groupId),
      exact: true,
    });
    expect(findTodoLists).toHaveBeenCalledTimes(2);
  });

  it('keeps the form open and shows an API error when creation fails', async () => {
    const user = userEvent.setup();
    mockGroupQuery();
    vi.spyOn(todoListsApi, 'todoListControllerFindForGroupV1').mockResolvedValue({
      data: [],
    } as never);
    const createTodoList = vi
      .spyOn(todoListsApi, 'todoListControllerCreateV1')
      .mockRejectedValue(new Error('Create failed'));
    renderGroupPage();

    await openAndFillCreateListForm(user);
    await user.click(screen.getByRole('button', { name: 'Create list' }));

    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(createTodoList).toHaveBeenCalledOnce();
  });

  it('shows a pending state and prevents duplicate submission', async () => {
    const user = userEvent.setup();
    let resolveCreate: (value: { data: TodoListResponseDto }) => void = () => undefined;
    mockGroupQuery();
    vi.spyOn(todoListsApi, 'todoListControllerFindForGroupV1')
      .mockResolvedValueOnce({ data: [] } as never)
      .mockResolvedValue({ data: [createdTodoList] } as never);
    const createTodoList = vi.spyOn(todoListsApi, 'todoListControllerCreateV1').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve as typeof resolveCreate;
        }) as never,
    );
    renderGroupPage();

    await openAndFillCreateListForm(user);
    await user.click(screen.getByRole('button', { name: 'Create list' }));

    const pendingButton = await screen.findByRole('button', { name: 'Creating list...' });
    expect(pendingButton).toBeDisabled();
    await user.click(pendingButton);
    expect(createTodoList).toHaveBeenCalledOnce();

    resolveCreate({ data: createdTodoList });
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Creating list...' })).not.toBeInTheDocument(),
    );
  });
});
