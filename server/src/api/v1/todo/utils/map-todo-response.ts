import { toIsoDateTime } from '../../../../shared/utils/time.utilities';
import type { TodoResponseDto } from '../dto/todo-response.dto';
import type { TodoResult } from '../todo.types';

export function mapTodoResponse(todo: TodoResult): TodoResponseDto {
  return {
    id: todo.id,
    todoListId: todo.todoListId,
    title: todo.title,
    description: todo.description,
    status: todo.status,
    rank: todo.rank.toString(),
    dueDate: todo.dueDate ? toIsoDateTime(todo.dueDate) : null,
    completedAt: todo.completedAt ? toIsoDateTime(todo.completedAt) : null,
    assignedToId: todo.assignedToId,
    createdById: todo.createdById,
    updatedById: todo.updatedById,
    createdAt: toIsoDateTime(todo.createdAt),
    updatedAt: toIsoDateTime(todo.updatedAt),
  };
}
