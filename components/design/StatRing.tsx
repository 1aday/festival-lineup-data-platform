"use client";

interface StatRingProps {
  value: number;
  max: number;
  label: string;
}

export function StatRing({ value, max, label }: StatRingProps) {
  const pct = Math.max(0, Math.min(100, Math.round((value / Math.max(1, max)) * 100)));

  return (
    <div className="rounded-lg border border-border/80 p-3 bg-card/70">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary via-accent to-secondary"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-sm font-semibold">
        {value}/{max}
      </p>
    </div>
  );
}
