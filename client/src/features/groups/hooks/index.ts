import {
  useCreateGroupMutation,
  useCreateTodoMutation,
  useCreateTodoListMutation,
  useGroupQuery,
  useGroupsQuery,
  useTodoListQuery,
  useTodoListsQuery,
  useTodosQuery,
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

export function useUpdateTodoCompletion(todoListId: string) {
  return useUpdateTodoCompletionMutation(todoListId);
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
