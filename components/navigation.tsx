'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  Database,
  Globe,
  Megaphone,
  Menu,
  Music2,
  Radar,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import type { ReactNode } from "react";

import { BrandWordmark } from "@/components/brand-wordmark";
import { cn } from "@/lib/utils";

interface NavigationItem {
  label: string;
  href: string;
  icon: typeof Music2;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}

const PRIMARY_ITEMS: NavigationItem[] = [
  { label: "Artists", href: "/artists", icon: Users },
  { label: "Countries", href: "/countries", icon: Globe },
  { label: "Genres", href: "/genres", icon: Sparkles },
  { label: "Rising", href: "/rising-artists", icon: Radar },
  { label: "Events", href: "/events", icon: Music2 },
];

const UTILITY_ITEMS: NavigationItem[] = [
  { label: "Data export", href: "/monetize", icon: Database },
  { label: "Festival data", href: "/festivals/amsterdam-dance-event", icon: Calendar },
];

const isActiveRoute = (pathname: string, href: string) =>
  pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

const mobilePanel = {
  hidden: { opacity: 0, height: 0, y: -12 },
  visible: { opacity: 1, height: "auto", y: 0 },
  exit: { opacity: 0, height: 0, y: -12 },
};

export function PageHeader({
  title,
  description,
  children,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("mb-6 space-y-3", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {children ? (
          <div className="flex flex-wrap items-center gap-2">{children}</div>
        ) : null}
      </div>
    </header>
  );
}

export function Navigation() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const currentSection = useMemo(() => {
    const firstMatch =
      [...PRIMARY_ITEMS, ...UTILITY_ITEMS].find((item) => isActiveRoute(pathname, item.href));
    return firstMatch?.label ?? "LineupBase";
  }, [pathname]);

  return (
    <header className="w-full py-2">
      <div className="flex h-14 items-center justify-between gap-4">
        <Link
          href="/"
          className="group flex items-center gap-2 text-lg font-semibold tracking-tight transition-opacity hover:opacity-90"
        >
          <BrandWordmark textClassName="text-lg" />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {PRIMARY_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActiveRoute(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition-all",
                  active
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/20"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{item.label}</span>
                {active ? (
                  <motion.span
                    layoutId="nav-indicator"
                    className="absolute inset-x-0 -bottom-2 z-0 h-[2px] rounded-full bg-gradient-to-r from-primary to-accent"
                    transition={{ duration: 0.24 }}
                  />
                ) : null}
              </Link>
            );
          })}

          <motion.button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            whileTap={{ scale: 0.98 }}
            className="ml-2 inline-flex items-center rounded-md border border-border/50 px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground hover:bg-background/20 lg:hidden"
            aria-label="Toggle navigation"
          >
            <Menu className="h-4 w-4" />
          </motion.button>
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href="/monetize"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-border/70 px-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <Megaphone className="h-4 w-4" />
            Advertise
          </Link>
          <Link
            href="/monetize"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
          >
            <Database className="h-4 w-4" />
            Export artists
          </Link>
        </div>

        <div className="lg:hidden">
          <motion.button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center justify-center rounded-md border border-border/60 bg-background/40 p-2 text-muted-foreground transition hover:text-foreground hover:bg-background/70"
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.nav
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={mobilePanel}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border/50 pt-3 lg:hidden"
            aria-label="Mobile"
          >
            <div className="grid gap-2 pb-4 pt-1">
              <p className="px-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">{currentSection}</p>
              {[...PRIMARY_ITEMS, ...UTILITY_ITEMS].map((item) => {
                const Icon = item.icon;
                const active = isActiveRoute(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors",
                      active ? "bg-primary/12 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-background/20"
                    )}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </span>
                    {active ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
                  </Link>
                );
              })}
            </div>
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
