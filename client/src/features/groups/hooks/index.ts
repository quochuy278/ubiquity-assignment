import {
  useCreateGroupMutation,
  useGroupQuery,
  useGroupsQuery,
  useTodoListQuery,
  useTodoListsQuery,
  useTodosQuery,
} from '@/api/groups';

export function useCreateGroup() {
  return useCreateGroupMutation();
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
