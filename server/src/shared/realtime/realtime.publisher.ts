import type { TodoListRealtimeEvent } from './realtime.types';

export abstract class RealtimePublisher {
  abstract publishTodoListEvent(event: TodoListRealtimeEvent): Promise<void>;
}
