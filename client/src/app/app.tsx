import { Button } from '@/shared/components/ui/button';
import { TooltipProvider } from '@/shared/components/ui/tooltip';

export function App() {
  return (
    <TooltipProvider>
      <main className="flex min-h-svh items-center justify-center bg-background p-6 text-foreground">
        <section className="flex max-w-md flex-col items-center gap-4 text-center">
          <h1 className="font-semibold text-3xl tracking-tight">Client is ready</h1>
          <p className="text-muted-foreground text-sm">
            Tailwind CSS and the shared shadcn component library are configured.
          </p>
          <Button type="button">Get started</Button>
        </section>
      </main>
    </TooltipProvider>
  );
}
