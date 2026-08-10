import { createContext, useContext } from 'react';

export const RealtimeAvailableContext = createContext(false);

export function useRealtimeAvailable() {
  return useContext(RealtimeAvailableContext);
}
