import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { groupsApi, todoListsApi, todosApi } from '@/api/groups';
import { GroupType, type GroupResponseDto, type TodoListResponseDto } from '@/api/generated';
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
    expect(within(breadcrumb).getByText(todoList.name)).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      within(breadcrumb).queryByRole('link', { name: todoList.name }),
    ).not.toBeInTheDocument();
  });
});
