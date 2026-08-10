import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { groupsApi, todoListsApi, todosApi } from '@/api/groups';
import {
  GroupType,
  type GroupResponseDto,
  TodoStatus,
  type TodoListResponseDto,
  type TodoResponseDto,
} from '@/api/generated';
import { queryKeys } from '@/api/query-keys';
import { TodoListPage } from '@/features/groups';

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

const existingTodo: TodoResponseDto = {
  id: 'todo-1',
  todoListId,
  title: 'Review backlog',
  description: null,
  status: TodoStatus.NUMBER_20,
  rank: '1000',
  dueDate: null,
  completedAt: '2026-08-10T11:00:00.000Z',
  assignedToId: null,
  createdById: 'user-1',
  updatedById: 'user-1',
  createdAt: '2026-08-10T10:00:00.000Z',
  updatedAt: '2026-08-10T11:00:00.000Z',
};

const createdTodo: TodoResponseDto = {
  id: 'todo-2',
  todoListId,
  title: 'Prepare sprint demo',
  description: 'Collect the completed stories.',
  status: TodoStatus.NUMBER_10,
  rank: '2000',
  dueDate: null,
  completedAt: null,
  assignedToId: null,
  createdById: 'user-1',
  updatedById: null,
  createdAt: '2026-08-10T12:00:00.000Z',
  updatedAt: '2026-08-10T12:00:00.000Z',
};

function renderTodoListPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/groups/${groupId}/lists/${todoListId}`]}>
        <Routes>
          <Route
            path="/groups/:groupId/lists/:todoListId"
            element={<TodoListPage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

  return queryClient;
}

function mockTodoListQuery() {
  vi.spyOn(groupsApi, 'groupControllerFindByIdV1').mockResolvedValue({ data: group } as never);
  vi.spyOn(todoListsApi, 'todoListControllerFindByIdV1').mockResolvedValue({
    data: todoList,
  } as never);
}

async function openAndFillCreateTodoForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Create todo' }));
  await user.type(screen.getByLabelText('Title'), createdTodo.title);
  await user.type(screen.getByLabelText('Description'), createdTodo.description ?? '');
}

describe('create todo', () => {
  afterEach(() => vi.restoreAllMocks());

  it('offers the create action from the empty Todo List state', async () => {
    mockTodoListQuery();
    vi.spyOn(todosApi, 'todoControllerFindForTodoListV1').mockResolvedValue({ data: [] } as never);

    renderTodoListPage();

    expect(await screen.findByText('No todos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create todo' })).toBeInTheDocument();
  });

  it('creates and renders a todo, updates the cache, and invalidates only its list query', async () => {
    const user = userEvent.setup();
    mockTodoListQuery();
    const findTodos = vi
      .spyOn(todosApi, 'todoControllerFindForTodoListV1')
      .mockResolvedValueOnce({ data: [existingTodo] } as never)
      .mockResolvedValue({ data: [existingTodo, createdTodo] } as never);
    const createTodo = vi
      .spyOn(todosApi, 'todoControllerCreateV1')
      .mockResolvedValue({ data: createdTodo } as never);
    const queryClient = renderTodoListPage();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

    await openAndFillCreateTodoForm(user);
    await user.click(screen.getByRole('button', { name: 'Create todo' }));

    expect(createTodo).toHaveBeenCalledWith({
      todoListId,
      createTodoDto: {
        title: createdTodo.title,
        description: createdTodo.description,
      },
    });
    expect(await screen.findByText(createdTodo.title)).toBeInTheDocument();
    expect(screen.getByText(createdTodo.description ?? '')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.queryByText('10')).not.toBeInTheDocument();
    expect(queryClient.getQueryData(queryKeys.todos.forList(todoListId))).toEqual([
      existingTodo,
      createdTodo,
    ]);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.todos.forList(todoListId),
      exact: true,
    });
    expect(findTodos).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Create todo' }));
    expect(screen.getByLabelText('Title')).toHaveValue('');
    expect(screen.getByLabelText('Description')).toHaveValue('');
  });

  it('keeps the form open and shows an API error when creation fails', async () => {
    const user = userEvent.setup();
    mockTodoListQuery();
    vi.spyOn(todosApi, 'todoControllerFindForTodoListV1').mockResolvedValue({ data: [] } as never);
    const createTodo = vi
      .spyOn(todosApi, 'todoControllerCreateV1')
      .mockRejectedValue(new Error('Create failed'));
    renderTodoListPage();

    await openAndFillCreateTodoForm(user);
    await user.click(screen.getByRole('button', { name: 'Create todo' }));

    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(createTodo).toHaveBeenCalledOnce();
  });

  it('shows a pending state and prevents duplicate submission', async () => {
    const user = userEvent.setup();
    let resolveCreate: (value: { data: TodoResponseDto }) => void = () => undefined;
    mockTodoListQuery();
    vi.spyOn(todosApi, 'todoControllerFindForTodoListV1')
      .mockResolvedValueOnce({ data: [] } as never)
      .mockResolvedValue({ data: [createdTodo] } as never);
    const createTodo = vi.spyOn(todosApi, 'todoControllerCreateV1').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve as typeof resolveCreate;
        }) as never,
    );
    renderTodoListPage();

    await openAndFillCreateTodoForm(user);
    await user.click(screen.getByRole('button', { name: 'Create todo' }));

    const pendingButton = await screen.findByRole('button', { name: 'Creating todo...' });
    expect(pendingButton).toBeDisabled();
    await user.click(pendingButton);
    expect(createTodo).toHaveBeenCalledOnce();

    resolveCreate({ data: createdTodo });
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Creating todo...' })).not.toBeInTheDocument(),
    );
  });
});
