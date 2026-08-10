import { AblyProvider } from 'ably/react';
import type { ReactNode } from 'react';
import { configuration } from '@/config/configuration';
import { createRealtimeClient } from './realtime-client';
import { RealtimeAvailableContext } from './realtime-context';

interface RealtimeProviderProps {
  children: ReactNode;
}

const realtimeClient = createRealtimeClient(configuration.realtime.ablyKey);

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  if (!realtimeClient) return children;

  return (
    <AblyProvider client={realtimeClient}>
      <RealtimeAvailableContext value>{children}</RealtimeAvailableContext>
    </AblyProvider>
  );
}
