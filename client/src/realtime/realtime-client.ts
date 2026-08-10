import { Realtime } from 'ably';

export function createRealtimeClient(ablyKey: string | null): Realtime | null {
  if (!ablyKey) return null;

  try {
    return new Realtime({ key: ablyKey });
  } catch {
    return null;
  }
}
