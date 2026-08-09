import type { SubTask } from '@prisma/client';

export interface CreateSubTaskInput {
  title: string;
}

export type SubTaskResult = SubTask;
