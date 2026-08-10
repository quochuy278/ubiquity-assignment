import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { groupsApi, todoListsApi, todosApi } from '@/api/groups/api';
import type { CreateGroupDto, GroupResponseDto } from '@/api/generated';
import { queryKeys } from '@/api/query-keys';

export function useGroupsQuery() {
  return useQuery({
    queryKey: queryKeys.groups.all,
    queryFn: async () => (await groupsApi.groupControllerFindForUserV1()).data,
  });
}

export function useCreateGroupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (createGroupDto: CreateGroupDto) =>
      (await groupsApi.groupControllerCreateV1({ createGroupDto })).data,
    onSuccess: async (group) => {
      queryClient.setQueryData<GroupResponseDto[]>(queryKeys.groups.all, (groups = []) => [
        ...groups.filter((currentGroup) => currentGroup.id !== group.id),
        group,
      ]);
      queryClient.setQueryData(queryKeys.groups.detail(group.id), group);
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.all, exact: true });
    },
  });
}

export function useGroupQuery(groupId: string) {
  return useQuery({
    queryKey: queryKeys.groups.detail(groupId),
    queryFn: async () => (await groupsApi.groupControllerFindByIdV1({ groupId })).data,
  });
}

export function useTodoListsQuery(groupId: string) {
  return useQuery({
    queryKey: queryKeys.todoLists.forGroup(groupId),
    queryFn: async () => (await todoListsApi.todoListControllerFindForGroupV1({ groupId })).data,
  });
}

export function useTodoListQuery(todoListId: string) {
  return useQuery({
    queryKey: queryKeys.todoLists.detail(todoListId),
    queryFn: async () => (await todoListsApi.todoListControllerFindByIdV1({ todoListId })).data,
  });
}

export function useTodosQuery(todoListId: string) {
  return useQuery({
    queryKey: queryKeys.todos.forList(todoListId),
    queryFn: async () => (await todosApi.todoControllerFindForTodoListV1({ todoListId })).data,
  });
}
