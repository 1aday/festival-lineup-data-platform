import type { Metadata } from 'next';
import Link from 'next/link';

import { JsonLd } from '@/components/seo/json-ld';
import { SeoShell } from '@/components/seo/seo-shell';
import {
  absoluteUrl,
  breadcrumbItems,
  buildJsonLd,
  eventPath,
  formatEventDate,
  getEligibleSeoEvents,
  getVenueIndex,
  venuePath,
} from '@/lib/seo-data';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'European Electronic Music Events',
  description: 'Browse indexed European electronic music festival events with dates, venues, lineups, and source metadata.',
  alternates: { canonical: '/events' },
  openGraph: {
    title: 'European Electronic Music Events | LineupBase',
    description: 'Crawlable event directory for European electronic music festivals.',
    url: '/events',
    type: 'website',
  },
};

export default async function EventsPage() {
  const [events, venues] = await Promise.all([getEligibleSeoEvents(), getVenueIndex()]);
  const featuredEvents = events.slice(0, 80);
  const topVenues = venues.slice(0, 16);
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Events', href: '/events' },
  ];
  const breadcrumbJson = buildJsonLd('breadcrumb', { items: breadcrumbItems(breadcrumbs.map((crumb) => ({ name: crumb.label, path: crumb.href }))) });
  const itemListJson = buildJsonLd('itemList', {
    name: 'European electronic music events',
    items: featuredEvents.map((event) => ({ name: event.title, url: absoluteUrl(eventPath(event)) })),
  });

  return (
    <SeoShell breadcrumbs={breadcrumbs}>
      <JsonLd data={[breadcrumbJson, itemListJson]} />

      <section>
        <p className="mb-3 text-sm font-medium uppercase text-primary">Events directory</p>
        <h1 className="max-w-5xl text-4xl font-semibold tracking-tight md:text-6xl">European Electronic Music Events</h1>
        <p className="mt-5 max-w-3xl text-lg text-muted-foreground">
          Browse {events.length.toLocaleString()} indexed festival events with venue, lineup, date, and category metadata. Amsterdam Dance Event is the featured dataset for this release.
        </p>
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <h2 className="text-2xl font-semibold">Indexed events</h2>
          <div className="mt-4 grid gap-4">
            {featuredEvents.map((event) => (
              <Link key={event.id} href={eventPath(event)} className="rounded-lg border border-border bg-card p-4 transition hover:border-primary/50">
                <h3 className="font-semibold">{event.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{formatEventDate(event.start_date)}</p>
                <p className="mt-1 text-sm text-muted-foreground">{event.venue_name || 'Venue TBA'}</p>
                {event.categories ? <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{event.categories}</p> : null}
              </Link>
            ))}
          </div>
        </div>

        <aside className="self-start rounded-lg border border-border bg-card p-5">
          <h2 className="font-semibold">Top venues</h2>
          <div className="mt-4 grid gap-3">
            {topVenues.map((venue) => (
              <Link key={venue.slug} href={venuePath(venue.name)} className="flex justify-between gap-4 text-sm text-muted-foreground hover:text-foreground">
                <span>{venue.name}</span>
                <span>{venue.eventCount}</span>
              </Link>
            ))}
          </div>
        </aside>
      </section>
    </SeoShell>
  );
}
