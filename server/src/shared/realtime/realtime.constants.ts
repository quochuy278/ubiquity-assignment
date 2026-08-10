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

export const groupChannelName = (groupId: string): string => `group:${groupId}`;
export const todoListChannelName = (todoListId: string): string => `todo-list:${todoListId}`;
