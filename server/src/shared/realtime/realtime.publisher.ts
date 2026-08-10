import type { GroupRealtimeEvent, TodoListRealtimeEvent } from './realtime.types';

export abstract class RealtimePublisher {
  abstract publishGroupEvent(event: GroupRealtimeEvent): Promise<void>;
  abstract publishTodoListEvent(event: TodoListRealtimeEvent): Promise<void>;
}
