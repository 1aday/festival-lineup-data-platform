'use client';

import { ListMusic } from 'lucide-react';

import { cn } from '@/lib/utils';

interface BrandWordmarkProps {
  className?: string;
  markClassName?: string;
  textClassName?: string;
  showText?: boolean;
}

export function BrandWordmark({
  className,
  markClassName,
  textClassName,
  showText = true,
}: BrandWordmarkProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span
        className={cn(
          'relative inline-flex h-8 w-8 items-center justify-center rounded-md border border-primary/40 bg-primary/12 text-primary shadow-sm shadow-primary/10',
          markClassName
        )}
        aria-hidden="true"
      >
        <span className="absolute inset-1 rounded-[5px] border border-primary/20" />
        <ListMusic className="relative h-5 w-5" strokeWidth={1.9} />
      </span>
      {showText ? (
        <span
          className={cn(
            'font-semibold tracking-tight text-foreground',
            textClassName
          )}
        >
          LineupBase
        </span>
      ) : null}
    </span>
  );
}
