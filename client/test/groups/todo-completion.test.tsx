import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { groupsApi, subtasksApi, todoListsApi, todosApi } from '@/api/groups';
import {
  GroupType,
  type GroupResponseDto,
  TodoStatus,
  type TodoListResponseDto,
  type TodoResponseDto,
} from '@/api/generated';
import { queryKeys } from '@/api/query-keys';
import { TodoListPage } from '@/features/groups';
import { toast } from '@/shared/components/ui/toast';

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

const activeTodo: TodoResponseDto = {
  id: 'todo-1',
  todoListId,
  title: 'Prepare sprint demo',
  description: null,
  status: TodoStatus.NUMBER_10,
  rank: '1000',
  dueDate: null,
  completedAt: null,
  assignedToId: null,
  createdById: 'user-1',
  updatedById: null,
  createdAt: '2026-08-10T10:00:00.000Z',
  updatedAt: '2026-08-10T10:00:00.000Z',
};

const completedTodo: TodoResponseDto = {
  ...activeTodo,
  status: TodoStatus.NUMBER_20,
  completedAt: '2026-08-10T11:00:00.000Z',
  updatedById: 'user-1',
  updatedAt: '2026-08-10T11:00:00.000Z',
};

const secondActiveTodo: TodoResponseDto = {
  ...activeTodo,
  id: 'todo-2',
  title: 'Review release notes',
  rank: '2000',
};

function renderTodoListPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/groups/${groupId}/lists/${todoListId}`]}>
        <Routes>
          <Route path="/groups/:groupId/lists/:todoListId" element={<TodoListPage />} />
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
  vi.spyOn(subtasksApi, 'subTaskControllerFindForTodoV1').mockResolvedValue({ data: [] } as never);
}

async function getTodoCard(title: string) {
  const titleElement = await screen.findByText(title);
  const card = titleElement.closest<HTMLElement>('[data-slot="card"]');

  if (!card) throw new Error(`Card not found for ${title}`);
  return card;
}

describe('todo completion', () => {
  afterEach(() => {
    toast.close();
    vi.restoreAllMocks();
  });

  it('exposes the completion action for an Active Todo', async () => {
    mockTodoListQuery();
    vi.spyOn(todosApi, 'todoControllerFindForTodoListV1').mockResolvedValue({
      data: [activeTodo],
    } as never);

    renderTodoListPage();

    const card = await getTodoCard(activeTodo.title);
    expect(within(card).getByRole('button', { name: 'Complete' })).toBeInTheDocument();
    expect(within(card).queryByText('Completed')).not.toBeInTheDocument();
  });

  it('completes a Todo, updates its cache entry, and invalidates only its Todo list', async () => {
    const user = userEvent.setup();
    mockTodoListQuery();
    vi.spyOn(todosApi, 'todoControllerFindForTodoListV1')
      .mockResolvedValueOnce({ data: [activeTodo] } as never)
      .mockResolvedValue({ data: [completedTodo] } as never);
    const updateCompletion = vi
      .spyOn(todosApi, 'todoControllerUpdateCompletionV1')
      .mockResolvedValue({ data: completedTodo } as never);
    const queryClient = renderTodoListPage();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const addToast = vi.spyOn(toast, 'add');

    const card = await getTodoCard(activeTodo.title);
    await user.click(within(card).getByRole('button', { name: 'Complete' }));

    expect(updateCompletion).toHaveBeenCalledWith({
      todoId: activeTodo.id,
      updateTodoCompletionDto: { completed: true },
    });
    await waitFor(() => expect(within(card).getByText('Completed')).toBeInTheDocument());
    expect(within(card).queryByRole('button', { name: 'Complete' })).not.toBeInTheDocument();
    expect(within(card).queryByRole('button', { name: 'Reopen' })).not.toBeInTheDocument();
    expect(addToast).toHaveBeenCalledWith({ title: 'Todo completed', type: 'success' });
    expect(queryClient.getQueryData(queryKeys.todos.forList(todoListId))).toEqual([completedTodo]);
    expect(invalidateQueries).toHaveBeenCalledOnce();
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.todos.forList(todoListId),
      exact: true,
    });
  });

  it('renders an accessible completed state without completion or Reopen actions', async () => {
    mockTodoListQuery();
    vi.spyOn(todosApi, 'todoControllerFindForTodoListV1').mockResolvedValue({
      data: [completedTodo],
    } as never);
    const updateCompletion = vi.spyOn(todosApi, 'todoControllerUpdateCompletionV1');
    renderTodoListPage();

    const card = await getTodoCard(completedTodo.title);
    expect(within(card).getByText('Completed')).toBeInTheDocument();
    expect(within(card).queryByRole('button', { name: 'Complete' })).not.toBeInTheDocument();
    expect(within(card).queryByRole('button', { name: 'Reopen' })).not.toBeInTheDocument();
    expect(updateCompletion).not.toHaveBeenCalled();
  });

  it('preserves confirmed state and presents an error when the mutation fails', async () => {
    const user = userEvent.setup();
    mockTodoListQuery();
    vi.spyOn(todosApi, 'todoControllerFindForTodoListV1').mockResolvedValue({
      data: [activeTodo],
    } as never);
    vi.spyOn(todosApi, 'todoControllerUpdateCompletionV1').mockRejectedValue(
      new Error('Update failed'),
    );
    const queryClient = renderTodoListPage();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const addToast = vi.spyOn(toast, 'add');

    const card = await getTodoCard(activeTodo.title);
    await user.click(within(card).getByRole('button', { name: 'Complete' }));

    await waitFor(() =>
      expect(addToast).toHaveBeenCalledWith({
        title: 'Something went wrong. Please try again.',
        type: 'error',
        priority: 'high',
      }),
    );
    expect(within(card).queryByText('Completed')).not.toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Complete' })).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong. Please try again.')).not.toBeInTheDocument();
    expect(queryClient.getQueryData(queryKeys.todos.forList(todoListId))).toEqual([activeTodo]);
    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it('disables duplicate interaction only for the Todo being updated', async () => {
    let resolveUpdate: (value: { data: TodoResponseDto }) => void = () => undefined;
    mockTodoListQuery();
    vi.spyOn(todosApi, 'todoControllerFindForTodoListV1')
      .mockResolvedValueOnce({ data: [activeTodo, secondActiveTodo] } as never)
      .mockResolvedValue({ data: [completedTodo, secondActiveTodo] } as never);
    const updateCompletion = vi
      .spyOn(todosApi, 'todoControllerUpdateCompletionV1')
      .mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveUpdate = resolve as typeof resolveUpdate;
          }) as never,
      );
    renderTodoListPage();

    const firstCard = await getTodoCard(activeTodo.title);
    const secondCard = await getTodoCard(secondActiveTodo.title);
    const completeButton = within(firstCard).getByRole('button', { name: 'Complete' });
    act(() => {
      completeButton.click();
      completeButton.click();
    });

    const pendingButton = within(firstCard).getByRole('button', { name: 'Completing...' });
    expect(pendingButton).toBeDisabled();
    expect(within(secondCard).getByRole('button', { name: 'Complete' })).toBeEnabled();
    await waitFor(() => expect(updateCompletion).toHaveBeenCalledOnce());

    resolveUpdate({ data: completedTodo });
    await waitFor(() => expect(within(firstCard).getByText('Completed')).toBeInTheDocument());
    expect(within(firstCard).queryByRole('button', { name: 'Complete' })).not.toBeInTheDocument();
    expect(within(firstCard).queryByRole('button', { name: 'Reopen' })).not.toBeInTheDocument();
  });
});
