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

export interface TodoCompletionTransitionResult {
  todo: TodoResult | null;
  transitioned: boolean;
}

export interface TodoDeletionTransitionResult {
  todo: TodoResult | null;
  transitioned: boolean;
}

export type TodoReorderTransitionResult =
  | { kind: 'notFound' }
  | { kind: 'invalidAnchor' }
  | { kind: 'noOp'; todo: TodoResult }
  | { kind: 'reordered'; todo: TodoResult };

export type TodoResult = Todo;

export interface TodoAccessResult {
  todo: TodoResult;
  groupId: string;
}
