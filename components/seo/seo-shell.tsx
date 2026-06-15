import Link from 'next/link';
import type { ReactNode } from 'react';

type Breadcrumb = {
  label: string;
  href: string;
};

export function SeoShell({
  breadcrumbs,
  children,
}: {
  breadcrumbs: Breadcrumb[];
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70 bg-background/95">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            LineupBase
          </Link>
          <nav className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground" aria-label="Primary">
            <Link className="hover:text-foreground" href="/artists">Artists</Link>
            <Link className="hover:text-foreground" href="/countries">Countries</Link>
            <Link className="hover:text-foreground" href="/genres">Genres</Link>
            <Link className="hover:text-foreground" href="/rising-artists">Rising</Link>
            <Link className="hover:text-foreground" href="/events">Events</Link>
            <Link className="rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground hover:bg-primary/90" href="/monetize">
              Export artist data
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8">
        <nav className="mb-7 flex flex-wrap items-center gap-2 text-xs text-muted-foreground" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.href} className="inline-flex items-center gap-2">
              {index > 0 ? <span>/</span> : null}
              <Link href={crumb.href} className="hover:text-foreground">
                {crumb.label}
              </Link>
            </span>
          ))}
        </nav>
        {children}
      </main>

      <footer className="border-t border-border/50 px-5 py-8 text-center text-sm text-muted-foreground">
        <Link href="/">LineupBase</Link>
        <span className="mx-2">·</span>
        <Link href="/countries">Countries</Link>
        <span className="mx-2">·</span>
        <Link href="/genres">Genres</Link>
      </footer>
    </div>
  );
}
