import type { SubTask } from '@prisma/client';

export interface CreateSubTaskInput {
  title: string;
}

export type SubTaskResult = SubTask;

export interface SubTaskCompletionTransitionResult {
  subtask: SubTaskResult;
  transitioned: boolean;
}
