import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateInvitationDto, GroupResponseDto } from '@/api/generated';
import { invitationsApi } from '@/api/invitations/api';
import { queryKeys } from '@/api/query-keys';

export function usePendingInvitationsQuery() {
  return useQuery({
    queryKey: queryKeys.invitations.pending,
    queryFn: async () => (await invitationsApi.invitationControllerFindPendingV1()).data,
  });
}

export function useCreateInvitationMutation(groupId: string) {
  return useMutation({
    mutationFn: async (createInvitationDto: CreateInvitationDto) =>
      (await invitationsApi.invitationControllerCreateV1({ groupId, createInvitationDto })).data,
  });
}

export function useAcceptInvitationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (token: string) =>
      (await invitationsApi.invitationControllerAcceptV1({ token })).data,
    onSuccess: async (group) => {
      queryClient.setQueryData<GroupResponseDto>(queryKeys.groups.detail(group.id), group);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.invitations.pending, exact: true }),
        queryClient.invalidateQueries({ queryKey: queryKeys.groups.all, exact: true }),
      ]);
    },
  });
}
