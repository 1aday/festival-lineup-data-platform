"use client";

import { type ReactNode } from "react";

interface DataTableChromeProps {
  title?: string;
  description?: string;
  children: ReactNode;
}

export function DataTableChrome({ title, description, children }: DataTableChromeProps) {
  return (
    <section className="rounded-xl border border-border/60 bg-card/80">
      {(title || description) ? (
        <header className="border-b border-border/70 px-4 py-3">
          {title ? <h3 className="text-sm font-semibold">{title}</h3> : null}
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </header>
      ) : null}
      <div className="overflow-x-auto px-3 py-3">
        {children}
      </div>
    </section>
  );
}
