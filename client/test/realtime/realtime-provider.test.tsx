import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { RealtimeProvider } from '@/realtime/realtime-provider';

const providerMocks = vi.hoisted(() => {
  const client = { id: 'global-realtime-client' };
  return {
    ablyProvider: vi.fn(({ children }: { children: ReactNode }) => children),
    client,
    createRealtimeClient: vi.fn(() => client),
  };
});

vi.mock('@/config/configuration', () => ({
  configuration: { realtime: { ablyKey: 'subscribe-only-key' } },
}));

vi.mock('@/realtime/realtime-client', () => ({
  createRealtimeClient: providerMocks.createRealtimeClient,
}));

vi.mock('ably/react', () => ({
  AblyProvider: providerMocks.ablyProvider,
}));

describe('RealtimeProvider', () => {
  it('creates one application-level client and provides it to the app tree', () => {
    render(
      <RealtimeProvider>
        <h1>Application</h1>
      </RealtimeProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Application' })).toBeInTheDocument();
    expect(providerMocks.createRealtimeClient).toHaveBeenCalledOnce();
    expect(providerMocks.createRealtimeClient).toHaveBeenCalledWith('subscribe-only-key');
    expect(providerMocks.ablyProvider).toHaveBeenCalledWith(
      expect.objectContaining({ client: providerMocks.client }),
      undefined,
    );
  });
});
