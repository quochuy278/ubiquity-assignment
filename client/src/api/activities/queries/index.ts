import { useQuery } from '@tanstack/react-query';
import { activitiesApi } from '@/api/activities/api';
import { queryKeys } from '@/api/query-keys';

const RECENT_ACTIVITY_LIMIT = 5;

export function useRecentActivityQuery(groupId: string) {
  return useQuery({
    queryKey: queryKeys.activities.forGroup(groupId),
    queryFn: async () => {
      const response = await activitiesApi.activityControllerFindForGroupV1({
        groupId,
        limit: RECENT_ACTIVITY_LIMIT,
      });

      return response.data.items.slice(0, RECENT_ACTIVITY_LIMIT);
    },
  });
}
