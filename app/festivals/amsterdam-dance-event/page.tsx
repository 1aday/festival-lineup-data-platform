import type { Metadata } from 'next';
import Link from 'next/link';

import { JsonLd } from '@/components/seo/json-ld';
import { SeoShell } from '@/components/seo/seo-shell';
import {
  absoluteUrl,
  artistPath,
  breadcrumbItems,
  buildJsonLd,
  eventPath,
  formatEventDate,
  getCuratedGenreIndex,
  getEligibleSeoArtists,
  getEligibleSeoEvents,
  getVenueIndex,
  genrePath,
} from '@/lib/seo-data';

export const revalidate = 3600;

const canonicalPath = '/festivals/amsterdam-dance-event';

export const metadata: Metadata = {
  title: 'Amsterdam Dance Event Artist and Event Directory',
  description: 'Explore Amsterdam Dance Event as the featured LineupBase festival dataset, including artists, events, venues, genres, and lineup metadata.',
  alternates: { canonical: canonicalPath },
  openGraph: {
    title: 'Amsterdam Dance Event Artist and Event Directory | LineupBase',
    description: 'Featured festival dataset for European electronic music artists, venues, events, and genres.',
    url: canonicalPath,
    type: 'website',
  },
};

export default async function AmsterdamDanceEventPage() {
  const [artists, events, venues, genres] = await Promise.all([
    getEligibleSeoArtists(),
    getEligibleSeoEvents(),
    getVenueIndex(),
    getCuratedGenreIndex(),
  ]);

  const featuredArtists = artists.filter((artist) => artist.image_url).slice(0, 24);
  const featuredEvents = events.slice(0, 24);
  const topVenues = venues.slice(0, 12);
  const topGenres = genres.slice(0, 12);
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Festivals', href: '/' },
    { label: 'Amsterdam Dance Event', href: canonicalPath },
  ];
  const breadcrumbJson = buildJsonLd('breadcrumb', { items: breadcrumbItems(breadcrumbs.map((crumb) => ({ name: crumb.label, path: crumb.href }))) });
  const festivalJson = buildJsonLd('festival', {
    '@type': 'MusicEvent',
    name: 'Amsterdam Dance Event',
    url: absoluteUrl(canonicalPath),
    startDate: events[0]?.start_date,
    endDate: events[events.length - 1]?.end_date || events[events.length - 1]?.start_date,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: {
      '@type': 'City',
      name: 'Amsterdam',
    },
    subEvent: featuredEvents.slice(0, 20).map((event) => ({
      '@type': 'MusicEvent',
      name: event.title,
      startDate: event.start_date,
      url: absoluteUrl(eventPath(event)),
    })),
  });

  return (
    <SeoShell breadcrumbs={breadcrumbs}>
      <JsonLd data={[breadcrumbJson, festivalJson]} />

      <section>
        <p className="mb-3 text-sm font-medium uppercase text-primary">Featured festival dataset</p>
        <h1 className="max-w-5xl text-4xl font-semibold tracking-tight md:text-6xl">Amsterdam Dance Event Artist and Event Directory</h1>
        <p className="mt-5 max-w-3xl text-lg text-muted-foreground">
          Amsterdam Dance Event is the featured LineupBase festival dataset. Explore {artists.length.toLocaleString()} artists, {events.length.toLocaleString()} events, {venues.length.toLocaleString()} venues, and curated electronic music categories in crawlable public pages.
        </p>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-4">
        {[
          ['Artists', artists.length],
          ['Events', events.length],
          ['Venues', venues.length],
          ['Curated genres', genres.length],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-semibold">{Number(value).toLocaleString()}</p>
          </div>
        ))}
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold">Featured artists</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
          {featuredArtists.map((artist) => (
            <Link key={artist.id} href={artistPath(artist)} className="rounded-lg border border-border bg-card p-3 transition hover:border-primary/50">
              <img src={artist.image_url || ''} alt={artist.title} className="aspect-square w-full rounded-md object-cover" />
              <span className="mt-3 block truncate text-sm font-medium">{artist.title}</span>
              <span className="block truncate text-xs text-muted-foreground">{artist.country_label || 'Artist'}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-semibold">Featured events</h2>
          <div className="mt-4 grid gap-4">
            {featuredEvents.map((event) => (
              <Link key={event.id} href={eventPath(event)} className="rounded-lg border border-border bg-card p-4 transition hover:border-primary/50">
                <h3 className="font-semibold">{event.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{formatEventDate(event.start_date)}</p>
                <p className="mt-1 text-sm text-muted-foreground">{event.venue_name || 'Venue TBA'}</p>
              </Link>
            ))}
          </div>
        </div>

        <aside className="grid gap-5 self-start">
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-semibold">Top venues</h2>
            <div className="mt-4 grid gap-3">
              {topVenues.map((venue) => (
                <Link key={venue.slug} href={`/venues/${venue.slug}`} className="flex justify-between gap-4 text-sm text-muted-foreground hover:text-foreground">
                  <span>{venue.name}</span>
                  <span>{venue.eventCount}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-semibold">Curated genres</h2>
            <div className="mt-4 grid gap-3">
              {topGenres.map((genre) => (
                <Link key={genre.slug} href={genrePath(genre)} className="flex justify-between gap-4 text-sm text-muted-foreground hover:text-foreground">
                  <span>{genre.label}</span>
                  <span>{genre.eventCount}</span>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </SeoShell>
  );
}
