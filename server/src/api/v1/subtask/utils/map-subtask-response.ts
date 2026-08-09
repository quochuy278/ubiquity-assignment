import { toIsoDateTime } from '../../../../shared/utils/time.utilities';
import type { SubTaskResponseDto } from '../dto/subtask-response.dto';
import type { SubTaskResult } from '../subtask.types';

export function mapSubTaskResponse(subtask: SubTaskResult): SubTaskResponseDto {
  return {
    id: subtask.id,
    todoId: subtask.todoId,
    title: subtask.title,
    completed: subtask.completed,
    rank: subtask.rank.toString(),
    createdAt: toIsoDateTime(subtask.createdAt),
    updatedAt: toIsoDateTime(subtask.updatedAt),
  };
}
