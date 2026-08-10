import type { Rest } from 'ably';
import { AblyRealtimePublisher } from '../../../../src/shared/realtime/ably-realtime.publisher';
import {
  TodoListRealtimeEventType,
  todoListChannelName,
} from '../../../../src/shared/realtime/realtime.constants';

describe('TodoList realtime Ably boundary', () => {
  it('centralizes the exact TodoList channel convention', () => {
    expect(todoListChannelName('list-123')).toBe('todo-list:list-123');
  });

  it('maps the application event to its TodoList channel without leaking Ably to services', async () => {
    const publish = jest.fn().mockResolvedValue(undefined);
    const get = jest.fn().mockReturnValue({ publish });
    const publisher = new AblyRealtimePublisher({ channels: { get } } as unknown as Rest);
    const event = {
      type: TodoListRealtimeEventType.SUBTASK_CREATED,
      todoListId: 'list-1',
      todoId: 'todo-1',
      subtaskId: 'subtask-1',
    } as const;

    await publisher.publishTodoListEvent(event);

    expect(get).toHaveBeenCalledWith('todo-list:list-1');
    expect(publish).toHaveBeenCalledWith(TodoListRealtimeEventType.SUBTASK_CREATED, event);
  });
});
