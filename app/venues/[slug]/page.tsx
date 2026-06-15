import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { JsonLd } from '@/components/seo/json-ld';
import { SeoShell } from '@/components/seo/seo-shell';
import {
  absoluteUrl,
  artistPath,
  breadcrumbItems,
  buildJsonLd,
  compactText,
  eventPath,
  findVenueBySlug,
  formatEventDate,
  venuePath,
} from '@/lib/seo-data';

export const revalidate = 3600;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const venue = await findVenueBySlug(slug);
  if (!venue) return { title: 'Venue not found' };

  const canonicalPath = venuePath(venue.name);
  const description = compactText(
    `${venue.name} has ${venue.eventCount} indexed European electronic music festival event${venue.eventCount === 1 ? '' : 's'} in LineupBase, with linked artists and lineup metadata.`
  ).slice(0, 160);

  return {
    title: `${venue.name} Venue Events`,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: `${venue.name} | LineupBase Venue`,
      description,
      url: canonicalPath,
      type: 'website',
    },
  };
}

export default async function VenuePage({ params }: PageProps) {
  const { slug } = await params;
  const venue = await findVenueBySlug(slug);
  if (!venue) notFound();

  const canonicalPath = venuePath(venue.name);
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Venues', href: '/events' },
    { label: venue.name, href: canonicalPath },
  ];
  const breadcrumbJson = buildJsonLd('breadcrumb', { items: breadcrumbItems(breadcrumbs.map((crumb) => ({ name: crumb.label, path: crumb.href }))) });
  const placeJson = buildJsonLd('place', {
    '@type': 'Place',
    name: venue.name,
    url: absoluteUrl(canonicalPath),
    address: 'Amsterdam, Netherlands',
    event: venue.events.slice(0, 20).map((event) => ({
      '@type': 'MusicEvent',
      name: event.title,
      startDate: event.start_date,
      url: absoluteUrl(eventPath(event)),
    })),
  });
  const itemListJson = buildJsonLd('itemList', {
    name: `${venue.name} events`,
    items: venue.events.slice(0, 50).map((event) => ({ name: event.title, url: absoluteUrl(eventPath(event)) })),
  });

  return (
    <SeoShell breadcrumbs={breadcrumbs}>
      <JsonLd data={[breadcrumbJson, placeJson, itemListJson]} />

      <section>
        <p className="mb-3 text-sm font-medium uppercase text-primary">Venue</p>
        <h1 className="max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">{venue.name}</h1>
        <p className="mt-5 max-w-3xl text-lg text-muted-foreground">
          {venue.name} is indexed in LineupBase with {venue.eventCount} featured festival event{venue.eventCount === 1 ? '' : 's'}
          {venue.artists.length ? ` and ${venue.artists.length} linked artist${venue.artists.length === 1 ? '' : 's'}.` : '.'}
        </p>
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <h2 className="text-2xl font-semibold">Events at {venue.name}</h2>
          <div className="mt-4 grid gap-4">
            {venue.events.map((event) => (
              <Link key={event.id} href={eventPath(event)} className="rounded-lg border border-border bg-card p-4 transition hover:border-primary/50">
                <h3 className="font-semibold">{event.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{formatEventDate(event.start_date)}</p>
                {event.categories ? <p className="mt-1 text-sm text-muted-foreground">{event.categories}</p> : null}
              </Link>
            ))}
          </div>
        </div>

        <aside>
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-semibold">Top linked artists</h2>
            <div className="mt-4 grid gap-3">
              {venue.artists.slice(0, 12).map((artist) => (
                <Link key={artist.id} href={artistPath(artist)} className="text-sm text-muted-foreground hover:text-foreground">
                  {artist.title}
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </SeoShell>
  );
}
