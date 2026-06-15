"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { Navigation } from "@/components/navigation";
import { SectionHeader } from "@/components/design/SectionHeader";
import { MobileConversionBar } from "@/components/monetization/app-ctas";
import { panelEnter, revealList } from "@/lib/design-system/motion";

interface AppShellBreadcrumb {
  label: string;
  href: string;
}

export interface AppShellProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  breadcrumbs?: AppShellBreadcrumb[];
  actions?: ReactNode;
  className?: string;
  hideTopNav?: boolean;
}

export function AppShell({
  children,
  title,
  subtitle,
  breadcrumbs,
  actions,
  className,
  hideTopNav = false,
}: AppShellProps) {
  const homeCrumb = breadcrumbs && breadcrumbs.length > 0
    ? breadcrumbs
    : [
        { href: "/", label: "Festivals" },
      ];

  return (
    <div className={`min-h-screen theme-ade25 bg-background pb-16 lg:pb-0 ${className ?? ""}`}>
      {!hideTopNav ? (
        <div className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
          <div className="container mx-auto px-5 py-4">
            <Navigation />
          </div>
        </div>
      ) : null}

      <motion.main
        initial="hidden"
        animate="visible"
        variants={panelEnter}
        className="container mx-auto px-5 py-8"
      >
        <SectionHeader
          title={title}
          subtitle={subtitle}
          breadcrumbs={homeCrumb}
          actions={actions}
        />

        <motion.section initial="hidden" animate="visible" variants={revealList}>
          {children}
        </motion.section>
      </motion.main>

      <footer className="border-t border-border/30 py-6 text-center text-xs text-muted-foreground">
        <Link href="/">LineupBase</Link>
        <span className="mx-2">·</span>
        <Link href="/monetize">Advertise</Link>
        <span className="mx-2">·</span>
        <Link href="/insights">Data packs</Link>
        <span className="mx-2">·</span>
        <Link href="/concierge">Concierge</Link>
        <span className="mx-2">·</span>
        <Link href="/pages">All routes</Link>
      </footer>
      <MobileConversionBar />
    </div>
  );
}
