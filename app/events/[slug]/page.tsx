import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { JsonLd } from '@/components/seo/json-ld';
import { SeoShell } from '@/components/seo/seo-shell';
import {
  absoluteUrl,
  artistPath,
  breadcrumbItems,
  buildJsonLd,
  compactText,
  eventPath,
  findEventBySlug,
  formatEventDate,
  hasSeoEventValue,
  venuePath,
} from '@/lib/seo-data';

export const revalidate = 3600;

type PageProps = {
  params: Promise<{ slug: string }>;
};

async function loadEvent(slug: string) {
  const event = await findEventBySlug(slug);
  if (!event || !hasSeoEventValue(event)) return null;
  return event;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await loadEvent(slug);
  if (!event) return { title: 'Event not found' };

  const canonicalPath = eventPath(event);
  const description = compactText(
    `${event.title} is a European electronic music festival event${event.venue_name ? ` at ${event.venue_name}` : ''} on ${formatEventDate(event.start_date, { hour: undefined, minute: undefined })}. Explore lineup, venue, and category metadata.`
  ).slice(0, 160);

  return {
    title: `${event.title} Event`,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: `${event.title} | LineupBase Event`,
      description,
      url: canonicalPath,
      type: 'article',
    },
  };
}

export default async function EventPage({ params }: PageProps) {
  const { slug } = await params;
  const event = await loadEvent(slug);
  if (!event) notFound();

  const canonicalPath = eventPath(event);
  if (slug !== canonicalPath.split('/').pop()) redirect(canonicalPath);

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Events', href: '/events' },
    { label: event.title, href: canonicalPath },
  ];
  const pageUrl = absoluteUrl(canonicalPath);
  const categories = event.categories?.split('/').map((part) => part.trim()).filter(Boolean) || [];
  const breadcrumbJson = buildJsonLd('breadcrumb', { items: breadcrumbItems(breadcrumbs.map((crumb) => ({ name: crumb.label, path: crumb.href }))) });
  const eventJson = buildJsonLd('event', {
    '@type': 'MusicEvent',
    name: event.title,
    description: compactText(event.subtitle || event.categories || `${event.title} festival event`),
    url: pageUrl,
    startDate: event.start_date,
    endDate: event.end_date || undefined,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: event.venue_name ? {
      '@type': 'Place',
      name: event.venue_name,
      address: event.venue_address || 'Amsterdam, Netherlands',
    } : undefined,
    performer: event.artists?.slice(0, 30).map((artist) => ({
      '@type': 'MusicGroup',
      name: artist.title,
      url: absoluteUrl(artistPath(artist)),
    })),
    mainEntityOfPage: pageUrl,
  });

  return (
    <SeoShell breadcrumbs={breadcrumbs}>
      <JsonLd data={[breadcrumbJson, eventJson]} />

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <p className="mb-3 text-sm font-medium uppercase text-primary">Festival event</p>
          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">{event.title}</h1>
          <p className="mt-5 max-w-3xl text-lg text-muted-foreground">
            {event.title} is listed in LineupBase as a European electronic music festival event
            {event.venue_name ? ` at ${event.venue_name}` : ''}. It is scheduled for {formatEventDate(event.start_date)}
            {event.artists?.length ? ` and includes ${event.artists.length} linked artist${event.artists.length === 1 ? '' : 's'} in the lineup metadata.` : '.'}
          </p>

          {categories.length ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {categories.map((category) => (
                <span key={category} className="rounded-md border border-primary/35 px-3 py-1.5 text-sm text-primary">
                  {category}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <aside className="rounded-lg border border-border bg-card p-5">
          <dl className="grid gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Date</dt>
              <dd className="mt-1 font-medium">{formatEventDate(event.start_date)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Venue</dt>
              <dd className="mt-1 font-medium">
                {event.venue_name ? <Link href={venuePath(event.venue_name)} className="hover:text-primary">{event.venue_name}</Link> : 'Venue TBA'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Lineup records</dt>
              <dd className="mt-1 font-medium">{event.artists?.length || 0}</dd>
            </div>
            {event.sold_out ? <div className="rounded-md bg-destructive/15 px-3 py-2 text-destructive">Marked sold out in source data</div> : null}
            {event.url ? (
              <Link href={event.url} target="_blank" rel="noreferrer" className="rounded-md border border-border px-3 py-2 text-center hover:border-primary/50">
                Source event
              </Link>
            ) : null}
          </dl>
        </aside>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold">Linked Artists</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {event.artists?.length ? event.artists.map((artist) => (
            <Link key={artist.id} href={artistPath(artist)} className="flex gap-3 rounded-lg border border-border bg-card p-4 transition hover:border-primary/50">
              {artist.image_url ? <img src={artist.image_url} alt={artist.title} className="h-14 w-14 rounded-md object-cover" /> : <span className="h-14 w-14 rounded-md bg-muted" />}
              <span>
                <span className="block font-semibold">{artist.title}</span>
                <span className="text-sm text-muted-foreground">{artist.country_label || 'Country not listed'}</span>
              </span>
            </Link>
          )) : (
            <div className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
              No linked artists are available for this event yet.
            </div>
          )}
        </div>
      </section>
    </SeoShell>
  );
}
