import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import type { Message } from 'ably';
import type { ReactNode } from 'react';
import { GroupType } from '@/api/generated';
import { queryKeys } from '@/api/query-keys';
import { TodoListRealtimeEventType } from '@/realtime/realtime-contract';
import { TodoListRealtime } from '@/realtime/todo-list-realtime';

const realtimeMocks = vi.hoisted(() => ({
  channelProvider: vi.fn(),
  useChannel: vi.fn(),
  useConnectionStateListener: vi.fn(),
}));

vi.mock('ably/react', () => ({
  ChannelProvider: realtimeMocks.channelProvider,
  useChannel: realtimeMocks.useChannel,
  useConnectionStateListener: realtimeMocks.useConnectionStateListener,
}));

vi.mock('@/realtime/realtime-context', () => ({
  useRealtimeAvailable: () => true,
}));

interface RealtimeTestProps {
  groupType: GroupType;
  todoIds: string[];
  todoListId: string;
}

const defaultProps: RealtimeTestProps = {
  groupType: GroupType.Shared,
  todoIds: ['todo-1', 'todo-2'],
  todoListId: 'list-1',
};

function realtimeTree(queryClient: QueryClient, props: RealtimeTestProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <TodoListRealtime {...props}>
        <h1>Authoritative Todo List</h1>
      </TodoListRealtime>
    </QueryClientProvider>
  );
}

function renderRealtime(props: RealtimeTestProps = defaultProps) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const ably = { connection: { state: 'initialized' } };
  realtimeMocks.useChannel.mockReturnValue({ ably });
  const result = render(realtimeTree(queryClient, props));

  return { ...result, queryClient };
}

function emit(type: TodoListRealtimeEventType, data: object) {
  const subscription = realtimeMocks.useChannel.mock.calls.find((call) => call[1] === type);
  const handler = subscription?.[2] as ((message: Message) => void) | undefined;
  handler?.({ name: type, data: { type, ...data } } as Message);
}

describe('TodoList realtime synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    realtimeMocks.channelProvider.mockImplementation(
      ({ children }: { children: ReactNode }) => children,
    );
  });

  it('creates one scoped channel provider and named subscriptions for a SHARED Group', () => {
    renderRealtime();

    expect(screen.getByRole('heading', { name: 'Authoritative Todo List' })).toBeInTheDocument();
    expect(realtimeMocks.channelProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        channelName: 'todo-list:list-1',
        options: { attachOnSubscribe: true },
      }),
      undefined,
    );
    expect(realtimeMocks.useChannel).toHaveBeenCalledTimes(5);
    expect(realtimeMocks.useChannel.mock.calls.map((call) => [call[0], call[1]])).toEqual([
      ['todo-list:list-1', TodoListRealtimeEventType.TODO_CREATED],
      ['todo-list:list-1', TodoListRealtimeEventType.TODO_COMPLETION_CHANGED],
      ['todo-list:list-1', TodoListRealtimeEventType.TODO_REORDERED],
      ['todo-list:list-1', TodoListRealtimeEventType.SUBTASK_CREATED],
      ['todo-list:list-1', TodoListRealtimeEventType.SUBTASK_COMPLETION_CHANGED],
    ]);
  });

  it('does not create or subscribe to a channel for a PERSONAL Group', () => {
    renderRealtime({ ...defaultProps, groupType: GroupType.Personal });

    expect(screen.getByRole('heading', { name: 'Authoritative Todo List' })).toBeInTheDocument();
    expect(realtimeMocks.channelProvider).not.toHaveBeenCalled();
    expect(realtimeMocks.useChannel).not.toHaveBeenCalled();
  });

  it('moves every named subscription to the new channel on TodoList change', () => {
    const { queryClient, rerender } = renderRealtime();

    rerender(realtimeTree(queryClient, { ...defaultProps, todoListId: 'list-2' }));

    expect(realtimeMocks.useChannel.mock.calls.slice(-5).map((call) => call[0])).toEqual([
      'todo-list:list-2',
      'todo-list:list-2',
      'todo-list:list-2',
      'todo-list:list-2',
      'todo-list:list-2',
    ]);
  });

  it.each([
    TodoListRealtimeEventType.TODO_CREATED,
    TodoListRealtimeEventType.TODO_COMPLETION_CHANGED,
    TodoListRealtimeEventType.TODO_REORDERED,
  ])('maps %s only to the current TodoList Todos query', (type) => {
    const { queryClient } = renderRealtime();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

    act(() => emit(type, { todoListId: 'list-1', todoId: 'todo-1' }));

    expect(invalidateQueries).toHaveBeenCalledOnce();
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.todos.forList('list-1'),
      exact: true,
    });
  });

  it.each([
    TodoListRealtimeEventType.SUBTASK_CREATED,
    TodoListRealtimeEventType.SUBTASK_COMPLETION_CHANGED,
  ])('maps %s only to the event parent Todo Subtasks query', (type) => {
    const { queryClient } = renderRealtime();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

    act(() =>
      emit(type, {
        todoListId: 'list-1',
        todoId: 'todo-2',
        subtaskId: 'subtask-1',
      }),
    );

    expect(invalidateQueries).toHaveBeenCalledOnce();
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.subtasks.forTodo('todo-2'),
      exact: true,
    });
  });

  it('ignores malformed and mismatched events without touching caches', () => {
    const { queryClient } = renderRealtime();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const subscription = realtimeMocks.useChannel.mock.calls.find(
      (call) => call[1] === TodoListRealtimeEventType.TODO_CREATED,
    );
    const handler = subscription?.[2] as (message: Message) => void;

    act(() => {
      handler({ name: 'UNRELATED', data: {} } as Message);
      handler({
        name: TodoListRealtimeEventType.TODO_CREATED,
        data: {
          type: TodoListRealtimeEventType.TODO_CREATED,
          todoListId: 'list-2',
          todoId: 'todo-1',
        },
      } as Message);
    });

    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it('invalidates current TodoList data whenever the connection becomes connected', () => {
    const { queryClient } = renderRealtime();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const handleConnected = realtimeMocks.useConnectionStateListener.mock
      .calls[0]?.[1] as () => void;

    act(() => handleConnected());
    expect(invalidateQueries).toHaveBeenCalledTimes(3);
    expect(invalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: queryKeys.todos.forList('list-1'),
      exact: true,
    });
    expect(invalidateQueries).toHaveBeenNthCalledWith(2, {
      queryKey: queryKeys.subtasks.forTodo('todo-1'),
      exact: true,
    });
    expect(invalidateQueries).toHaveBeenNthCalledWith(3, {
      queryKey: queryKeys.subtasks.forTodo('todo-2'),
      exact: true,
    });
  });
});
