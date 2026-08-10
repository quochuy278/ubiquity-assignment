import type { TodoListRealtimeEventType } from './realtime.constants';

export interface TodoRealtimeEvent {
  type:
    | TodoListRealtimeEventType.TODO_CREATED
    | TodoListRealtimeEventType.TODO_COMPLETION_CHANGED
    | TodoListRealtimeEventType.TODO_REORDERED;
  todoListId: string;
  todoId: string;
}

export interface SubTaskRealtimeEvent {
  type:
    | TodoListRealtimeEventType.SUBTASK_CREATED
    | TodoListRealtimeEventType.SUBTASK_COMPLETION_CHANGED;
  todoListId: string;
  todoId: string;
  subtaskId: string;
}

export type TodoListRealtimeEvent = TodoRealtimeEvent | SubTaskRealtimeEvent;
