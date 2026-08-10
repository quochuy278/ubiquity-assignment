import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import type { Message } from 'ably';
import type { ReactNode } from 'react';
import { GroupType } from '@/api/generated';
import { queryKeys } from '@/api/query-keys';
import { GroupRealtime } from '@/realtime/group-realtime';
import { GroupRealtimeEventType } from '@/realtime/realtime-contract';

const realtimeMocks = vi.hoisted(() => ({
  channelProvider: vi.fn(),
  useChannel: vi.fn(),
}));

vi.mock('ably/react', () => ({
  ChannelProvider: realtimeMocks.channelProvider,
  useChannel: realtimeMocks.useChannel,
}));

vi.mock('@/realtime/realtime-context', () => ({
  useRealtimeAvailable: () => true,
}));

function renderGroupRealtime(groupType: GroupType = GroupType.Shared) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <GroupRealtime groupId="group-1" groupType={groupType}>
        <h1>Group</h1>
      </GroupRealtime>
    </QueryClientProvider>,
  );
  return queryClient;
}

describe('Group realtime synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    realtimeMocks.channelProvider.mockImplementation(
      ({ children }: { children: ReactNode }) => children,
    );
  });

  it('subscribes to TodoList creation on the exact SHARED Group channel', () => {
    renderGroupRealtime();

    expect(screen.getByRole('heading', { name: 'Group' })).toBeInTheDocument();
    expect(realtimeMocks.channelProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        channelName: 'group:group-1',
        options: { attachOnSubscribe: true },
      }),
      undefined,
    );
    expect(realtimeMocks.useChannel).toHaveBeenCalledWith(
      'group:group-1',
      GroupRealtimeEventType.TODO_LIST_CREATED,
      expect.any(Function),
    );
  });

  it('does not open a channel for a PERSONAL Group', () => {
    renderGroupRealtime(GroupType.Personal);

    expect(realtimeMocks.channelProvider).not.toHaveBeenCalled();
    expect(realtimeMocks.useChannel).not.toHaveBeenCalled();
  });

  it('invalidates only the Group TodoLists query for a valid creation event', () => {
    const queryClient = renderGroupRealtime();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const handler = realtimeMocks.useChannel.mock.calls[0]?.[2] as (message: Message) => void;

    act(() =>
      handler({
        name: GroupRealtimeEventType.TODO_LIST_CREATED,
        data: {
          type: GroupRealtimeEventType.TODO_LIST_CREATED,
          groupId: 'group-1',
          todoListId: 'list-1',
        },
      } as Message),
    );

    expect(invalidateQueries).toHaveBeenCalledOnce();
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.todoLists.forGroup('group-1'),
      exact: true,
    });
  });

  it('ignores malformed and mismatched Group events', () => {
    const queryClient = renderGroupRealtime();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const handler = realtimeMocks.useChannel.mock.calls[0]?.[2] as (message: Message) => void;

    act(() => {
      handler({ name: 'UNRELATED', data: {} } as Message);
      handler({
        name: GroupRealtimeEventType.TODO_LIST_CREATED,
        data: {
          type: GroupRealtimeEventType.TODO_LIST_CREATED,
          groupId: 'group-2',
          todoListId: 'list-1',
        },
      } as Message);
    });

    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
