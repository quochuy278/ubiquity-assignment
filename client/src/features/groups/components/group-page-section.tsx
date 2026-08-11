import type { ReactNode } from 'react';

export function GroupPageSection({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="space-y-6">
      <header>
        <h1
          className="font-semibold text-2xl tracking-tight [overflow-wrap:anywhere]"
          title={title}
        >
          {title}
        </h1>
        <p className="mt-1 text-muted-foreground text-sm [overflow-wrap:anywhere]">{description}</p>
      </header>
      {children}
    </section>
  );
}
