import { Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/shared/components/ui/breadcrumb';

export function GroupBreadcrumbs({
  groupId,
  groupName,
  todoListName,
}: {
  groupId: string;
  groupName: string;
  todoListName?: string;
}) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link to="/groups" />}>Groups</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem className="min-w-0">
          {todoListName ? (
            <BreadcrumbLink
              className="max-w-48 truncate sm:max-w-80"
              render={<Link to={`/groups/${groupId}`} />}
              title={groupName}
            >
              {groupName}
            </BreadcrumbLink>
          ) : (
            <span
              aria-current="page"
              className="max-w-48 truncate font-normal text-foreground sm:max-w-80"
              title={groupName}
            >
              {groupName}
            </span>
          )}
        </BreadcrumbItem>
        {todoListName && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="min-w-0">
              <span
                aria-current="page"
                className="max-w-48 truncate font-normal text-foreground sm:max-w-80"
                title={todoListName}
              >
                {todoListName}
              </span>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
