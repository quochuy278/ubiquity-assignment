import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type {
  CreateGroupDto,
  CreateSubTaskDto,
  CreateTodoDto,
  CreateTodoListDto,
  GroupResponseDto,
  SubTaskResponseDto,
  SubtasksApiSubTaskControllerUpdateCompletionV1Request,
  TodoListResponseDto,
  TodoResponseDto,
  TodosApiTodoControllerReorderV1Request,
  TodosApiTodoControllerUpdateCompletionV1Request,
} from '@/api/generated';
import { GroupType } from '@/api/generated';
import { groupsApi, subtasksApi, todoListsApi, todosApi } from '@/api/groups/api';
import { queryKeys } from '@/api/query-keys';

export function useGroupsQuery() {
  return useQuery({
    queryKey: queryKeys.groups.all,
    queryFn: async () => {
      const response = await groupsApi.groupControllerFindForUserV1();

      return response.data;
    },
  });
}

export function useCreateGroupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (createGroupDto: CreateGroupDto) => {
      const response = await groupsApi.groupControllerCreateV1({ createGroupDto });

      return response.data;
    },
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

export function useCreateFirstListMutation() {
  const queryClient = useQueryClient();
  const [personalGroup, setPersonalGroup] = useState<GroupResponseDto>();
  const mutation = useMutation({
    mutationFn: async (name: string) => {
      let group = personalGroup;

      if (!group) {
        const groupResponse = await groupsApi.groupControllerCreateV1({
          createGroupDto: { name: 'Personal', type: GroupType.Personal },
        });
        group = groupResponse.data;
        setPersonalGroup(group);
      }

      const todoListResponse = await todoListsApi.todoListControllerCreateV1({
        groupId: group.id,
        createTodoListDto: { name },
      });

      return { group, todoList: todoListResponse.data };
    },
    onSuccess: async ({ group, todoList }) => {
      queryClient.setQueryData<GroupResponseDto[]>(queryKeys.groups.all, (groups = []) => [
        ...groups.filter((currentGroup) => currentGroup.id !== group.id),
        group,
      ]);
      queryClient.setQueryData(queryKeys.groups.detail(group.id), group);
      queryClient.setQueryData<TodoListResponseDto[]>(queryKeys.todoLists.forGroup(group.id), [
        todoList,
      ]);
      queryClient.setQueryData(queryKeys.todoLists.detail(todoList.id), todoList);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.groups.all, exact: true }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.todoLists.forGroup(group.id),
          exact: true,
        }),
      ]);
    },
  });

  return { ...mutation, hasCreatedPersonalWorkspace: personalGroup !== undefined };
}

export function useGroupQuery(groupId: string) {
  return useQuery({
    queryKey: queryKeys.groups.detail(groupId),
    queryFn: async () => {
      const response = await groupsApi.groupControllerFindByIdV1({ groupId });

      return response.data;
    },
  });
}

export function useTodoListsQuery(groupId: string) {
  return useQuery({
    queryKey: queryKeys.todoLists.forGroup(groupId),
    refetchOnMount: 'always',
    queryFn: async () => {
      const response = await todoListsApi.todoListControllerFindForGroupV1({ groupId });

      return response.data;
    },
  });
}

export function useCreateTodoListMutation(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (createTodoListDto: CreateTodoListDto) => {
      const response = await todoListsApi.todoListControllerCreateV1({
        groupId,
        createTodoListDto,
      });

      return response.data;
    },
    onSuccess: async (todoList) => {
      queryClient.setQueryData<TodoListResponseDto[]>(
        queryKeys.todoLists.forGroup(groupId),
        (todoLists = []) => [
          ...todoLists.filter((currentTodoList) => currentTodoList.id !== todoList.id),
          todoList,
        ],
      );
      queryClient.setQueryData(queryKeys.todoLists.detail(todoList.id), todoList);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.todoLists.forGroup(groupId),
        exact: true,
      });
    },
  });
}

export function useTodoListQuery(todoListId: string) {
  return useQuery({
    queryKey: queryKeys.todoLists.detail(todoListId),
    queryFn: async () => {
      const response = await todoListsApi.todoListControllerFindByIdV1({ todoListId });

      return response.data;
    },
  });
}

export function useTodosQuery(todoListId: string) {
  return useQuery({
    queryKey: queryKeys.todos.forList(todoListId),
    refetchOnMount: 'always',
    queryFn: async () => {
      const response = await todosApi.todoControllerFindForTodoListV1({ todoListId });

      return response.data;
    },
  });
}

export function useCreateTodoMutation(todoListId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (createTodoDto: CreateTodoDto) => {
      const response = await todosApi.todoControllerCreateV1({ todoListId, createTodoDto });

      return response.data;
    },
    onSuccess: async (todo) => {
      queryClient.setQueryData<TodoResponseDto[]>(
        queryKeys.todos.forList(todoListId),
        (todos = []) => [...todos.filter((currentTodo) => currentTodo.id !== todo.id), todo],
      );
      await queryClient.invalidateQueries({
        queryKey: queryKeys.todos.forList(todoListId),
        exact: true,
      });
    },
  });
}

export function useUpdateTodoCompletionMutation(todoListId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: TodosApiTodoControllerUpdateCompletionV1Request) => {
      const response = await todosApi.todoControllerUpdateCompletionV1(request);

      return response.data;
    },
    onSuccess: async (todo) => {
      queryClient.setQueryData<TodoResponseDto[]>(
        queryKeys.todos.forList(todoListId),
        (todos = []) =>
          todos.map((currentTodo) => (currentTodo.id === todo.id ? todo : currentTodo)),
      );
      await queryClient.invalidateQueries({
        queryKey: queryKeys.todos.forList(todoListId),
        exact: true,
      });
    },
  });
}

interface ReorderTodoMutationInput extends TodosApiTodoControllerReorderV1Request {
  orderedTodoIds: string[];
}

export function useReorderTodoMutation(todoListId: string) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.todos.forList(todoListId);

  return useMutation({
    mutationFn: async ({
      orderedTodoIds: _orderedTodoIds,
      ...request
    }: ReorderTodoMutationInput) => {
      const response = await todosApi.todoControllerReorderV1(request);

      return response.data;
    },
    onMutate: async ({ orderedTodoIds }) => {
      await queryClient.cancelQueries({ queryKey, exact: true });
      const previousTodos = queryClient.getQueryData<TodoResponseDto[]>(queryKey);

      queryClient.setQueryData<TodoResponseDto[]>(queryKey, (todos = []) => {
        const orderById = new Map(orderedTodoIds.map((id, index) => [id, index]));
        return [...todos].sort(
          (left, right) =>
            (orderById.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
            (orderById.get(right.id) ?? Number.MAX_SAFE_INTEGER),
        );
      });

      return { previousTodos };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousTodos) queryClient.setQueryData(queryKey, context.previousTodos);
    },
    onSuccess: (todo) => {
      queryClient.setQueryData<TodoResponseDto[]>(queryKey, (todos = []) =>
        todos.map((currentTodo) => (currentTodo.id === todo.id ? todo : currentTodo)),
      );
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey, exact: true });
    },
  });
}

export function useSubtasksQuery(todoId: string) {
  return useQuery({
    queryKey: queryKeys.subtasks.forTodo(todoId),
    refetchOnMount: 'always',
    queryFn: async () => {
      const response = await subtasksApi.subTaskControllerFindForTodoV1({ todoId });

      return response.data;
    },
  });
}

export function useCreateSubtaskMutation(todoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (createSubTaskDto: CreateSubTaskDto) => {
      const response = await subtasksApi.subTaskControllerCreateV1({ todoId, createSubTaskDto });

      return response.data;
    },
    onSuccess: async (subtask) => {
      queryClient.setQueryData<SubTaskResponseDto[]>(
        queryKeys.subtasks.forTodo(todoId),
        (subtasks = []) => [
          ...subtasks.filter((currentSubtask) => currentSubtask.id !== subtask.id),
          subtask,
        ],
      );
      await queryClient.invalidateQueries({
        queryKey: queryKeys.subtasks.forTodo(todoId),
        exact: true,
      });
    },
  });
}

export function useUpdateSubtaskCompletionMutation(todoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: SubtasksApiSubTaskControllerUpdateCompletionV1Request) => {
      const response = await subtasksApi.subTaskControllerUpdateCompletionV1(request);

      return response.data;
    },
    onSuccess: async (subtask) => {
      queryClient.setQueryData<SubTaskResponseDto[]>(
        queryKeys.subtasks.forTodo(todoId),
        (subtasks = []) =>
          subtasks.map((currentSubtask) =>
            currentSubtask.id === subtask.id ? subtask : currentSubtask,
          ),
      );
      await queryClient.invalidateQueries({
        queryKey: queryKeys.subtasks.forTodo(todoId),
        exact: true,
      });
    },
  });
}
