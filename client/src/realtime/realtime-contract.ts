export enum TodoListRealtimeEventType {
  TODO_CREATED = 'TODO_CREATED',
  TODO_COMPLETION_CHANGED = 'TODO_COMPLETION_CHANGED',
  TODO_REORDERED = 'TODO_REORDERED',
  SUBTASK_CREATED = 'SUBTASK_CREATED',
  SUBTASK_COMPLETION_CHANGED = 'SUBTASK_COMPLETION_CHANGED',
}

export enum GroupRealtimeEventType {
  TODO_LIST_CREATED = 'TODO_LIST_CREATED',
}

export interface GroupRealtimeEvent {
  type: GroupRealtimeEventType.TODO_LIST_CREATED;
  groupId: string;
  todoListId: string;
}

export interface TodoRealtimeEvent {
  type:
    | TodoListRealtimeEventType.TODO_CREATED
    | TodoListRealtimeEventType.TODO_COMPLETION_CHANGED
    | TodoListRealtimeEventType.TODO_REORDERED;
  todoListId: string;
  todoId: string;
}

export interface SubtaskRealtimeEvent {
  type:
    | TodoListRealtimeEventType.SUBTASK_CREATED
    | TodoListRealtimeEventType.SUBTASK_COMPLETION_CHANGED;
  todoListId: string;
  todoId: string;
  subtaskId: string;
}

export type TodoListRealtimeEvent = TodoRealtimeEvent | SubtaskRealtimeEvent;

export const groupChannelName = (groupId: string): string => `group:${groupId}`;
export const todoListChannelName = (todoListId: string): string => `todo-list:${todoListId}`;

export function isGroupRealtimeEvent(value: unknown): value is GroupRealtimeEvent {
  if (typeof value !== 'object' || value === null) return false;

  const candidate = value as Record<string, unknown>;
  return (
    candidate.type === GroupRealtimeEventType.TODO_LIST_CREATED &&
    typeof candidate.groupId === 'string' &&
    typeof candidate.todoListId === 'string'
  );
}

export function isTodoListRealtimeEvent(value: unknown): value is TodoListRealtimeEvent {
  if (typeof value !== 'object' || value === null) return false;

  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.type !== 'string' ||
    typeof candidate.todoListId !== 'string' ||
    typeof candidate.todoId !== 'string'
  ) {
    return false;
  }

  switch (candidate.type) {
    case TodoListRealtimeEventType.TODO_CREATED:
    case TodoListRealtimeEventType.TODO_COMPLETION_CHANGED:
    case TodoListRealtimeEventType.TODO_REORDERED:
      return true;
    case TodoListRealtimeEventType.SUBTASK_CREATED:
    case TodoListRealtimeEventType.SUBTASK_COMPLETION_CHANGED:
      return typeof candidate.subtaskId === 'string';
    default:
      return false;
  }
}
