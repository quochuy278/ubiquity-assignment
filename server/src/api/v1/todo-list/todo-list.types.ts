import type { TodoList } from '@prisma/client';

export interface CreateTodoListInput {
  name: string;
  icon?: string;
  color?: string;
}

export type TodoListResult = TodoList;
