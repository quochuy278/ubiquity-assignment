import type { Rest } from 'ably';
import type { ApplicationLoggerService } from '../../../../src/common/logger/logger.service';
import { AblyRealtimePublisher } from '../../../../src/shared/realtime/ably-realtime.publisher';
import {
  GroupRealtimeEventType,
  groupChannelName,
  TodoListRealtimeEventType,
  todoListChannelName,
} from '../../../../src/shared/realtime/realtime.constants';

describe('TodoList realtime Ably boundary', () => {
  it('centralizes the exact TodoList channel convention', () => {
    expect(todoListChannelName('list-123')).toBe('todo-list:list-123');
    expect(groupChannelName('group-123')).toBe('group:group-123');
  });

  it('publishes TodoList creation to its Group channel', async () => {
    const publish = jest.fn().mockResolvedValue(undefined);
    const get = jest.fn().mockReturnValue({ publish });
    const success = jest.fn();
    const publisher = new AblyRealtimePublisher(
      { channels: { get } } as unknown as Rest,
      { success } as unknown as ApplicationLoggerService,
    );
    const event = {
      type: GroupRealtimeEventType.TODO_LIST_CREATED,
      groupId: 'group-1',
      todoListId: 'list-1',
    } as const;

    await publisher.publishGroupEvent(event);

    expect(get).toHaveBeenCalledWith('group:group-1');
    expect(publish).toHaveBeenCalledWith(GroupRealtimeEventType.TODO_LIST_CREATED, event);
    expect(success).toHaveBeenCalledWith(
      'Realtime event published',
      {
        channelName: 'group:group-1',
        eventType: GroupRealtimeEventType.TODO_LIST_CREATED,
        groupId: 'group-1',
        todoListId: 'list-1',
      },
      AblyRealtimePublisher.name,
    );
  });

  it('maps the application event to its TodoList channel without leaking Ably to services', async () => {
    const publish = jest.fn().mockResolvedValue(undefined);
    const get = jest.fn().mockReturnValue({ publish });
    const success = jest.fn();
    const publisher = new AblyRealtimePublisher(
      { channels: { get } } as unknown as Rest,
      { success } as unknown as ApplicationLoggerService,
    );
    const event = {
      type: TodoListRealtimeEventType.SUBTASK_CREATED,
      todoListId: 'list-1',
      todoId: 'todo-1',
      subtaskId: 'subtask-1',
    } as const;

    await publisher.publishTodoListEvent(event);

    expect(get).toHaveBeenCalledWith('todo-list:list-1');
    expect(publish).toHaveBeenCalledWith(TodoListRealtimeEventType.SUBTASK_CREATED, event);
    expect(success).toHaveBeenCalledWith(
      'Realtime event published',
      {
        channelName: 'todo-list:list-1',
        eventType: TodoListRealtimeEventType.SUBTASK_CREATED,
        todoListId: 'list-1',
        todoId: 'todo-1',
        subtaskId: 'subtask-1',
      },
      AblyRealtimePublisher.name,
    );
  });
});
