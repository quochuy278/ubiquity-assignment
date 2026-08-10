import { ChevronRightIcon, ListTodoIcon } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { GroupPageSection } from '@/features/groups/components/group-page-section';
import { useGroup, useTodoLists } from '@/features/groups/hooks';
import { ApiError } from '@/shared/components/api-error';
import { EmptyState } from '@/shared/components/empty-state';
import { PageLoading } from '@/shared/components/page-loading';
import { Card, CardContent } from '@/shared/components/ui/card';

export function GroupPage() {
  const { groupId = '' } = useParams();
  const group = useGroup(groupId);
  const lists = useTodoLists(groupId);

  if (group.isPending || lists.isPending) return <PageLoading label="Loading group" />;
  if (group.isError) return <ApiError error={group.error} onRetry={() => group.refetch()} />;
  if (lists.isError) return <ApiError error={lists.error} onRetry={() => lists.refetch()} />;

  return (
    <GroupPageSection title={group.data.name} description="Todo lists in this group.">
      {lists.data.length === 0 ? (
        <EmptyState
          title="No todo lists"
          description="List creation belongs to the next feature pass."
        />
      ) : (
        <div className="space-y-3">
          {lists.data.map((list) => (
            <Link key={list.id} to={`/groups/${groupId}/lists/${list.id}`}>
              <Card className="mb-3 transition-colors hover:bg-muted/40">
                <CardContent className="flex items-center gap-3">
                  <ListTodoIcon className="size-5 text-muted-foreground" aria-hidden="true" />
                  <span className="flex-1 font-medium">{list.name}</span>
                  <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </GroupPageSection>
  );
}
