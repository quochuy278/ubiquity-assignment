import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';

vi.mock('ably/react', () => ({
  AblyProvider: ({ children }: { children: ReactNode }) => children,
  ChannelProvider: ({ children }: { children: ReactNode }) => children,
  useChannel: () => ({ ably: { connection: { state: 'connected' } } }),
  useConnectionStateListener: () => undefined,
}));

class ResizeObserverMock implements ResizeObserver {
  disconnect() {}
  observe() {}
  unobserve() {}
}

globalThis.ResizeObserver ??= ResizeObserverMock;
