import type { Todo } from '@prisma/client';

export interface CreateTodoInput {
  title: string;
  description?: string | null;
  dueDate?: Date | null;
}

export interface UpdateTodoCompletionInput {
  status: number;
  completedAt: Date | null;
  updatedById: string;
}

export type TodoResult = Todo;

export interface TodoAccessResult {
  todo: TodoResult;
  groupId: string;
}
