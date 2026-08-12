import { ChevronRightIcon, ListTodoIcon } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { GroupType, MembershipRole } from '@/api/generated';
import { CreateTodoListDialog } from '@/features/groups/components/create-todo-list-dialog';
import { GroupBreadcrumbs } from '@/features/groups/components/group-breadcrumbs';
import { GroupPageSection } from '@/features/groups/components/group-page-section';
import { InviteMemberDialog } from '@/features/groups/components/invite-member-dialog';
import { RecentActivity } from '@/features/groups/components/recent-activity';
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
  useDocumentTitle(hasLoadedGroup ? group.name : 'Workspace');

  if (isLoadingGroup || isLoadingTodoLists) return <PageLoading label="Loading workspace" />;
  if (hasGroupError) return <ApiError error={groupError} onRetry={() => refetchGroup()} />;
  if (hasTodoListsError) {
    return <ApiError error={todoListsError} onRetry={() => refetchTodoLists()} />;
  }

  return (
    <GroupRealtime groupId={groupId} groupType={group.type}>
      <div className="space-y-4">
        <GroupBreadcrumbs groupId={groupId} groupName={group.name} />
        <GroupPageSection title={group.name} description="Lists in this workspace.">
          {group.type === GroupType.Shared && group.currentUserRole === MembershipRole.Owner && (
            <div className="flex justify-end">
              <InviteMemberDialog groupId={groupId} />
            </div>
          )}
          {todoLists.length === 0 ? (
            <EmptyState
              title="No lists yet"
              description="Create your first list in this workspace."
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
                        <span className="min-w-0 flex-1 truncate font-medium" title={list.name}>
                          {list.name}
                        </span>
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
        {group.type === GroupType.Shared && <RecentActivity groupId={groupId} />}
      </div>
    </GroupRealtime>
  );
}
