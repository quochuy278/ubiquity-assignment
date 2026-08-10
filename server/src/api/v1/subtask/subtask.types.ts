import type { SubTask } from '@prisma/client';

export interface CreateSubTaskInput {
  title: string;
}

export type SubTaskResult = SubTask;

export interface SubTaskCompletionTransitionResult {
  subtask: SubTaskResult | null;
  transitioned: boolean;
}

export interface SubTaskDeletionTransitionResult {
  subtask: SubTaskResult | null;
  transitioned: boolean;
}
