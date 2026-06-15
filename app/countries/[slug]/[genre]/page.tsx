import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { ArtistEvidenceCard } from '@/components/seo/artist-evidence-card';
import { JsonLd } from '@/components/seo/json-ld';
import { SeoShell } from '@/components/seo/seo-shell';
import {
  absoluteUrl,
  artistPath,
  breadcrumbItems,
  buildJsonLd,
  compactText,
  countryGenrePath,
  countryPath,
  findCountryGenreBySlug,
  getCountryGenreIndex,
  genrePath,
} from '@/lib/seo-data';

export const revalidate = 3600;

type PageProps = {
  params: Promise<{ slug: string; genre: string }>;
};

async function loadCountryGenre(countrySlug: string, genreSlug: string) {
  return findCountryGenreBySlug(countrySlug, genreSlug);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, genre } = await params;
  const data = await loadCountryGenre(slug, genre);
  if (!data) return { title: 'Country genre page not found' };

  const canonicalPath = countryGenrePath(data.country.label, data.genre.label);
  const title = `${data.genre.label} Artists in ${data.country.label}`;
  const description = compactText(
    `Find ${data.artistCount} ${data.genre.label} artist${data.artistCount === 1 ? '' : 's'} in ${data.country.label}, with Spotify genres, followers, top tracks, event history, and export-ready artist profiles.`
  ).slice(0, 160);

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: `${title} | LineupBase`,
      description,
      url: canonicalPath,
      type: 'website',
    },
  };
}

export default async function CountryGenrePage({ params }: PageProps) {
  const { slug, genre } = await params;
  const data = await loadCountryGenre(slug, genre);
  if (!data) notFound();

  const canonicalPath = countryGenrePath(data.country.label, data.genre.label);
  if (`/countries/${slug}/${genre}` !== canonicalPath) redirect(canonicalPath);

  const relatedCombos = (await getCountryGenreIndex())
    .filter((row) => row.country.slug === data.country.slug && row.genre.slug !== data.genre.slug)
    .slice(0, 12);
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Countries', href: '/countries' },
    { label: data.country.label, href: countryPath(data.country.label) },
    { label: data.genre.label, href: canonicalPath },
  ];
  const breadcrumbJson = buildJsonLd('breadcrumb', { items: breadcrumbItems(breadcrumbs.map((crumb) => ({ name: crumb.label, path: crumb.href }))) });
  const itemListJson = buildJsonLd('itemList', {
    name: `${data.genre.label} artists in ${data.country.label}`,
    items: data.artists.slice(0, 80).map((artist) => ({ name: artist.title, url: absoluteUrl(artistPath(artist)) })),
  });

  return (
    <SeoShell breadcrumbs={breadcrumbs}>
      <JsonLd data={[breadcrumbJson, itemListJson]} />

      <section>
        <p className="mb-3 text-sm font-medium uppercase text-primary">Country + genre directory</p>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <h1 className="max-w-5xl text-4xl font-semibold tracking-tight md:text-6xl">
              {data.genre.label} Artists in {data.country.label}
            </h1>
            <p className="mt-5 max-w-3xl text-lg text-muted-foreground">
              LineupBase indexes {data.artistCount.toLocaleString()} {data.genre.label} artist{data.artistCount === 1 ? '' : 's'} from {data.country.label}
              {data.eventCount ? ` across ${data.eventCount.toLocaleString()} linked festival event${data.eventCount === 1 ? '' : 's'}.` : '.'}
              {' '}
              Use this page to compare Spotify genres, followers, top tracks, images, and event context before building a shortlist.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Artists', data.artistCount],
              ['Events', data.eventCount],
              ['With Spotify', data.artists.filter((artist) => artist.spotify_id).length],
              ['With top tracks', data.artists.filter((artist) => artist.top_track_id).length],
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Build a {data.country.label} {data.genre.label} shortlist</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Export artist names, countries, Spotify links, genres, followers, popularity, top tracks, and event context.
            </p>
          </div>
          <Link href="/monetize" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Export this segment
          </Link>
        </div>
      </section>

      <section className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <h2 className="text-2xl font-semibold">Ranked artist profiles</h2>
          <div className="mt-4 grid gap-4">
            {data.artists.slice(0, 120).map((artist, index) => (
              <ArtistEvidenceCard key={artist.id} artist={artist} events={data.events.filter((event) => event.artists?.some((row) => Number(row.id) === Number(artist.id) || Number(row.ade_id) === Number(artist.ade_id)))} rank={index + 1} />
            ))}
          </div>
        </div>

        <aside className="grid content-start gap-5">
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-semibold">Related {data.country.label} segments</h2>
            <div className="mt-4 grid gap-3">
              {relatedCombos.map((row) => (
                <Link key={row.genre.slug} href={countryGenrePath(row.country.label, row.genre.label)} className="flex justify-between gap-4 text-sm text-muted-foreground hover:text-foreground">
                  <span>{row.genre.label}</span>
                  <span>{row.artistCount}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-semibold">Browse broader pages</h2>
            <div className="mt-4 grid gap-3 text-sm">
              <Link href={countryPath(data.country.label)} className="text-muted-foreground hover:text-foreground">
                All artists from {data.country.label}
              </Link>
              <Link href={genrePath(data.genre)} className="text-muted-foreground hover:text-foreground">
                All {data.genre.label} artists
              </Link>
              <Link href="/rising-artists" className="text-muted-foreground hover:text-foreground">
                Rising electronic artists
              </Link>
            </div>
          </div>
        </aside>
      </section>
    </SeoShell>
  );
}
