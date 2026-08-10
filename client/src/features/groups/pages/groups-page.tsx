import { ChevronRightIcon, UsersIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GroupType } from '@/api/generated';
import { CreateGroupDialog } from '@/features/groups/components/create-group-dialog';
import { GroupPageSection } from '@/features/groups/components/group-page-section';
import { useGroups } from '@/features/groups/hooks';
import { ApiError } from '@/shared/components/api-error';
import { EmptyState } from '@/shared/components/empty-state';
import { PageLoading } from '@/shared/components/page-loading';
import { Card, CardHeader, CardTitle } from '@/shared/components/ui/card';

export function GroupsPage() {
  const groups = useGroups();

  if (groups.isPending) return <PageLoading label="Loading groups" />;
  if (groups.isError) return <ApiError error={groups.error} onRetry={() => groups.refetch()} />;

  return (
    <GroupPageSection title="Groups" description="Your personal and shared workspaces.">
      {groups.data.length === 0 ? (
        <EmptyState
          title="No groups yet"
          description="Create a group to start organizing todo lists."
          action={<CreateGroupDialog />}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <CreateGroupDialog />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {groups.data.map((group) => (
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
                    <ChevronRightIcon
                      className="size-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </GroupPageSection>
  );
}
