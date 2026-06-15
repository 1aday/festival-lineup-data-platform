'use client';

import { usePathname } from 'next/navigation';

import { SponsoredSlot } from '@/components/monetization/sponsored-slot';

const routePlacementMap: Record<string, 'home' | 'schedule' | 'artists' | 'spotify_events'> = {
  '/': 'home',
  '/schedule': 'schedule',
  '/artists': 'artists',
  '/spotify-events': 'spotify_events',
};

export function PageSponsorBanner() {
  const pathname = usePathname();
  const placement = routePlacementMap[pathname || ''];

  if (!placement) return null;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-3 md:px-6">
      <SponsoredSlot placement={placement} />
    </div>
  );
}
