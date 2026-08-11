import { render, screen } from '@testing-library/react';
import { GlobalErrorBoundary } from '@/app/global-error-boundary';

function CrashingChild(): never {
  throw new Error('Render failed');
}

describe('GlobalErrorBoundary', () => {
  it('renders a recovery screen when a descendant crashes', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <GlobalErrorBoundary>
        <CrashingChild />
      </GlobalErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });
});
