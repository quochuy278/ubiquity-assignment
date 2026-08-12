import { act, render, screen, waitFor } from '@testing-library/react';
import {
  createToastManager,
  DEFAULT_TOAST_TIMEOUT_MS,
  Toaster,
} from '@/shared/components/ui/toast';

describe('toast auto-dismiss', () => {
  it('defaults to three seconds', () => {
    expect(DEFAULT_TOAST_TIMEOUT_MS).toBe(3_000);
  });

  it('forwards the configured timeout to the toast provider', async () => {
    const toastManager = createToastManager();
    render(<Toaster timeout={20} toastManager={toastManager} />);

    act(() => {
      toastManager.add({ title: 'Saved', type: 'success' });
    });
    expect(screen.getByText('Saved')).toBeInTheDocument();

    await waitFor(() => expect(screen.queryByText('Saved')).not.toBeInTheDocument());
  });
});
