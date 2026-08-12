import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { activitiesApi } from '@/api/activities';
import {
  type ActivityResponseDto,
  ActivityType,
  type GroupResponseDto,
  GroupType,
  MembershipRole,
  type TodoListResponseDto,
} from '@/api/generated';
import { groupsApi, todoListsApi } from '@/api/groups';
import { GroupPage } from '@/features/groups';
import { formatCompactRelativeTime } from '@/features/groups/components/recent-activity';

const groupId = 'group-activity';
const sharedGroup: GroupResponseDto = {
  id: groupId,
  type: GroupType.Shared,
  currentUserRole: MembershipRole.Member,
  name: 'Release team',
  createdById: 'owner-1',
  createdAt: '2026-08-12T09:00:00.000Z',
  updatedAt: '2026-08-12T09:00:00.000Z',
};
const todoList: TodoListResponseDto = {
  id: 'list-1',
  groupId,
  name: 'Submission checklist',
  icon: null,
  color: null,
  rank: '1000',
  createdAt: '2026-08-12T09:00:00.000Z',
  updatedAt: '2026-08-12T09:00:00.000Z',
};
const internalActorId = 'cmsn2yceh0000osskaxlltvw4';
const longActorName =
  'Huy-Nguyen-With-An-Intentionally-Long-Unbroken-Display-Name-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

const eventCases: Array<[ActivityType, string]> = [
  [ActivityType.TodoListCreated, 'created a list'],
  [ActivityType.TodoCreated, 'created a todo'],
  [ActivityType.TodoCompleted, 'completed a todo'],
  [ActivityType.TodoUncompleted, 'reopened a todo'],
  [ActivityType.TodoReordered, 'reordered todos'],
  [ActivityType.TodoDeleted, 'deleted a todo'],
  [ActivityType.SubtaskCreated, 'added a subtask'],
  [ActivityType.SubtaskCompleted, 'completed a subtask'],
  [ActivityType.SubtaskUncompleted, 'reopened a subtask'],
  [ActivityType.SubtaskDeleted, 'deleted a subtask'],
];

function activity(type: ActivityType, index: number): ActivityResponseDto {
  return {
    id: `activity-${index}`,
    groupId,
    actorId: index === 0 ? internalActorId : `user-${index}`,
    actor: {
      id: index === 0 ? internalActorId : `user-${index}`,
      name: index === 0 ? longActorName : `Team member ${index}`,
    },
    type,
    entityType: type === ActivityType.TodoListCreated ? 'TODO_LIST' : 'TODO',
    entityId: `entity-${index}`,
    createdAt: `2026-08-12T09:${String(index).padStart(2, '0')}:00.000Z`,
  };
}

function renderGroup(group: GroupResponseDto = sharedGroup) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  vi.spyOn(groupsApi, 'groupControllerFindByIdV1').mockResolvedValue({ data: group } as never);
  vi.spyOn(todoListsApi, 'todoListControllerFindForGroupV1').mockResolvedValue({
    data: [todoList],
  } as never);

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/groups/${group.id}`]}>
        <Routes>
          <Route path="/groups/:groupId" element={<GroupPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('recent workspace activity', () => {
  afterEach(() => vi.restoreAllMocks());

  it('renders at most five recent events with quiet human-readable copy', async () => {
    const items = eventCases.map(([type], index) => activity(type, index));
    const findActivity = vi
      .spyOn(activitiesApi, 'activityControllerFindForGroupV1')
      .mockResolvedValue({ data: { items, nextCursor: 'older-page' } } as never);

    renderGroup();

    const region = await screen.findByRole('region', { name: 'Recent activity' });
    expect(findActivity).toHaveBeenCalledWith({ groupId, limit: 5 });
    const longActor = await within(region).findByText(longActorName);
    expect(longActor).toBeInTheDocument();
    expect(longActor.parentElement).toHaveClass('[overflow-wrap:anywhere]');
    expect(region).not.toHaveTextContent(internalActorId);
    const activityList = within(region).getByRole('list', { name: 'Recent workspace activity' });
    expect(within(activityList).getAllByRole('listitem')).toHaveLength(5);
    for (const [, wording] of eventCases.slice(0, 5)) {
      expect(region).toHaveTextContent(wording);
    }
    expect(region).not.toHaveTextContent(eventCases[5]?.[1] ?? 'deleted a todo');
    const timestamps = region.querySelectorAll('time');
    expect(timestamps[0]).toHaveAttribute('datetime', items[0]?.createdAt);
    expect(timestamps[0]).toHaveAttribute('title');
  });

  it('formats overview timestamps compactly while retaining old-date context', () => {
    const now = new Date('2026-08-12T23:00:00.000Z');

    expect(formatCompactRelativeTime(new Date('2026-08-12T22:59:30.000Z'), now)).toBe('now');
    expect(formatCompactRelativeTime(new Date('2026-08-12T22:55:00.000Z'), now)).toBe('5m ago');
    expect(formatCompactRelativeTime(new Date('2026-08-12T09:00:00.000Z'), now)).toBe('14h ago');
    expect(formatCompactRelativeTime(new Date('2026-08-09T23:00:00.000Z'), now)).toBe('3d ago');
    expect(formatCompactRelativeTime(new Date('2025-08-12T23:00:00.000Z'), now)).toMatch(/2025/);
  });

  it('uses human-safe copy when an actor display name is empty and entity details are unavailable', async () => {
    const item = activity(ActivityType.TodoCompleted, 1);
    item.actor.name = '   ';
    vi.spyOn(activitiesApi, 'activityControllerFindForGroupV1').mockResolvedValue({
      data: { items: [item], nextCursor: null },
    } as never);

    renderGroup();

    const region = await screen.findByRole('region', { name: 'Recent activity' });
    expect(await within(region).findByText('Someone')).toBeInTheDocument();
    expect(region).toHaveTextContent('Someone completed a todo');
    expect(region).not.toHaveTextContent(item.actorId);
    expect(region).not.toHaveTextContent(item.entityId);
  });

  it('shows a lightweight empty state', async () => {
    vi.spyOn(activitiesApi, 'activityControllerFindForGroupV1').mockResolvedValue({
      data: { items: [], nextCursor: null },
    } as never);

    renderGroup();

    const region = await screen.findByRole('region', { name: 'Recent activity' });
    expect(await within(region).findByText('No activity yet.')).toBeInTheDocument();
  });

  it('isolates an activity failure from usable workspace content', async () => {
    vi.spyOn(activitiesApi, 'activityControllerFindForGroupV1').mockRejectedValue(
      new Error('Activity failed'),
    );

    renderGroup();

    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: todoList.name })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create list' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('does not render or request activity for a personal workspace', async () => {
    const findActivity = vi.spyOn(activitiesApi, 'activityControllerFindForGroupV1');

    renderGroup({ ...sharedGroup, type: GroupType.Personal });

    expect(await screen.findByRole('link', { name: todoList.name })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Recent activity' })).not.toBeInTheDocument();
    expect(findActivity).not.toHaveBeenCalled();
  });
});
