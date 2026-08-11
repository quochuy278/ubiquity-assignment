import { Navigate, useParams } from 'react-router-dom';
import { CreateTodoDialog } from '@/features/groups/components/create-todo-dialog';
import { GroupBreadcrumbs } from '@/features/groups/components/group-breadcrumbs';
import { GroupPageSection } from '@/features/groups/components/group-page-section';
import { SortableTodoList } from '@/features/groups/components/sortable-todo-list';
import { useGroup, useTodoList, useTodos } from '@/features/groups/hooks';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { TodoListRealtime } from '@/realtime/todo-list-realtime';
import { ApiError } from '@/shared/components/api-error';
import { EmptyState } from '@/shared/components/empty-state';
import { PageLoading } from '@/shared/components/page-loading';

export function TodoListPage() {
  const { groupId = '', todoListId = '' } = useParams();
  const {
    data: group,
    error: groupError,
    isError: hasGroupError,
    isPending: isLoadingGroup,
    refetch: refetchGroup,
  } = useGroup(groupId);
  const {
    data: todoList,
    error: todoListError,
    isError: hasTodoListError,
    isPending: isLoadingTodoList,
    isSuccess: hasLoadedTodoList,
    refetch: refetchTodoList,
  } = useTodoList(todoListId);
  const {
    data: todos,
    error: todosError,
    isError: hasTodosError,
    isPending: isLoadingTodos,
    refetch: refetchTodos,
  } = useTodos(todoListId);
  const listTitle = hasLoadedTodoList && todoList.groupId === groupId ? todoList.name : 'Todo List';
  useDocumentTitle(listTitle);

  if (isLoadingTodoList) {
    return <PageLoading label="Loading todos" />;
  }
  if (hasTodoListError) {
    return <ApiError error={todoListError} onRetry={() => refetchTodoList()} />;
  }
  if (todoList.groupId !== groupId) return <Navigate to="/groups" replace />;

  if (isLoadingGroup || isLoadingTodos) {
    return <PageLoading label="Loading todos" />;
  }
  if (hasGroupError) return <ApiError error={groupError} onRetry={() => refetchGroup()} />;
  if (hasTodosError) return <ApiError error={todosError} onRetry={() => refetchTodos()} />;

  return (
    <TodoListRealtime
      groupType={group.type}
      todoIds={todos.map((todo) => todo.id)}
      todoListId={todoListId}
    >
      <div className="space-y-4">
        <GroupBreadcrumbs groupId={groupId} groupName={group.name} todoListName={todoList.name} />
        <GroupPageSection title={todoList.name} description="Todos in this list.">
          {todos.length === 0 ? (
            <EmptyState
              title="No todos"
              description="Create a todo to start tracking work in this list."
              action={<CreateTodoDialog todoListId={todoListId} />}
            />
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                <CreateTodoDialog todoListId={todoListId} />
              </div>
              <SortableTodoList todos={todos} todoListId={todoListId} />
            </div>
          )}
        </GroupPageSection>
      </div>
    </TodoListRealtime>
  );
}
