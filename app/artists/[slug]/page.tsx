import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { ArtistSocialLinks } from '@/components/seo/artist-social-links';
import { JsonLd } from '@/components/seo/json-ld';
import { SeoShell } from '@/components/seo/seo-shell';
import { getArtistSameAs } from '@/lib/artist-socials';
import {
  absoluteUrl,
  artistPath,
  breadcrumbItems,
  buildJsonLd,
  compactText,
  countryPath,
  eventPath,
  findArtistBySlug,
  formatEventDate,
  getArtistEvents,
  getArtistGenreLabels,
  genrePath,
  hasSeoArtistValue,
} from '@/lib/seo-data';

export const revalidate = 3600;

type PageProps = {
  params: Promise<{ slug: string }>;
};

async function loadArtist(slug: string) {
  const artist = await findArtistBySlug(slug);
  if (!artist) return null;
  const events = await getArtistEvents(artist);
  if (!hasSeoArtistValue(artist, events)) return null;
  return { artist, events };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadArtist(slug);
  if (!data) return { title: 'Artist not found' };

  const { artist, events } = data;
  const canonicalPath = artistPath(artist);
  const genres = getArtistGenreLabels(artist);
  const description = compactText(
    `${artist.title} is listed in the LineupBase European electronic music directory${artist.country_label ? ` from ${artist.country_label}` : ''}. ${events.length ? `Explore ${events.length} festival event${events.length === 1 ? '' : 's'}, venues, and lineup context.` : 'Explore artist, source, genre, and festival metadata.'}`
  ).slice(0, 160);

  return {
    title: `${artist.title} Artist Profile`,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: `${artist.title} | European Electronic Music Artist`,
      description,
      url: canonicalPath,
      type: 'profile',
      images: artist.image_url ? [{ url: artist.image_url, alt: artist.title }] : undefined,
    },
    keywords: [artist.title, artist.country_label, ...genres, 'European electronic music', 'festival lineup'].filter(Boolean) as string[],
  };
}

export default async function ArtistPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await loadArtist(slug);
  if (!data) notFound();

  const { artist, events } = data;
  const canonicalPath = artistPath(artist);
  if (slug !== canonicalPath.split('/').pop()) redirect(canonicalPath);

  const genres = getArtistGenreLabels(artist);
  const pageUrl = absoluteUrl(canonicalPath);
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Artists', href: '/artists' },
    { label: artist.title, href: canonicalPath },
  ];
  const breadcrumbJson = buildJsonLd('breadcrumb', { items: breadcrumbItems(breadcrumbs.map((crumb) => ({ name: crumb.label, path: crumb.href }))) });
  const artistJson = buildJsonLd('artist', {
    '@type': 'MusicGroup',
    name: artist.title,
    url: pageUrl,
    image: artist.image_url || undefined,
    genre: genres.length ? genres : undefined,
    location: artist.country_label ? { '@type': 'Country', name: artist.country_label } : undefined,
    sameAs: getArtistSameAs(artist),
    mainEntityOfPage: pageUrl,
    subjectOf: events.slice(0, 8).map((event) => ({
      '@type': 'MusicEvent',
      name: event.title,
      startDate: event.start_date,
      url: absoluteUrl(eventPath(event)),
    })),
  });

  return (
    <SeoShell breadcrumbs={breadcrumbs}>
      <JsonLd data={[breadcrumbJson, artistJson]} />

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <p className="mb-3 text-sm font-medium uppercase text-primary">Artist profile</p>
          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">{artist.title}</h1>
          <p className="mt-5 max-w-3xl text-lg text-muted-foreground">
            {artist.title} is indexed in LineupBase as part of the European electronic music festival directory
            {artist.country_label ? `, with country metadata for ${artist.country_label}` : ''}.
            {events.length ? ` This profile links ${events.length} featured festival event${events.length === 1 ? '' : 's'} with venue and lineup context.` : ' This profile keeps source and festival metadata in one crawlable page.'}
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {artist.country_label ? (
              <Link href={countryPath(artist.country_label)} className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground">
                {artist.country_label}
              </Link>
            ) : null}
            {genres.slice(0, 6).map((genre) => (
              <Link key={genre} href={genrePath(genre)} className="rounded-md border border-primary/35 px-3 py-1.5 text-sm text-primary hover:bg-primary hover:text-primary-foreground">
                {genre}
              </Link>
            ))}
          </div>
        </div>

        <aside className="rounded-lg border border-border bg-card p-4">
          {artist.image_url ? (
            <img src={artist.image_url} alt={artist.title} className="aspect-[4/3] w-full rounded-md object-cover" />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">No artist image</div>
          )}
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Events</dt>
              <dd className="font-medium">{events.length}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Country</dt>
              <dd className="text-right font-medium">{artist.country_label || 'Not listed'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Followers</dt>
              <dd className="text-right font-medium">{typeof artist.followers === 'number' ? artist.followers.toLocaleString() : 'n/a'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Popularity</dt>
              <dd className="text-right font-medium">{typeof artist.popularity === 'number' ? artist.popularity : 'n/a'}</dd>
            </div>
            {artist.top_track_name ? (
              <div>
                <dt className="text-muted-foreground">Top track</dt>
                <dd className="mt-1 font-medium">{artist.top_track_name}</dd>
              </div>
            ) : null}
            <div>
              <ArtistSocialLinks artist={artist} heading="Links" />
            </div>
            <Link href={`${canonicalPath}/similar`} className="mt-2 rounded-md bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Find similar artists
            </Link>
            <Link href="/monetize" className="rounded-md border border-primary/50 px-3 py-2 text-center text-sm text-primary hover:bg-primary/10">
              Export artist data
            </Link>
            {artist.url ? (
              <Link href={artist.url} target="_blank" rel="noreferrer" className="rounded-md border border-border px-3 py-2 text-center text-sm hover:border-primary/50">
                Source profile
              </Link>
            ) : null}
          </dl>
        </aside>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold">Festival Events</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {events.length ? events.map((event) => (
            <Link key={event.id} href={eventPath(event)} className="rounded-lg border border-border bg-card p-4 transition hover:border-primary/50">
              <h3 className="font-semibold">{event.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{formatEventDate(event.start_date)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{event.venue_name || 'Venue TBA'}</p>
            </Link>
          )) : (
            <div className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
              No linked festival events are available for this artist yet.
            </div>
          )}
        </div>
      </section>
    </SeoShell>
  );
}
