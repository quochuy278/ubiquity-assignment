import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SafeButton } from '@/shared/components/safe-button';

describe('SafeButton', () => {
  it('locks synchronous rapid clicks and shows the pending presentation', async () => {
    let resolveAction: () => void = () => undefined;
    const onAction = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveAction = resolve;
        }),
    );
    render(
      <SafeButton onAction={onAction} pendingText="Completing...">
        Complete
      </SafeButton>,
    );

    const button = screen.getByRole('button', { name: 'Complete' });
    act(() => {
      button.click();
      button.click();
    });

    expect(onAction).toHaveBeenCalledOnce();
    const pendingButton = screen.getByRole('button', { name: 'Completing...' });
    expect(pendingButton).toBeDisabled();
    expect(pendingButton).toHaveAttribute('aria-busy', 'true');
    expect(pendingButton.querySelector('.animate-spin')).not.toBeNull();

    await act(async () => resolveAction());
    expect(screen.getByRole('button', { name: 'Complete' })).toBeEnabled();
  });

  it('uses default pending content and releases the lock after success', async () => {
    const user = userEvent.setup();
    let resolveAction: () => void = () => undefined;
    const onAction = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveAction = resolve;
          }),
      )
      .mockResolvedValueOnce(undefined);
    render(<SafeButton onAction={onAction}>Save</SafeButton>);

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('button', { name: 'Please wait...' })).toBeDisabled();
    await act(async () => resolveAction());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onAction).toHaveBeenCalledTimes(2);
  });

  it('releases the lock after failure so the action can be retried', async () => {
    const user = userEvent.setup();
    const mutation = vi
      .fn()
      .mockRejectedValueOnce(new Error('Action failed'))
      .mockResolvedValueOnce(undefined);
    const onAction = vi.fn(async () => {
      try {
        await mutation();
      } catch {
        return;
      }
    });
    render(<SafeButton onAction={onAction}>Save</SafeButton>);

    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onAction).toHaveBeenCalledTimes(2);
    expect(mutation).toHaveBeenCalledTimes(2);
  });

  it('supports custom pending content', () => {
    render(
      <SafeButton
        onAction={() => Promise.resolve()}
        pending
        pendingContent={<span>Custom loader</span>}
      >
        Save
      </SafeButton>,
    );

    expect(screen.getByRole('button', { name: 'Custom loader' })).toBeDisabled();
    expect(screen.queryByText('Please wait...')).not.toBeInTheDocument();
    expect(screen.queryByText('Save')).not.toBeInTheDocument();
  });
});
