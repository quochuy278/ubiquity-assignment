import { toIsoDateTime } from '../../../../shared/utils/time.utilities';
import type { TodoListResponseDto } from '../dto/todo-list-response.dto';
import type { TodoListResult } from '../todo-list.types';

export function mapTodoListResponse(todoList: TodoListResult): TodoListResponseDto {
  return {
    id: todoList.id,
    groupId: todoList.groupId,
    name: todoList.name,
    icon: todoList.icon,
    color: todoList.color,
    rank: todoList.rank.toString(),
    createdAt: toIsoDateTime(todoList.createdAt),
    updatedAt: toIsoDateTime(todoList.updatedAt),
  };
}
