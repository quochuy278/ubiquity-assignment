import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import {
  type GroupResponseDto,
  GroupType,
  InvitationStatus,
  MembershipRole,
  type PendingInvitationResponseDto,
} from '@/api/generated';
import { groupsApi, todoListsApi } from '@/api/groups';
import { invitationsApi } from '@/api/invitations';
import { queryKeys } from '@/api/query-keys';
import { GroupPage, GroupsPage } from '@/features/groups';

const ownerGroup: GroupResponseDto = {
  id: 'group-1',
  type: GroupType.Shared,
  currentUserRole: MembershipRole.Owner,
  name: 'Product team',
  createdById: 'owner-1',
  createdAt: '2026-08-11T10:00:00.000Z',
  updatedAt: '2026-08-11T10:00:00.000Z',
};

function renderAt(element: ReactNode, path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/groups" element={element} />
          <Route path="/groups/:groupId" element={element} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return queryClient;
}

describe('shared-group invitations', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows the invite dialog only to a shared-group owner and submits normalized input', async () => {
    const user = userEvent.setup();
    vi.spyOn(groupsApi, 'groupControllerFindByIdV1').mockResolvedValue({
      data: ownerGroup,
    } as never);
    vi.spyOn(todoListsApi, 'todoListControllerFindForGroupV1').mockResolvedValue({
      data: [],
    } as never);
    const createInvitation = vi
      .spyOn(invitationsApi, 'invitationControllerCreateV1')
      .mockResolvedValue({
        data: {
          id: 'invitation-1',
          groupId: ownerGroup.id,
          email: 'member@example.com',
          status: InvitationStatus.Pending,
          expiresAt: '2026-08-18T10:00:00.000Z',
          createdAt: '2026-08-11T10:00:00.000Z',
        },
      } as never);

    renderAt(<GroupPage />, `/groups/${ownerGroup.id}`);
    await user.click(await screen.findByRole('button', { name: 'Invite member' }));
    await user.type(screen.getByLabelText('Email'), 'Member@Example.com');
    await user.click(screen.getByRole('button', { name: 'Send invitation' }));

    expect(createInvitation).toHaveBeenCalledWith({
      groupId: ownerGroup.id,
      createInvitationDto: { email: 'Member@Example.com' },
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it.each([
    { group: { ...ownerGroup, currentUserRole: MembershipRole.Member }, label: 'member' },
    { group: { ...ownerGroup, currentUserRole: MembershipRole.Admin }, label: 'admin' },
    { group: { ...ownerGroup, type: GroupType.Personal }, label: 'personal-group owner' },
  ])('hides invitation controls from a $label', async ({ group }) => {
    vi.spyOn(groupsApi, 'groupControllerFindByIdV1').mockResolvedValue({ data: group } as never);
    vi.spyOn(todoListsApi, 'todoListControllerFindForGroupV1').mockResolvedValue({
      data: [],
    } as never);
    renderAt(<GroupPage />, `/groups/${group.id}`);
    expect(await screen.findByText('No todo lists')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Invite member' })).not.toBeInTheDocument();
  });

  it('shows pending invitations, accepts one, refreshes caches, and navigates to the group', async () => {
    const user = userEvent.setup();
    const pending: PendingInvitationResponseDto = {
      id: 'invitation-1',
      token: 'token-1',
      groupId: ownerGroup.id,
      groupName: ownerGroup.name,
      groupType: GroupType.Shared,
      inviterId: 'owner-1',
      inviterDisplayName: 'Alex Owner',
      expiresAt: '2026-08-18T10:00:00.000Z',
    };
    vi.spyOn(groupsApi, 'groupControllerFindForUserV1').mockResolvedValue({ data: [] } as never);
    vi.spyOn(invitationsApi, 'invitationControllerFindPendingV1')
      .mockResolvedValueOnce({ data: [pending] } as never)
      .mockResolvedValue({ data: [] } as never);
    const accept = vi.spyOn(invitationsApi, 'invitationControllerAcceptV1').mockResolvedValue({
      data: { ...ownerGroup, currentUserRole: MembershipRole.Member },
    } as never);
    const queryClient = renderAt(<GroupsPage />, '/groups');
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

    expect(await screen.findByText('Pending invitations')).toBeInTheDocument();
    expect(screen.getByText(ownerGroup.name)).toBeInTheDocument();
    expect(screen.getByText(/Invited by Alex Owner/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Accept' }));

    expect(accept).toHaveBeenCalledWith({ token: pending.token });
    await waitFor(() =>
      expect(queryClient.getQueryData(queryKeys.groups.detail(ownerGroup.id))).toMatchObject({
        currentUserRole: MembershipRole.Member,
      }),
    );
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.invitations.pending,
      exact: true,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.groups.all, exact: true });
  });
});
