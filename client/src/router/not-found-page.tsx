import { Link } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { buttonVariants } from '@/shared/components/ui/button';

export function NotFoundPage() {
  useDocumentTitle('Page not found');

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 text-center shadow-sm">
        <p className="font-medium text-muted-foreground text-sm">404</p>
        <h1 className="mt-2 font-semibold text-2xl tracking-tight">Page not found</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          The page you requested does not exist or may have moved.
        </p>
        <Link className={buttonVariants({ className: 'mt-5' })} to="/">
          Return home
        </Link>
      </div>
    </main>
  );
}
