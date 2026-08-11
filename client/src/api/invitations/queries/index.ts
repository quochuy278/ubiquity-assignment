import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateInvitationDto, GroupResponseDto } from '@/api/generated';
import { invitationsApi } from '@/api/invitations/api';
import { queryKeys } from '@/api/query-keys';

export function usePendingInvitationsQuery() {
  return useQuery({
    queryKey: queryKeys.invitations.pending,
    queryFn: async () => {
      const response = await invitationsApi.invitationControllerFindPendingV1();

      return response.data;
    },
  });
}

export function useCreateInvitationMutation(groupId: string) {
  return useMutation({
    mutationFn: async (createInvitationDto: CreateInvitationDto) => {
      const response = await invitationsApi.invitationControllerCreateV1({
        groupId,
        createInvitationDto,
      });

      return response.data;
    },
  });
}

export function useAcceptInvitationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (token: string) => {
      const response = await invitationsApi.invitationControllerAcceptV1({ token });

      return response.data;
    },
    onSuccess: async (group) => {
      queryClient.setQueryData<GroupResponseDto>(queryKeys.groups.detail(group.id), group);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.invitations.pending, exact: true }),
        queryClient.invalidateQueries({ queryKey: queryKeys.groups.all, exact: true }),
      ]);
    },
  });
}
