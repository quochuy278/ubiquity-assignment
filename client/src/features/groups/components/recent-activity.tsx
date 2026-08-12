import { useRecentActivityQuery } from '@/api/activities';
import { getApiErrorMessage } from '@/api/errors';
import { type ActivityResponseDto, ActivityType } from '@/api/generated';
import { SafeButton } from '@/shared/components/safe-button';

const MINUTE_IN_MS = 60 * 1000;
const HOUR_IN_MS = 60 * MINUTE_IN_MS;
const DAY_IN_MS = 24 * HOUR_IN_MS;
const RELATIVE_DATE_CUTOFF_IN_MS = 7 * DAY_IN_MS;

const activityDescriptions: Record<ActivityType, string> = {
  [ActivityType.TodoListCreated]: 'created a list',
  [ActivityType.TodoCreated]: 'created a todo',
  [ActivityType.TodoCompleted]: 'completed a todo',
  [ActivityType.TodoUncompleted]: 'reopened a todo',
  [ActivityType.TodoReordered]: 'reordered todos',
  [ActivityType.TodoDeleted]: 'deleted a todo',
  [ActivityType.SubtaskCreated]: 'added a subtask',
  [ActivityType.SubtaskCompleted]: 'completed a subtask',
  [ActivityType.SubtaskUncompleted]: 'reopened a subtask',
  [ActivityType.SubtaskDeleted]: 'deleted a subtask',
};

export function formatCompactRelativeTime(createdAt: Date, now = new Date()): string {
  const elapsed = Math.max(0, now.getTime() - createdAt.getTime());

  if (elapsed < MINUTE_IN_MS) return 'now';
  if (elapsed < HOUR_IN_MS) return `${Math.floor(elapsed / MINUTE_IN_MS)}m ago`;
  if (elapsed < DAY_IN_MS) return `${Math.floor(elapsed / HOUR_IN_MS)}h ago`;
  if (elapsed < RELATIVE_DATE_CUTOFF_IN_MS) return `${Math.floor(elapsed / DAY_IN_MS)}d ago`;

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    ...(createdAt.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  }).format(createdAt);
}

function ActivityRow({ activity }: { activity: ActivityResponseDto }) {
  const createdAt = new Date(activity.createdAt);
  const exactTimestamp = createdAt.toLocaleString();
  const actorName = activity.actor.name.trim() || 'Someone';

  return (
    <li className="flex min-w-0 flex-col gap-1 py-2.5 first:pt-0 last:pb-0 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-3">
      <p className="min-w-0 text-sm [overflow-wrap:anywhere]">
        <span className="font-medium">{actorName}</span> {activityDescriptions[activity.type]}
      </p>
      <time
        className="shrink-0 self-start whitespace-nowrap text-muted-foreground text-xs sm:justify-self-end"
        dateTime={activity.createdAt}
        title={exactTimestamp}
      >
        {formatCompactRelativeTime(createdAt)}
      </time>
    </li>
  );
}

export function RecentActivity({ groupId }: { groupId: string }) {
  const {
    data: activities,
    error,
    isError,
    isFetching,
    isPending,
    refetch,
  } = useRecentActivityQuery(groupId);

  return (
    <section className="min-w-0 space-y-3 pt-2" aria-labelledby="recent-activity-title">
      <h2 className="font-medium text-base" id="recent-activity-title">
        Recent activity
      </h2>
      {isPending && (
        <p className="text-muted-foreground text-sm" role="status">
          Loading recent activity...
        </p>
      )}
      {isError && (
        <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-sm [overflow-wrap:anywhere]">
          <span className="first-letter:uppercase">{getApiErrorMessage(error)}</span>
          <SafeButton
            variant="ghost"
            size="xs"
            pending={isFetching}
            pendingText="Retrying..."
            onAction={() => refetch()}
          >
            Retry
          </SafeButton>
        </div>
      )}
      {activities?.length === 0 && (
        <p className="text-muted-foreground text-sm">No activity yet.</p>
      )}
      {activities && activities.length > 0 && (
        <ul className="divide-y" aria-label="Recent workspace activity">
          {activities.map((activity) => (
            <ActivityRow key={activity.id} activity={activity} />
          ))}
        </ul>
      )}
    </section>
  );
}
