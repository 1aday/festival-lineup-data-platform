import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ArtistEvidenceCard } from '@/components/seo/artist-evidence-card';
import { JsonLd } from '@/components/seo/json-ld';
import { SeoShell } from '@/components/seo/seo-shell';
import {
  absoluteUrl,
  artistPath,
  breadcrumbItems,
  buildJsonLd,
  compactText,
  eventPath,
  findGenreBySlug,
  formatEventDate,
  getCountryGenreIndex,
  genrePath,
  venuePath,
} from '@/lib/seo-data';

export const revalidate = 3600;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const genre = await findGenreBySlug(slug);
  if (!genre) return { title: 'Genre not found' };

  const canonicalPath = genrePath(genre);
  const description = compactText(
    `${genre.label} in the LineupBase European electronic music festival directory: ${genre.eventCount} event${genre.eventCount === 1 ? '' : 's'} and ${genre.artistCount} linked artist${genre.artistCount === 1 ? '' : 's'}.`
  ).slice(0, 160);

  return {
    title: `${genre.label} Artists and Events`,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: `${genre.label} Artists and Events | LineupBase`,
      description,
      url: canonicalPath,
      type: 'website',
    },
  };
}

export default async function GenrePage({ params }: PageProps) {
  const { slug } = await params;
  const genre = await findGenreBySlug(slug);
  if (!genre) notFound();

  const canonicalPath = genrePath(genre);
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Genres', href: '/genres' },
    { label: genre.label, href: canonicalPath },
  ];
  const breadcrumbJson = buildJsonLd('breadcrumb', { items: breadcrumbItems(breadcrumbs.map((crumb) => ({ name: crumb.label, path: crumb.href }))) });
  const itemListJson = buildJsonLd('itemList', {
    name: `${genre.label} artists`,
    items: genre.artists.slice(0, 80).map((artist) => ({ name: artist.title, url: absoluteUrl(artistPath(artist)) })),
  });
  const countrySegments = (await getCountryGenreIndex())
    .filter((row) => row.genre.slug === genre.slug)
    .slice(0, 16);
  const eventsByArtist = new Map<number, typeof genre.events>();
  for (const event of genre.events) {
    for (const artist of event.artists || []) {
      for (const id of [Number(artist.id), Number(artist.ade_id)].filter(Boolean)) {
        const rows = eventsByArtist.get(id) || [];
        rows.push(event);
        eventsByArtist.set(id, rows);
      }
    }
  }

  return (
    <SeoShell breadcrumbs={breadcrumbs}>
      <JsonLd data={[breadcrumbJson, itemListJson]} />

      <section>
        <p className="mb-3 text-sm font-medium uppercase text-primary">{genre.source === 'spotify' ? 'Spotify subgenre' : 'Curated genre'}</p>
        <h1 className="max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">{genre.label} Artists and Events</h1>
        <p className="mt-5 max-w-3xl text-lg text-muted-foreground">
          {genre.description} LineupBase currently links {genre.artistCount.toLocaleString()} artist{genre.artistCount === 1 ? '' : 's'} and {genre.eventCount.toLocaleString()} event{genre.eventCount === 1 ? '' : 's'} to this category.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href={`/artists?genre=${encodeURIComponent(genre.label)}`} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Search {genre.label} artists
          </Link>
          <Link href="/monetize" className="rounded-md border border-primary/50 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10">
            Export this genre
          </Link>
        </div>
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <h2 className="text-2xl font-semibold">Ranked {genre.label} artists</h2>
          <div className="mt-4 grid gap-4">
            {genre.artists.slice(0, 100).map((artist, index) => (
              <ArtistEvidenceCard
                key={artist.id}
                artist={artist}
                events={eventsByArtist.get(Number(artist.id)) || eventsByArtist.get(Number(artist.ade_id)) || []}
                rank={index + 1}
              />
            ))}
          </div>
        </div>

        <aside className="grid gap-5 self-start">
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-semibold">Country segments</h2>
            <div className="mt-4 grid gap-3">
              {countrySegments.map((row) => (
                <Link key={row.country.slug} href={`/countries/${row.country.slug}/${genre.slug}-artists`} className="flex justify-between gap-4 text-sm text-muted-foreground hover:text-foreground">
                  <span>{row.country.label}</span>
                  <span>{row.artistCount}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-semibold">{genre.label} events</h2>
            <div className="mt-4 grid gap-3">
              {genre.events.slice(0, 10).map((event) => (
                <Link key={event.id} href={eventPath(event)} className="block rounded-md border border-border p-3 text-sm hover:border-primary/50">
                  <span className="font-medium">{event.title}</span>
                  <span className="mt-1 block text-muted-foreground">{formatEventDate(event.start_date)}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-semibold">Active venues</h2>
            <div className="mt-4 grid gap-3">
              {Array.from(new Set(genre.events.map((event) => event.venue_name).filter(Boolean))).slice(0, 12).map((venue) => (
                <Link key={venue} href={venuePath(String(venue))} className="text-sm text-muted-foreground hover:text-foreground">
                  {venue}
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </SeoShell>
  );
}
