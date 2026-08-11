import {
  useCreateGroupMutation,
  useCreateSubtaskMutation,
  useCreateTodoListMutation,
  useCreateTodoMutation,
  useGroupQuery,
  useGroupsQuery,
  useReorderTodoMutation,
  useSubtasksQuery,
  useTodoListQuery,
  useTodoListsQuery,
  useTodosQuery,
  useUpdateSubtaskCompletionMutation,
  useUpdateTodoCompletionMutation,
} from '@/api/groups';

export function useCreateGroup() {
  return useCreateGroupMutation();
}

export function useCreateTodoList(groupId: string) {
  return useCreateTodoListMutation(groupId);
}

export function useCreateTodo(todoListId: string) {
  return useCreateTodoMutation(todoListId);
}

export function useCreateSubtask(todoId: string) {
  return useCreateSubtaskMutation(todoId);
}

export function useUpdateSubtaskCompletion(todoId: string) {
  return useUpdateSubtaskCompletionMutation(todoId);
}

export function useUpdateTodoCompletion(todoListId: string) {
  return useUpdateTodoCompletionMutation(todoListId);
}

export function useReorderTodo(todoListId: string) {
  return useReorderTodoMutation(todoListId);
}

export function useGroups() {
  return useGroupsQuery();
}

export function useGroup(groupId: string) {
  return useGroupQuery(groupId);
}

export function useTodoLists(groupId: string) {
  return useTodoListsQuery(groupId);
}

export function useTodoList(todoListId: string) {
  return useTodoListQuery(todoListId);
}

export function useTodos(todoListId: string) {
  return useTodosQuery(todoListId);
}

export function useSubtasks(todoId: string) {
  return useSubtasksQuery(todoId);
}
