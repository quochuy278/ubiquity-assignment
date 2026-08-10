import { useParams } from 'react-router-dom';
import { TodoStatus, type TodoStatus as TodoStatusValue } from '@/api/generated';
import { CreateTodoDialog } from '@/features/groups/components/create-todo-dialog';
import { GroupBreadcrumbs } from '@/features/groups/components/group-breadcrumbs';
import { GroupPageSection } from '@/features/groups/components/group-page-section';
import { TodoCompletionControl } from '@/features/groups/components/todo-completion-control';
import { TodoSubtasks } from '@/features/groups/components/todo-subtasks';
import { useGroup, useTodoList, useTodos } from '@/features/groups/hooks';
import { ApiError } from '@/shared/components/api-error';
import { EmptyState } from '@/shared/components/empty-state';
import { PageLoading } from '@/shared/components/page-loading';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent } from '@/shared/components/ui/card';

function getTodoStatusLabel(status: TodoStatusValue) {
  switch (status) {
    case TodoStatus.NUMBER_10:
      return 'Active';
    case TodoStatus.NUMBER_20:
      return 'Completed';
  }

  return 'Unknown';
}

export function TodoListPage() {
  const { groupId = '', todoListId = '' } = useParams();
  const group = useGroup(groupId);
  const list = useTodoList(todoListId);
  const todos = useTodos(todoListId);

  if (group.isPending || list.isPending || todos.isPending) {
    return <PageLoading label="Loading todos" />;
  }
  if (group.isError) return <ApiError error={group.error} onRetry={() => group.refetch()} />;
  if (list.isError) return <ApiError error={list.error} onRetry={() => list.refetch()} />;
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
              {todos.data.map((todo) => (
                <Card key={todo.id} size="sm">
                  <CardContent className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">{todo.title}</p>
                        {todo.description && (
                          <p className="mt-1 text-muted-foreground text-sm">{todo.description}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <Badge variant="outline">{getTodoStatusLabel(todo.status)}</Badge>
                        <TodoCompletionControl todo={todo} todoListId={todoListId} />
                      </div>
                    </div>
                    <TodoSubtasks todoId={todo.id} />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </GroupPageSection>
    </div>
  );
}
