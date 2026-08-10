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
        <h1 className="font-semibold text-2xl tracking-tight">{title}</h1>
        <p className="mt-1 text-muted-foreground text-sm">{description}</p>
      </header>
      {children}
    </section>
  );
}
