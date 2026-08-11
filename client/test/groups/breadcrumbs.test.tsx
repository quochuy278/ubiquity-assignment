import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { type GroupResponseDto, GroupType, type TodoListResponseDto } from '@/api/generated';
import { groupsApi, todoListsApi, todosApi } from '@/api/groups';
import { GroupPage, TodoListPage } from '@/features/groups';

const groupId = 'group-1';
const todoListId = 'list-1';

const group: GroupResponseDto = {
  id: groupId,
  type: GroupType.Shared,
  name: 'Product team',
  createdById: 'user-1',
  createdAt: '2026-08-10T10:00:00.000Z',
  updatedAt: '2026-08-10T10:00:00.000Z',
};

const todoList: TodoListResponseDto = {
  id: todoListId,
  groupId,
  name: 'Sprint tasks',
  icon: null,
  color: null,
  rank: '1000',
  createdAt: '2026-08-10T10:00:00.000Z',
  updatedAt: '2026-08-10T10:00:00.000Z',
};

function renderPage(path: string, routePath: string, element: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={routePath} element={element} />
          <Route path="/groups" element={<h1>Groups fallback</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Groups hierarchy breadcrumbs', () => {
  afterEach(() => vi.restoreAllMocks());

  it('links a Group page back to Groups without linking the current Group', async () => {
    vi.spyOn(groupsApi, 'groupControllerFindByIdV1').mockResolvedValue({ data: group } as never);
    vi.spyOn(todoListsApi, 'todoListControllerFindForGroupV1').mockResolvedValue({
      data: [],
    } as never);

    renderPage(`/groups/${groupId}`, '/groups/:groupId', <GroupPage />);

    const breadcrumb = await screen.findByRole('navigation', { name: /breadcrumb/i });
    expect(within(breadcrumb).getByRole('link', { name: 'Groups' })).toHaveAttribute(
      'href',
      '/groups',
    );
    expect(within(breadcrumb).getByText(group.name)).toHaveAttribute('aria-current', 'page');
    expect(within(breadcrumb).queryByRole('link', { name: group.name })).not.toBeInTheDocument();
    expect(document.title).toBe(`${group.name} | Ubiquity Todo`);
  });

  it('links a Todo List page to Groups and its parent Group without linking the current List', async () => {
    vi.spyOn(groupsApi, 'groupControllerFindByIdV1').mockResolvedValue({ data: group } as never);
    vi.spyOn(todoListsApi, 'todoListControllerFindByIdV1').mockResolvedValue({
      data: todoList,
    } as never);
    vi.spyOn(todosApi, 'todoControllerFindForTodoListV1').mockResolvedValue({ data: [] } as never);

    renderPage(
      `/groups/${groupId}/lists/${todoListId}`,
      '/groups/:groupId/lists/:todoListId',
      <TodoListPage />,
    );

    const breadcrumb = await screen.findByRole('navigation', { name: /breadcrumb/i });
    expect(within(breadcrumb).getByRole('link', { name: 'Groups' })).toHaveAttribute(
      'href',
      '/groups',
    );
    expect(within(breadcrumb).getByRole('link', { name: group.name })).toHaveAttribute(
      'href',
      `/groups/${groupId}`,
    );
    expect(within(breadcrumb).getByText(todoList.name)).toHaveAttribute('aria-current', 'page');
    expect(within(breadcrumb).queryByRole('link', { name: todoList.name })).not.toBeInTheDocument();
    expect(document.title).toBe(`${todoList.name} | Ubiquity Todo`);
  });

  it('renders a valid Todo List direct deep link without pre-populated navigation state', async () => {
    vi.spyOn(groupsApi, 'groupControllerFindByIdV1').mockResolvedValue({ data: group } as never);
    vi.spyOn(todoListsApi, 'todoListControllerFindByIdV1').mockResolvedValue({
      data: todoList,
    } as never);
    vi.spyOn(todosApi, 'todoControllerFindForTodoListV1').mockResolvedValue({ data: [] } as never);

    renderPage(
      `/groups/${groupId}/lists/${todoListId}`,
      '/groups/:groupId/lists/:todoListId',
      <TodoListPage />,
    );

    expect(await screen.findByRole('heading', { name: todoList.name })).toBeInTheDocument();
    expect(screen.getByText('No todos')).toBeInTheDocument();
  });

  it('redirects a mismatched Todo List relationship without rendering a false hierarchy', async () => {
    vi.spyOn(groupsApi, 'groupControllerFindByIdV1').mockResolvedValue({ data: group } as never);
    vi.spyOn(todoListsApi, 'todoListControllerFindByIdV1').mockResolvedValue({
      data: { ...todoList, groupId: 'group-2' },
    } as never);
    vi.spyOn(todosApi, 'todoControllerFindForTodoListV1').mockResolvedValue({ data: [] } as never);

    renderPage(
      `/groups/${groupId}/lists/${todoListId}`,
      '/groups/:groupId/lists/:todoListId',
      <TodoListPage />,
    );

    expect(await screen.findByRole('heading', { name: 'Groups fallback' })).toBeInTheDocument();
    expect(screen.queryByText(todoList.name)).not.toBeInTheDocument();
    expect(screen.queryByText(group.name)).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: /breadcrumb/i })).not.toBeInTheDocument();
  });

  it('keeps showing loading until the Todo List relationship can be validated', async () => {
    let resolveTodoList: ((value: { data: TodoListResponseDto }) => void) | undefined;
    const todoListRequest = new Promise<{ data: TodoListResponseDto }>((resolve) => {
      resolveTodoList = resolve;
    });

    vi.spyOn(groupsApi, 'groupControllerFindByIdV1').mockResolvedValue({ data: group } as never);
    vi.spyOn(todoListsApi, 'todoListControllerFindByIdV1').mockReturnValue(
      todoListRequest as never,
    );
    vi.spyOn(todosApi, 'todoControllerFindForTodoListV1').mockResolvedValue({ data: [] } as never);

    renderPage(
      `/groups/${groupId}/lists/${todoListId}`,
      '/groups/:groupId/lists/:todoListId',
      <TodoListPage />,
    );

    expect(screen.getByText('Loading todos')).toBeInTheDocument();
    expect(document.title).toBe('Todo List | Ubiquity Todo');
    expect(screen.queryByRole('heading', { name: 'Groups fallback' })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: /breadcrumb/i })).not.toBeInTheDocument();

    resolveTodoList?.({ data: todoList });

    expect(await screen.findByRole('heading', { name: todoList.name })).toBeInTheDocument();
    expect(document.title).toBe(`${todoList.name} | Ubiquity Todo`);
  });
});
