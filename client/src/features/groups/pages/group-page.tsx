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
  const {
    data: group,
    error: groupError,
    isError: hasGroupError,
    isPending: isLoadingGroup,
    isSuccess: hasLoadedGroup,
    refetch: refetchGroup,
  } = useGroup(groupId);
  const {
    data: todoLists,
    error: todoListsError,
    isError: hasTodoListsError,
    isPending: isLoadingTodoLists,
    refetch: refetchTodoLists,
  } = useTodoLists(groupId);
  useDocumentTitle(hasLoadedGroup ? group.name : 'Group');

  if (isLoadingGroup || isLoadingTodoLists) return <PageLoading label="Loading group" />;
  if (hasGroupError) return <ApiError error={groupError} onRetry={() => refetchGroup()} />;
  if (hasTodoListsError) {
    return <ApiError error={todoListsError} onRetry={() => refetchTodoLists()} />;
  }

  return (
    <GroupRealtime groupId={groupId} groupType={group.type}>
      <div className="space-y-4">
        <GroupBreadcrumbs groupId={groupId} groupName={group.name} />
        <GroupPageSection title={group.name} description="Todo lists in this group.">
          {group.type === GroupType.Shared && group.currentUserRole === MembershipRole.Owner && (
            <div className="flex justify-end">
              <InviteMemberDialog groupId={groupId} />
            </div>
          )}
          {todoLists.length === 0 ? (
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
                {todoLists.map((list) => (
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
