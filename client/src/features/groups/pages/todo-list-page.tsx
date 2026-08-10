import { useParams } from 'react-router-dom';
import { GroupPageSection } from '@/features/groups/components/group-page-section';
import { useTodoList, useTodos } from '@/features/groups/hooks';
import { ApiError } from '@/shared/components/api-error';
import { EmptyState } from '@/shared/components/empty-state';
import { PageLoading } from '@/shared/components/page-loading';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent } from '@/shared/components/ui/card';

export function TodoListPage() {
  const { todoListId = '' } = useParams();
  const list = useTodoList(todoListId);
  const todos = useTodos(todoListId);

  if (list.isPending || todos.isPending) return <PageLoading label="Loading todos" />;
  if (list.isError) return <ApiError error={list.error} onRetry={() => list.refetch()} />;
  if (todos.isError) return <ApiError error={todos.error} onRetry={() => todos.refetch()} />;

  return (
    <GroupPageSection title={list.data.name} description="Todos in this list.">
      {todos.data.length === 0 ? (
        <EmptyState
          title="No todos"
          description="Todo creation belongs to the next feature pass."
        />
      ) : (
        <div className="space-y-2">
          {todos.data.map((todo) => (
            <Card key={todo.id} size="sm">
              <CardContent className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{todo.title}</p>
                  {todo.description && (
                    <p className="mt-1 text-muted-foreground text-sm">{todo.description}</p>
                  )}
                </div>
                <Badge variant="outline">{todo.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </GroupPageSection>
  );
}
