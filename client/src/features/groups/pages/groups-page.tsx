import { ChevronRightIcon, UsersIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GroupType } from '@/api/generated';
import { CreateFirstListDialog } from '@/features/groups/components/create-first-list-dialog';
import { CreateGroupDialog } from '@/features/groups/components/create-group-dialog';
import { GroupPageSection } from '@/features/groups/components/group-page-section';
import { PendingInvitations } from '@/features/groups/components/pending-invitations';
import { useGroups } from '@/features/groups/hooks';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { ApiError } from '@/shared/components/api-error';
import { EmptyState } from '@/shared/components/empty-state';
import { PageLoading } from '@/shared/components/page-loading';
import { Card, CardHeader, CardTitle } from '@/shared/components/ui/card';

export function GroupsPage() {
  const {
    data: groups,
    error: groupsError,
    isError: hasGroupsError,
    isPending: isLoadingGroups,
    refetch: refetchGroups,
  } = useGroups();
  useDocumentTitle('Lists');

  if (isLoadingGroups) return <PageLoading label="Loading lists" />;
  if (hasGroupsError) return <ApiError error={groupsError} onRetry={() => refetchGroups()} />;

  if (groups.length === 0) {
    return (
      <GroupPageSection title="Welcome" description="A simple place to organize your tasks.">
        <PendingInvitations />
        <EmptyState
          title="Create your first list"
          description="Start with a personal list for your own tasks. Shared workspaces will be here when you want to collaborate."
          action={<CreateFirstListDialog />}
        />
      </GroupPageSection>
    );
  }

  return (
    <GroupPageSection title="Lists" description="Your personal and shared workspaces.">
      <PendingInvitations />
      <div className="space-y-4">
        <div className="flex justify-end">
          <CreateGroupDialog />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {groups.map((group) => (
            <Link key={group.id} to={`/groups/${group.id}`}>
              <Card className="h-full transition-colors hover:bg-muted/40">
                <CardHeader className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                  <UsersIcon className="size-5 text-muted-foreground" aria-hidden="true" />
                  <div>
                    <CardTitle>{group.name}</CardTitle>
                    <p className="mt-1 text-muted-foreground text-xs">
                      {group.type === GroupType.Shared ? 'Shared' : 'Personal'}
                    </p>
                  </div>
                  <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </GroupPageSection>
  );
}
