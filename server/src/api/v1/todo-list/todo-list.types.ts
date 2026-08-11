import type { TodoList } from '@prisma/client';
import type { GroupResult } from '../group/group.types';

export interface CreateTodoListInput {
  name: string;
  icon?: string;
  color?: string;
}

export type TodoListResult = TodoList;

export interface TodoListAccessResult {
  group: GroupResult;
  todoList: TodoListResult;
}
