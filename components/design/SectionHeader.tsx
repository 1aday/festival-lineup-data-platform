"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { fadeIn } from "@/lib/design-system/motion";
import { cn } from "@/lib/utils";

interface Breadcrumb {
  label: string;
  href: string;
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: ReactNode;
  className?: string;
}

export function SectionHeader({ title, subtitle, breadcrumbs, actions, className }: SectionHeaderProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      className={cn("mb-6 space-y-3", className)}
    >
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <div className="inline-flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {breadcrumbs.map((crumb, index) => (
            <span key={`${crumb.href}-${crumb.label}`} className="inline-flex items-center gap-2">
              <Link href={crumb.href} className="hover:text-foreground">
                {crumb.label}
              </Link>
              {index < breadcrumbs.length - 1 ? <span>›</span> : null}
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </motion.div>
  );
}
