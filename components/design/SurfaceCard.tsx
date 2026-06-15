"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { panelEnter } from "@/lib/design-system/motion";
import { cn } from "@/lib/utils";

interface SurfaceCardProps {
  title?: string;
  subtitle?: string;
  className?: string;
  children: ReactNode;
  leading?: ReactNode;
}

export function SurfaceCard({ title, subtitle, className, children, leading }: SurfaceCardProps) {
  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={panelEnter}
      className={cn(
        "relative overflow-hidden rounded-[var(--radius)] border border-primary/20 glass-panel p-5",
        "before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/5 before:to-transparent",
        className,
      )}
    >
      {(title || subtitle) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-xl font-semibold">{title}</h2>}
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {leading ? <div className="shrink-0 text-sm text-muted-foreground">{leading}</div> : null}
        </div>
      )}
      {children}
    </motion.section>
  );
}
