export enum TodoListRealtimeEventType {
  TODO_CREATED = 'TODO_CREATED',
  TODO_COMPLETION_CHANGED = 'TODO_COMPLETION_CHANGED',
  TODO_REORDERED = 'TODO_REORDERED',
  SUBTASK_CREATED = 'SUBTASK_CREATED',
  SUBTASK_COMPLETION_CHANGED = 'SUBTASK_COMPLETION_CHANGED',
}

export const todoListChannelName = (todoListId: string): string => `todo-list:${todoListId}`;
