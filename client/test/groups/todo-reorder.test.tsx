import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { type TodoResponseDto, TodoStatus } from '@/api/generated';
import { subtasksApi, todosApi } from '@/api/groups';
import { useTodosQuery } from '@/api/groups/queries';
import { queryKeys } from '@/api/query-keys';
import { SortableTodoList } from '@/features/groups/components/sortable-todo-list';
import { toast } from '@/shared/components/ui/toast';

const dnd = vi.hoisted(() => ({
  onDragEnd: undefined as ((event: unknown) => Promise<void>) | undefined,
}));

vi.mock('@dnd-kit/react', () => ({
  DragDropProvider: ({
    children,
    onDragEnd,
  }: {
    children: React.ReactNode;
    onDragEnd: (event: unknown) => Promise<void>;
  }) => {
    dnd.onDragEnd = onDragEnd;
    return children;
  },
}));

vi.mock('@dnd-kit/react/sortable', () => ({
  isSortableOperation: () => true,
  useSortable: () => ({
    ref: () => undefined,
    handleRef: () => undefined,
    isDragging: false,
  }),
}));

const todoListId = 'list-1';
const todos: TodoResponseDto[] = ['A', 'B', 'C'].map((suffix, index) => ({
  id: `todo-${suffix.toLowerCase()}`,
  todoListId,
  title: `Todo ${suffix}`,
  description: null,
  status: TodoStatus.NUMBER_10,
  rank: String((index + 1) * 1000),
  dueDate: null,
  completedAt: null,
  assignedToId: null,
  createdById: 'user-1',
  updatedById: null,
  createdAt: '2026-08-10T10:00:00.000Z',
  updatedAt: '2026-08-10T10:00:00.000Z',
}));

function TodoHarness() {
  const query = useTodosQuery(todoListId);
  return query.data ? <SortableTodoList todos={query.data} todoListId={todoListId} /> : null;
}

function renderTodoList(authoritativeTodos = todos) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
      mutations: { retry: false },
    },
  });
  queryClient.setQueryData(queryKeys.todos.forList(todoListId), authoritativeTodos);
  queryClient.setQueryData(queryKeys.todos.forList('unrelated-list'), [
    { ...todos[0], id: 'unrelated-todo', todoListId: 'unrelated-list' },
  ]);
  vi.spyOn(subtasksApi, 'subTaskControllerFindForTodoV1').mockResolvedValue({ data: [] } as never);

  render(
    <QueryClientProvider client={queryClient}>
      <TodoHarness />
    </QueryClientProvider>,
  );

  return queryClient;
}

function visibleTodoOrder() {
  return screen.getAllByText(/^Todo [ABC]$/).map((element) => element.textContent);
}

function dragEnd(fromIndex: number, toIndex: number, nativeEvent: Event = new Event('pointerup')) {
  if (!dnd.onDragEnd) throw new Error('DragDropProvider was not rendered');
  return dnd.onDragEnd({
    canceled: false,
    nativeEvent,
    operation: {
      source: { id: todos[fromIndex]?.id, initialIndex: fromIndex, index: toIndex },
      target: { id: todos[toIndex]?.id },
    },
  });
}

describe('Todo drag-and-drop ordering', () => {
  afterEach(() => {
    dnd.onDragEnd = undefined;
    toast.close();
    vi.restoreAllMocks();
  });

  it('uses visible handles without taking over existing Todo actions', () => {
    renderTodoList();

    expect(screen.getByRole('button', { name: 'Reorder Todo A' })).toBeEnabled();
    expect(screen.getAllByRole('button', { name: 'Complete' })[0]).toBeEnabled();
    expect(screen.getAllByRole('button', { name: 'Add subtask' })[0]).toBeEnabled();
  });

  it('optimistically moves a Todo before the correct anchor and invalidates only its list', async () => {
    let resolveReorder: (value: { data: TodoResponseDto }) => void = () => undefined;
    const reorderedTodo = { ...todos[2], rank: '1500', updatedById: 'user-1' };
    const authoritativeOrder = [todos[0], reorderedTodo, todos[1]];
    const findTodos = vi
      .spyOn(todosApi, 'todoControllerFindForTodoListV1')
      .mockResolvedValue({ data: authoritativeOrder } as never);
    const reorderTodo = vi.spyOn(todosApi, 'todoControllerReorderV1').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveReorder = resolve as typeof resolveReorder;
        }) as never,
    );
    const queryClient = renderTodoList();
    await waitFor(() => expect(findTodos).toHaveBeenCalledOnce());
    findTodos.mockClear();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const unrelatedBefore = queryClient.getQueryData(queryKeys.todos.forList('unrelated-list'));

    let reorderPromise: Promise<void> | undefined;
    act(() => {
      reorderPromise = dragEnd(2, 1);
    });

    await waitFor(() => expect(visibleTodoOrder()).toEqual(['Todo A', 'Todo C', 'Todo B']));
    expect(reorderTodo).toHaveBeenCalledWith({
      todoId: 'todo-c',
      reorderTodoDto: { beforeTodoId: 'todo-b' },
    });
    expect(queryClient.getQueryData(queryKeys.todos.forList('unrelated-list'))).toBe(
      unrelatedBefore,
    );

    resolveReorder({ data: reorderedTodo });
    await act(async () => reorderPromise);

    expect(invalidateQueries).toHaveBeenCalledOnce();
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.todos.forList(todoListId),
      exact: true,
    });
    await waitFor(() => expect(findTodos).toHaveBeenCalledOnce());
    expect(queryClient.getQueryData(queryKeys.todos.forList(todoListId))).toEqual(
      authoritativeOrder,
    );
  });

  it('sends null when a Todo is moved to the end', async () => {
    const authoritativeOrder = [todos[1], todos[2], { ...todos[0], rank: '4000' }];
    vi.spyOn(todosApi, 'todoControllerFindForTodoListV1').mockResolvedValue({
      data: authoritativeOrder,
    } as never);
    const reorderTodo = vi.spyOn(todosApi, 'todoControllerReorderV1').mockResolvedValue({
      data: authoritativeOrder[2],
    } as never);
    renderTodoList();

    await act(async () => dragEnd(0, 2));

    expect(reorderTodo).toHaveBeenCalledWith({
      todoId: 'todo-a',
      reorderTodoDto: { beforeTodoId: null },
    });
  });

  it('rolls back optimistic order and presents a normalized error when reorder fails', async () => {
    vi.spyOn(todosApi, 'todoControllerFindForTodoListV1').mockResolvedValue({
      data: todos,
    } as never);
    vi.spyOn(todosApi, 'todoControllerReorderV1').mockRejectedValue(new Error('Reorder failed'));
    const addToast = vi.spyOn(toast, 'add');
    const queryClient = renderTodoList();

    await act(async () => dragEnd(2, 0));

    await waitFor(() => expect(visibleTodoOrder()).toEqual(['Todo A', 'Todo B', 'Todo C']));
    expect(addToast).toHaveBeenCalledWith({
      title: 'Something went wrong. Please try again.',
      type: 'error',
      priority: 'high',
    });
    expect(queryClient.getQueryData(queryKeys.todos.forList(todoListId))).toEqual(todos);
  });

  it('prevents duplicate list reorders while pending without blocking other Todo actions', async () => {
    let resolveReorder: (value: { data: TodoResponseDto }) => void = () => undefined;
    vi.spyOn(todosApi, 'todoControllerFindForTodoListV1').mockResolvedValue({
      data: todos,
    } as never);
    const reorderTodo = vi.spyOn(todosApi, 'todoControllerReorderV1').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveReorder = resolve as typeof resolveReorder;
        }) as never,
    );
    renderTodoList();

    let firstReorder: Promise<void> | undefined;
    act(() => {
      firstReorder = dragEnd(2, 1);
      void dragEnd(0, 2);
    });

    await waitFor(() => expect(reorderTodo).toHaveBeenCalledOnce());
    expect(screen.getByRole('button', { name: 'Reorder Todo A' })).toBeDisabled();
    expect(screen.getAllByRole('button', { name: 'Complete' })[0]).toBeEnabled();
    expect(screen.getAllByRole('button', { name: 'Add subtask' })[0]).toBeEnabled();

    resolveReorder({ data: todos[2] });
    await act(async () => firstReorder);
  });

  it('uses the same reorder contract for keyboard sorting', async () => {
    const authoritativeOrder = [{ ...todos[1], rank: '0' }, todos[0], todos[2]];
    vi.spyOn(todosApi, 'todoControllerFindForTodoListV1').mockResolvedValue({
      data: authoritativeOrder,
    } as never);
    const reorderTodo = vi.spyOn(todosApi, 'todoControllerReorderV1').mockResolvedValue({
      data: authoritativeOrder[0],
    } as never);
    renderTodoList();

    await act(async () => dragEnd(1, 0, new KeyboardEvent('keydown', { key: 'ArrowUp' })));

    expect(reorderTodo).toHaveBeenCalledWith({
      todoId: 'todo-b',
      reorderTodoDto: { beforeTodoId: 'todo-a' },
    });
  });
});
