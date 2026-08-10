import { Navigate, useParams } from 'react-router-dom';
import { CircleCheckIcon } from 'lucide-react';
import { TodoStatus } from '@/api/generated';
import { CreateTodoDialog } from '@/features/groups/components/create-todo-dialog';
import { GroupBreadcrumbs } from '@/features/groups/components/group-breadcrumbs';
import { GroupPageSection } from '@/features/groups/components/group-page-section';
import { TodoCompletionControl } from '@/features/groups/components/todo-completion-control';
import { TodoSubtasks } from '@/features/groups/components/todo-subtasks';
import { useGroup, useTodoList, useTodos } from '@/features/groups/hooks';
import { ApiError } from '@/shared/components/api-error';
import { EmptyState } from '@/shared/components/empty-state';
import { PageLoading } from '@/shared/components/page-loading';
import { Card, CardContent } from '@/shared/components/ui/card';

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
            <div className="space-y-2">
              {todos.data.map((todo) => {
                const isCompleted = todo.status === TodoStatus.NUMBER_20;

                return (
                  <Card key={todo.id} size="sm">
                    <CardContent className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-2">
                          {isCompleted && (
                            <CircleCheckIcon
                              className="mt-0.5 size-5 shrink-0 text-green-600"
                              aria-hidden="true"
                            />
                          )}
                          {isCompleted && <span className="sr-only">Completed</span>}
                          <div>
                            <p
                              className={
                                isCompleted
                                  ? 'text-muted-foreground font-medium line-through'
                                  : 'font-medium'
                              }
                            >
                              {todo.title}
                            </p>
                            {todo.description && (
                              <p className="mt-1 text-muted-foreground text-sm">
                                {todo.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <TodoCompletionControl todo={todo} todoListId={todoListId} />
                      </div>
                      <TodoSubtasks todoId={todo.id} />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </GroupPageSection>
    </div>
  );
}
