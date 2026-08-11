import {
  useCreateFirstListMutation,
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
import {
  useAcceptInvitationMutation,
  useCreateInvitationMutation,
  usePendingInvitationsQuery,
} from '@/api/invitations';

export function useCreateInvitation(groupId: string) {
  return useCreateInvitationMutation(groupId);
}

export function usePendingInvitations() {
  return usePendingInvitationsQuery();
}

export function useAcceptInvitation() {
  return useAcceptInvitationMutation();
}

export function useCreateGroup() {
  return useCreateGroupMutation();
}

export function useCreateFirstList() {
  return useCreateFirstListMutation();
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
