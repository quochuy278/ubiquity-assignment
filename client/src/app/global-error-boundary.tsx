import { Component, type ErrorInfo, type ReactNode } from 'react';

interface GlobalErrorBoundaryProps {
  children: ReactNode;
}

interface GlobalErrorBoundaryState {
  hasError: boolean;
}

export class GlobalErrorBoundary extends Component<
  GlobalErrorBoundaryProps,
  GlobalErrorBoundaryState
> {
  state: GlobalErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): GlobalErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Unhandled application error', error, errorInfo);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-svh items-center justify-center bg-muted/30 p-6">
          <div role="alert" className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
            <p className="font-medium text-destructive text-sm">Unexpected error</p>
            <h1 className="mt-2 font-semibold text-2xl tracking-tight">Something went wrong</h1>
            <p className="mt-2 text-muted-foreground text-sm">
              The application encountered an unexpected problem. Reload the page to try again.
            </p>
            <button
              type="button"
              className="mt-5 inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 font-medium text-primary-foreground text-sm hover:bg-primary/80"
              onClick={this.handleReload}
            >
              Reload page
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
