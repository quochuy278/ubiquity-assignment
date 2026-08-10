import { Navigate, useParams } from 'react-router-dom';
import { CreateTodoDialog } from '@/features/groups/components/create-todo-dialog';
import { GroupBreadcrumbs } from '@/features/groups/components/group-breadcrumbs';
import { GroupPageSection } from '@/features/groups/components/group-page-section';
import { SortableTodoList } from '@/features/groups/components/sortable-todo-list';
import { useGroup, useTodoList, useTodos } from '@/features/groups/hooks';
import { TodoListRealtime } from '@/realtime/todo-list-realtime';
import { ApiError } from '@/shared/components/api-error';
import { EmptyState } from '@/shared/components/empty-state';
import { PageLoading } from '@/shared/components/page-loading';

export function TodoListPage() {
  const { groupId = '', todoListId = '' } = useParams();
  const group = useGroup(groupId);
  const list = useTodoList(todoListId);
  const todos = useTodos(todoListId);

  if (list.isPending) {
    return <PageLoading label="Loading todos" />;
  }
  if (list.isError) return <ApiError error={list.error} onRetry={() => list.refetch()} />;
  if (list.data.groupId !== groupId) return <Navigate to="/groups" replace />;

  if (group.isPending || todos.isPending) {
    return <PageLoading label="Loading todos" />;
  }
  if (group.isError) return <ApiError error={group.error} onRetry={() => group.refetch()} />;
  if (todos.isError) return <ApiError error={todos.error} onRetry={() => todos.refetch()} />;

  return (
    <TodoListRealtime
      groupType={group.data.type}
      todoIds={todos.data.map((todo) => todo.id)}
      todoListId={todoListId}
    >
      <div className="space-y-4">
        <GroupBreadcrumbs
          groupId={groupId}
          groupName={group.data.name}
          todoListName={list.data.name}
        />
        <GroupPageSection title={list.data.name} description="Todos in this list.">
          {todos.data.length === 0 ? (
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
              <SortableTodoList todos={todos.data} todoListId={todoListId} />
            </div>
          )}
        </GroupPageSection>
      </div>
    </TodoListRealtime>
  );
}
