'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, BarChart3, CalendarCheck, Database, Megaphone, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CheckoutButton } from '@/components/monetization/checkout-button';
import { STRIPE_CHECKOUT_PRODUCTS } from '@/lib/stripe-products';
import { cn } from '@/lib/utils';

type CtaVariant = 'home' | 'artists' | 'schedule' | 'events' | 'insights' | 'data';

interface ConversionCtaStripProps {
  variant: CtaVariant;
  artistCount?: number;
  eventCount?: number;
  selectedCount?: number;
  className?: string;
}

const dataProduct = STRIPE_CHECKOUT_PRODUCTS.ade_data_export;
const sponsorProduct = STRIPE_CHECKOUT_PRODUCTS.ade_sponsor_week;
const conciergeProduct = STRIPE_CHECKOUT_PRODUCTS.ade_concierge_curated;

const variantCopy: Record<CtaVariant, { eyebrow: string; title: string; body: string }> = {
  home: {
    eyebrow: 'For teams',
    title: 'Use the full festival dataset outside the app',
    body: 'Export artists, events, images, venues, and source metadata for European electronic music festival planning, outreach, or content work.',
  },
  artists: {
    eyebrow: 'Artist research',
    title: 'Turn this artist database into a working CSV',
    body: 'Skip manual copy-paste. Buy the export and use the current featured festival artist/event dataset in your own tools.',
  },
  schedule: {
    eyebrow: 'Planning help',
    title: 'Want the schedule sorted for you?',
    body: 'Buy a curated featured-festival plan when conflict checks and venue routing start taking too much time.',
  },
  events: {
    eyebrow: 'Promote',
    title: 'Put a venue, party, or partner in front of festival traffic',
    body: 'Sponsor a visible placement and send qualified visitors to your event, offer, or activation.',
  },
  insights: {
    eyebrow: 'Fast access',
    title: 'Buy the clean export now, request deeper reports later',
    body: 'The export is the lowest-friction paid product. Use it for lists, analysis, targeting, and planning.',
  },
  data: {
    eyebrow: 'Data workflows',
    title: 'Take the analytics dataset with you',
    body: 'Download a current snapshot instead of rebuilding the same filters and charts by hand.',
  },
};

export function ConversionCtaStrip({
  variant,
  artistCount,
  eventCount,
  selectedCount,
  className,
}: ConversionCtaStripProps) {
  const copy = variantCopy[variant];
  const primarySku = variant === 'schedule' ? conciergeProduct.sku : variant === 'events' ? sponsorProduct.sku : dataProduct.sku;
  const primaryProduct = variant === 'schedule' ? conciergeProduct : variant === 'events' ? sponsorProduct : dataProduct;
  const Icon = variant === 'schedule' ? CalendarCheck : variant === 'events' ? Megaphone : Database;
  const metric = selectedCount
    ? `${selectedCount} selected`
    : artistCount && eventCount
      ? `${artistCount.toLocaleString()} artists · ${eventCount.toLocaleString()} events`
      : artistCount
        ? `${artistCount.toLocaleString()} artists`
        : 'Stripe checkout';

  return (
    <div
      className={cn(
        'rounded-lg border border-primary/30 bg-background/85 p-4 shadow-sm backdrop-blur',
        'supports-[backdrop-filter]:bg-background/70',
        className
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary/12 text-primary">
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-primary">{copy.eyebrow}</span>
              <span className="rounded-full border border-border/70 px-2 py-0.5 text-xs text-muted-foreground">
                {metric}
              </span>
            </div>
            <h2 className="text-base font-semibold leading-tight md:text-lg">{copy.title}</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{copy.body}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:shrink-0">
          <div className="text-sm sm:text-right">
            <p className="font-semibold">${primaryProduct.priceUsd}</p>
            <p className="text-xs text-muted-foreground">{primaryProduct.shortName}</p>
          </div>
        <CheckoutButton
          sku={primarySku}
          label={`Buy for $${primaryProduct.priceUsd}`}
          className="w-full sm:w-auto"
        />
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/monetize">
              All options
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

interface FilteredExportCtaProps {
  count: number;
  active: boolean;
  className?: string;
}

export function FilteredExportCta({ count, active, className }: FilteredExportCtaProps) {
  if (!active || count === 0) {
    return null;
  }

  return (
    <div className={cn('rounded-lg border border-primary/25 bg-black/55 p-3 backdrop-blur', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Want this exact research list?</p>
          <p className="text-xs text-muted-foreground">
            {count.toLocaleString()} matching artists found. Buy the dataset and filter/export it offline.
          </p>
        </div>
        <CheckoutButton sku="ade_data_export" label="Export data $49" className="w-full sm:w-auto" />
      </div>
    </div>
  );
}

export function MobileConversionBar() {
  const pathname = usePathname();

  if (pathname.startsWith('/checkout') || pathname.startsWith('/monetize')) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-background/95 px-3 py-2 shadow-lg backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-lg items-center gap-2">
        <Button asChild variant="outline" className="h-10 flex-1">
          <Link href="/monetize">
            <Megaphone className="size-4" />
            Advertise
          </Link>
        </Button>
        <CheckoutButton
          sku="ade_data_export"
          label="Export $49"
          wrapperClassName="flex-1"
          className="h-10 w-full"
        />
      </div>
    </div>
  );
}

export function TrustMiniRow({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-3 text-xs text-muted-foreground', className)}>
      <span className="inline-flex items-center gap-1">
        <ShieldCheck className="size-3.5 text-primary" />
        Secure Stripe checkout
      </span>
      <span className="inline-flex items-center gap-1">
        <BarChart3 className="size-3.5 text-primary" />
        Current featured festival dataset
      </span>
      <span>Manual fulfillment for custom packages</span>
    </div>
  );
}
