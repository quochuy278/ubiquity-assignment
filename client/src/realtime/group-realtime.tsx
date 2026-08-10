import { useQueryClient } from '@tanstack/react-query';
import type { Message } from 'ably';
import { ChannelProvider, useChannel } from 'ably/react';
import type { ReactNode } from 'react';
import { GroupType } from '@/api/generated';
import { queryKeys } from '@/api/query-keys';
import { useRealtimeAvailable } from './realtime-context';
import {
  GroupRealtimeEventType,
  groupChannelName,
  isGroupRealtimeEvent,
} from './realtime-contract';

interface GroupRealtimeProps {
  children: ReactNode;
  groupId: string;
  groupType: GroupType;
}

interface GroupRealtimeSubscriberProps {
  channelName: string;
  groupId: string;
}

const channelOptions = { attachOnSubscribe: true } as const;

function GroupRealtimeSubscriber({ channelName, groupId }: GroupRealtimeSubscriberProps) {
  const queryClient = useQueryClient();

  useChannel(channelName, GroupRealtimeEventType.TODO_LIST_CREATED, (message: Message) => {
    if (!isGroupRealtimeEvent(message.data)) return;
    if (message.name !== message.data.type || message.data.groupId !== groupId) return;

    void queryClient.invalidateQueries({
      queryKey: queryKeys.todoLists.forGroup(groupId),
      exact: true,
    });
  });

  return null;
}

export function GroupRealtime({ children, groupId, groupType }: GroupRealtimeProps) {
  const realtimeAvailable = useRealtimeAvailable();
  if (groupType !== GroupType.Shared || !realtimeAvailable) return children;

  const channelName = groupChannelName(groupId);

  return (
    <ChannelProvider key={channelName} channelName={channelName} options={channelOptions}>
      <GroupRealtimeSubscriber channelName={channelName} groupId={groupId} />
      {children}
    </ChannelProvider>
  );
}
