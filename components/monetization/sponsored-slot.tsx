'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { SponsorCampaign } from '@/lib/monetization-types';

type Placement = 'home' | 'schedule' | 'artists' | 'spotify_events';

interface SponsoredSlotProps {
  placement: Placement;
  className?: string;
}

export function SponsoredSlot({ placement, className }: SponsoredSlotProps) {
  const [campaign, setCampaign] = useState<SponsorCampaign | null>(null);
  const impressionTracked = useRef(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const res = await fetch(`/api/sponsors/active?placement=${encodeURIComponent(placement)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (mounted) {
          setCampaign(data.primary || null);
        }
      } catch {
        // Silent fail for non-monetized runs
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [placement]);

  useEffect(() => {
    if (!campaign || impressionTracked.current) return;

    impressionTracked.current = true;
    fetch('/api/sponsors/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: campaign.id,
        placement,
        eventType: 'impression',
        metadata: {
          path: typeof window !== 'undefined' ? window.location.pathname : undefined,
        },
      }),
    }).catch(() => undefined);
  }, [campaign, placement]);

  if (!campaign) return null;

  const handleClick = () => {
    fetch('/api/sponsors/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: campaign.id,
        placement,
        eventType: 'click',
        metadata: {
          path: typeof window !== 'undefined' ? window.location.pathname : undefined,
        },
      }),
    }).catch(() => undefined);
  };

  return (
    <section
      className={cn(
        'rounded-xl border border-primary/35 bg-card/70 p-4 backdrop-blur-sm',
        className
      )}
      aria-label="Sponsored placement"
    >
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-primary/80">Sponsored</div>
      <h3 className="text-base font-semibold leading-tight">{campaign.title}</h3>
      {campaign.description && (
        <p className="mt-2 text-sm text-muted-foreground">{campaign.description}</p>
      )}
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">By {campaign.sponsor_name}</div>
        <a
          href={campaign.target_url}
          target="_blank"
          rel="noreferrer"
          onClick={handleClick}
          className="inline-flex items-center gap-1 rounded-full border border-primary/35 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
        >
          {campaign.cta_label || 'Learn more'}
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </section>
  );
}
