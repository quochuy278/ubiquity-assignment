import { generatedApiConfiguration, httpClient } from '@/api/api-client';
import { GroupsApi, TodoListsApi, TodosApi } from '@/api/generated';

export const groupsApi = new GroupsApi(generatedApiConfiguration, undefined, httpClient);
export const todoListsApi = new TodoListsApi(generatedApiConfiguration, undefined, httpClient);
export const todosApi = new TodosApi(generatedApiConfiguration, undefined, httpClient);
