export const queryKeys = {
  activities: {
    forGroup: (groupId: string) => ['groups', groupId, 'activities'] as const,
  },
  auth: {
    me: ['auth', 'me'] as const,
  },
  groups: {
    all: ['groups'] as const,
    detail: (groupId: string) => ['groups', groupId] as const,
  },
  invitations: {
    pending: ['invitations', 'pending'] as const,
  },
  todoLists: {
    forGroup: (groupId: string) => ['groups', groupId, 'todo-lists'] as const,
    detail: (todoListId: string) => ['todo-lists', todoListId] as const,
  },
  todos: {
    forList: (todoListId: string) => ['todo-lists', todoListId, 'todos'] as const,
  },
  subtasks: {
    forTodo: (todoId: string) => ['todos', todoId, 'subtasks'] as const,
  },
};
