import type { Metadata } from 'next';
import Link from 'next/link';

import { ArtistSocialLinks } from '@/components/seo/artist-social-links';
import { JsonLd } from '@/components/seo/json-ld';
import { SeoShell } from '@/components/seo/seo-shell';
import {
  absoluteUrl,
  artistPath,
  breadcrumbItems,
  buildJsonLd,
  countryPath,
  eventPath,
  formatEventDate,
  getArtistGenreLabels,
  getCountryIndex,
  getEligibleSeoArtists,
  getEligibleSeoEvents,
  getExpandedGenreIndex,
  genrePath,
  type SeoArtist,
  type SeoEvent,
} from '@/lib/seo-data';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Electronic Music Artist Directory',
  description: 'Find electronic music artists by country, genre, subgenre, festival appearances, images, Spotify data, and event metadata.',
  alternates: { canonical: '/artists' },
  openGraph: {
    title: 'Electronic Music Artist Directory | LineupBase',
    description: 'Search electronic music artists by country, genre, subgenre, image, event appearances, and data depth.',
    url: '/artists',
    type: 'website',
  },
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type ArtistDirectoryRow = {
  artist: SeoArtist;
  events: SeoEvent[];
  genres: string[];
  searchable: string;
  score: number;
};

const detailFilters = [
  { value: 'with-events', label: 'Has events' },
  { value: 'with-image', label: 'Has image' },
  { value: 'with-country', label: 'Has country' },
  { value: 'with-source', label: 'Has source profile' },
  { value: 'with-spotify', label: 'Has Spotify' },
  { value: 'with-socials', label: 'Has socials' },
  { value: 'with-audio', label: 'Has audio metrics' },
];

const musicSubgenres = [
  'Peak Time Techno',
  'Minimal Techno',
  'Deep House',
  'Tech House',
  'Progressive House',
  'Hard Dance',
  'Drum and Bass',
  'Afrobeats',
  'Amapiano',
  'Breakbeat',
  'Disco',
  'Ambient',
  'Trance',
  'Bass',
  'Dub',
  'Live Performances',
];

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalized(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function artistHasAudio(artist: SeoArtist) {
  return [
    artist.energy_mean,
    artist.danceability_mean,
    artist.valence_mean,
    artist.tempo_bpm_mean,
    artist.acousticness_mean,
    artist.instrumentalness_mean,
  ].some((value) => typeof value === 'number');
}

function formatMetric(value: number | null | undefined, suffix = '') {
  if (typeof value !== 'number') return 'n/a';
  return `${Math.round(value)}${suffix}`;
}

function buildRows(artists: SeoArtist[], events: SeoEvent[]) {
  const eventsByArtist = new Map<number, SeoEvent[]>();

  for (const event of events) {
    for (const artist of event.artists || []) {
      const ids = [Number(artist.id), Number(artist.ade_id)].filter(Boolean);
      for (const id of ids) {
        const rows = eventsByArtist.get(id) || [];
        rows.push(event);
        eventsByArtist.set(id, rows);
      }
    }
  }

  return artists.map((artist) => {
    const eventsForArtist = eventsByArtist.get(Number(artist.id)) || eventsByArtist.get(Number(artist.ade_id)) || [];
    const eventGenres = eventsForArtist.flatMap((event) => event.categories?.split('/').map((part) => part.trim()).filter(Boolean) || []);
    const genres = Array.from(new Set([...getArtistGenreLabels(artist), ...eventGenres])).slice(0, 12);
    const searchable = normalized([
      artist.title,
      artist.subtitle,
      artist.country_label,
      artist.primary_genres,
      artist.secondary_genres,
      artist.all_genres,
      artist.sound_descriptor,
      genres.join(' '),
      eventsForArtist.map((event) => `${event.title} ${event.venue_name} ${event.categories}`).join(' '),
    ].filter(Boolean).join(' '));
    const score =
      (artist.image_url ? 30 : 0) +
      (eventsForArtist.length ? 25 : 0) +
      (artist.country_label ? 15 : 0) +
      (artist.spotify_url ? 10 : 0) +
      (artistHasAudio(artist) ? 10 : 0) +
      Math.min(eventsForArtist.length * 2, 10);

    return { artist, events: eventsForArtist, genres, searchable, score };
  });
}

function applyFilters(rows: ArtistDirectoryRow[], filters: { q: string; country: string; genre: string; detail: string; sort: string }) {
  const query = normalized(filters.q);
  const country = normalized(filters.country);
  const genre = normalized(filters.genre);

  return rows
    .filter((row) => {
      if (query && !row.searchable.includes(query)) return false;
      if (country && normalized(row.artist.country_label) !== country) return false;
      if (genre) {
        const genreMatch = row.genres.some((value) => normalized(value).includes(genre) || genre.includes(normalized(value)));
        if (!genreMatch) return false;
      }

      if (filters.detail === 'with-events' && row.events.length === 0) return false;
      if (filters.detail === 'with-image' && !row.artist.image_url) return false;
      if (filters.detail === 'with-country' && !row.artist.country_label) return false;
      if (filters.detail === 'with-source' && !row.artist.url) return false;
      if (filters.detail === 'with-spotify' && !row.artist.spotify_url) return false;
      if (filters.detail === 'with-socials' && !Number(row.artist.social_link_count || 0)) return false;
      if (filters.detail === 'with-audio' && !artistHasAudio(row.artist)) return false;

      return true;
    })
    .sort((a, b) => {
      if (filters.sort === 'name') return a.artist.title.localeCompare(b.artist.title);
      if (filters.sort === 'events') return b.events.length - a.events.length || b.score - a.score;
      if (filters.sort === 'country') return (a.artist.country_label || 'zzz').localeCompare(b.artist.country_label || 'zzz');
      return b.score - a.score || a.artist.title.localeCompare(b.artist.title);
    });
}

function filterHref(next: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(next).forEach(([key, value]) => {
    if (value && value !== 'all') params.set(key, value);
  });
  const query = params.toString();
  return query ? `/artists?${query}` : '/artists';
}

function FilterLink({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center rounded-md border px-3 py-2 text-sm transition ${
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground'
      }`}
    >
      {children}
    </Link>
  );
}

export default async function ArtistsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = {
    q: firstParam(params?.q) || '',
    country: firstParam(params?.country) || '',
    genre: firstParam(params?.genre) || '',
    detail: firstParam(params?.detail) || '',
    sort: firstParam(params?.sort) || 'recommended',
  };

  const [artists, events, countries, genres] = await Promise.all([
    getEligibleSeoArtists(),
    getEligibleSeoEvents(),
    getCountryIndex(),
    getExpandedGenreIndex(),
  ]);

  const rows = buildRows(artists, events);
  const filteredRows = applyFilters(rows, filters);
  const visibleRows = filteredRows.slice(0, 120);
  const enrichedCount = rows.filter((row) => row.artist.spotify_url || artistHasAudio(row.artist)).length;
  const imageCount = rows.filter((row) => row.artist.image_url).length;
  const eventLinkedCount = rows.filter((row) => row.events.length > 0).length;
  const socialCount = rows.filter((row) => Number(row.artist.social_link_count || 0) > 0).length;
  const selectedFilters = [filters.q, filters.country, filters.genre, filters.detail].filter(Boolean).length;
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Artists', href: '/artists' },
  ];
  const breadcrumbJson = buildJsonLd('breadcrumb', { items: breadcrumbItems(breadcrumbs.map((crumb) => ({ name: crumb.label, path: crumb.href }))) });
  const itemListJson = buildJsonLd('itemList', {
    name: 'Electronic music artist directory',
    items: visibleRows.slice(0, 80).map((row) => ({ name: row.artist.title, url: absoluteUrl(artistPath(row.artist)) })),
  });

  return (
    <SeoShell breadcrumbs={breadcrumbs}>
      <JsonLd data={[breadcrumbJson, itemListJson]} />

      <section>
        <p className="mb-3 text-sm font-medium uppercase text-primary">Artist directory</p>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <h1 className="max-w-5xl text-4xl font-semibold tracking-tight md:text-6xl">
              Find Electronic Music Artists by Country, Genre, and Subgenre
            </h1>
            <p className="mt-5 max-w-3xl text-lg text-muted-foreground">
              LineupBase is an artist-first directory for electronic music people and firms. Search artists by country,
              curated genre, subgenre, event appearances, profile images, source links, Spotify metadata, and audio details.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Artists', artists.length],
              ['Countries', countries.length],
              ['With events', eventLinkedCount],
              ['With images', imageCount],
              ['With socials', socialCount],
              ['Data enriched', enrichedCount],
              ['Genres', genres.length],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs uppercase text-muted-foreground">{label}</p>
                <p className="mt-2 text-2xl font-semibold">{Number(value).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-border bg-card p-4">
        <form action="/artists" className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(150px,1fr))_auto]">
          <label className="grid gap-1">
            <span className="text-xs uppercase text-muted-foreground">Search</span>
            <input
              name="q"
              defaultValue={filters.q}
              placeholder="Artist, label, country, venue, sound..."
              className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs uppercase text-muted-foreground">Country</span>
            <select name="country" defaultValue={filters.country} className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary">
              <option value="">All countries</option>
              {countries.slice(0, 120).map((country) => (
                <option key={country.slug} value={country.label}>
                  {country.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-xs uppercase text-muted-foreground">Genre / subgenre</span>
            <select name="genre" defaultValue={filters.genre} className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary">
              <option value="">All genres</option>
              {[...genres.map((genre) => genre.label), ...musicSubgenres].filter((value, index, arr) => arr.indexOf(value) === index).map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-xs uppercase text-muted-foreground">Details</span>
            <select name="detail" defaultValue={filters.detail} className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary">
              <option value="">Any detail level</option>
              {detailFilters.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button type="submit" className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Search
            </button>
            {selectedFilters ? (
              <Link href="/artists" className="inline-flex h-10 items-center rounded-md border border-border px-3 text-sm text-muted-foreground hover:text-foreground">
                Reset
              </Link>
            ) : null}
          </div>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {['recommended', 'events', 'name', 'country'].map((sort) => (
            <FilterLink key={sort} active={filters.sort === sort || (!filters.sort && sort === 'recommended')} href={filterHref({ ...filters, sort })}>
              Sort: {sort}
            </FilterLink>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">
                {filteredRows.length.toLocaleString()} matching artist{filteredRows.length === 1 ? '' : 's'}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Showing the top {visibleRows.length.toLocaleString()} by data quality, event links, images, and metadata depth.
              </p>
            </div>
            <Link href="/monetize" className="rounded-md border border-primary/50 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10">
              Export artist data
            </Link>
          </div>

          <div className="grid gap-4">
            {visibleRows.map(({ artist, events: artistEvents, genres: artistGenres }) => (
              <article key={artist.id} className="rounded-lg border border-border bg-card p-4 transition hover:border-primary/50">
                <div className="grid gap-4 md:grid-cols-[96px_minmax(0,1fr)_220px]">
                  <Link href={artistPath(artist)} className="block">
                    {artist.image_url ? (
                      <img src={artist.image_url} alt={artist.title} className="aspect-square w-24 rounded-md object-cover" />
                    ) : (
                      <div className="flex aspect-square w-24 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                        No image
                      </div>
                    )}
                  </Link>

                  <div className="min-w-0">
                    <h3 className="text-xl font-semibold">
                      <Link href={artistPath(artist)} className="hover:text-primary">
                        {artist.title}
                      </Link>
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {artist.subtitle || artist.sound_descriptor || 'Electronic music artist profile with festival and source metadata.'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {artist.country_label ? (
                        <Link href={countryPath(artist.country_label)} className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground">
                          {artist.country_label}
                        </Link>
                      ) : null}
                      {artistGenres.slice(0, 6).map((genre) => (
                        <Link key={genre} href={genrePath(genre)} className="rounded-md border border-primary/35 px-2 py-1 text-xs text-primary hover:bg-primary hover:text-primary-foreground">
                          {genre}
                        </Link>
                      ))}
                    </div>
                    {artistEvents[0] ? (
                      <p className="mt-3 text-sm text-muted-foreground">
                        Next linked event:{' '}
                        <Link href={eventPath(artistEvents[0])} className="text-foreground hover:text-primary">
                          {artistEvents[0].title}
                        </Link>{' '}
                        on {formatEventDate(artistEvents[0].start_date, { hour: undefined, minute: undefined })}
                      </p>
                    ) : null}
                    <ArtistSocialLinks artist={artist} limit={4} compact />
                  </div>

                  <dl className="grid content-start gap-2 rounded-md border border-border/70 p-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Events</dt>
                      <dd className="font-medium">{artistEvents.length}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Popularity</dt>
                      <dd className="font-medium">{formatMetric(artist.popularity)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">BPM</dt>
                      <dd className="font-medium">{formatMetric(artist.tempo_bpm_mean)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Energy</dt>
                      <dd className="font-medium">{formatMetric(artist.energy_mean)}</dd>
                    </div>
                    <Link href={artistPath(artist)} className="mt-2 rounded-md bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90">
                      Open profile
                    </Link>
                    <Link href={`${artistPath(artist)}/similar`} className="rounded-md border border-border px-3 py-2 text-center text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground">
                      Similar artists
                    </Link>
                  </dl>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="grid content-start gap-5">
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-semibold">Browse by country</h2>
            <div className="mt-4 grid gap-2">
              {countries.slice(0, 18).map((country) => (
                <Link key={country.slug} href={filterHref({ country: country.label })} className="flex justify-between gap-4 text-sm text-muted-foreground hover:text-foreground">
                  <span>{country.label}</span>
                  <span>{country.artistCount}</span>
                </Link>
              ))}
            </div>
            <Link href="/countries" className="mt-4 inline-flex text-sm text-primary hover:underline">
              View all countries
            </Link>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-semibold">Browse by genre</h2>
            <div className="mt-4 grid gap-2">
              {genres.slice(0, 18).map((genre) => (
                <Link key={genre.slug} href={filterHref({ genre: genre.label })} className="flex justify-between gap-4 text-sm text-muted-foreground hover:text-foreground">
                  <span>{genre.label}</span>
                  <span>{genre.artistCount}</span>
                </Link>
              ))}
            </div>
            <Link href="/genres" className="mt-4 inline-flex text-sm text-primary hover:underline">
              View genre pages
            </Link>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-semibold">Subgenre shortcuts</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {musicSubgenres.slice(0, 12).map((genre) => (
                <Link key={genre} href={genrePath(genre)} className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground">
                  {genre}
                </Link>
              ))}
            </div>
            <Link href="/rising-artists" className="mt-4 inline-flex text-sm text-primary hover:underline">
              Rising artist radar
            </Link>
          </div>
        </aside>
      </section>
    </SeoShell>
  );
}
