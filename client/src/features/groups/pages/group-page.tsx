import { ChevronRightIcon, ListTodoIcon } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { GroupType, MembershipRole } from '@/api/generated';
import { CreateTodoListDialog } from '@/features/groups/components/create-todo-list-dialog';
import { GroupBreadcrumbs } from '@/features/groups/components/group-breadcrumbs';
import { GroupPageSection } from '@/features/groups/components/group-page-section';
import { InviteMemberDialog } from '@/features/groups/components/invite-member-dialog';
import { useGroup, useTodoLists } from '@/features/groups/hooks';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { GroupRealtime } from '@/realtime/group-realtime';
import { ApiError } from '@/shared/components/api-error';
import { EmptyState } from '@/shared/components/empty-state';
import { PageLoading } from '@/shared/components/page-loading';
import { Card, CardContent } from '@/shared/components/ui/card';

export function GroupPage() {
  const { groupId = '' } = useParams();
  const group = useGroup(groupId);
  const lists = useTodoLists(groupId);
  useDocumentTitle(group.isSuccess ? group.data.name : 'Group');

  if (group.isPending || lists.isPending) return <PageLoading label="Loading group" />;
  if (group.isError) return <ApiError error={group.error} onRetry={() => group.refetch()} />;
  if (lists.isError) return <ApiError error={lists.error} onRetry={() => lists.refetch()} />;

  return (
    <GroupRealtime groupId={groupId} groupType={group.data.type}>
      <div className="space-y-4">
        <GroupBreadcrumbs groupId={groupId} groupName={group.data.name} />
        <GroupPageSection title={group.data.name} description="Todo lists in this group.">
          {group.data.type === GroupType.Shared &&
            group.data.currentUserRole === MembershipRole.Owner && (
              <div className="flex justify-end">
                <InviteMemberDialog groupId={groupId} />
              </div>
            )}
          {lists.data.length === 0 ? (
            <EmptyState
              title="No todo lists"
              description="Create a list to start organizing todos."
              action={<CreateTodoListDialog groupId={groupId} />}
            />
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                <CreateTodoListDialog groupId={groupId} />
              </div>
              <div className="space-y-3">
                {lists.data.map((list) => (
                  <Link key={list.id} to={`/groups/${groupId}/lists/${list.id}`}>
                    <Card className="mb-3 transition-colors hover:bg-muted/40">
                      <CardContent className="flex items-center gap-3">
                        <ListTodoIcon className="size-5 text-muted-foreground" aria-hidden="true" />
                        <span className="flex-1 font-medium">{list.name}</span>
                        <ChevronRightIcon
                          className="size-4 text-muted-foreground"
                          aria-hidden="true"
                        />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </GroupPageSection>
      </div>
    </GroupRealtime>
  );
}
