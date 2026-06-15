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
  countryPath,
  findArtistBySlug,
  getArtistEvents,
  getArtistGenreLabels,
  getSimilarArtistRows,
  genrePath,
  hasSeoArtistValue,
} from '@/lib/seo-data';

export const revalidate = 3600;

type PageProps = {
  params: Promise<{ slug: string }>;
};

async function loadSeed(slug: string) {
  const artist = await findArtistBySlug(slug);
  if (!artist) return null;
  const events = await getArtistEvents(artist);
  if (!hasSeoArtistValue(artist, events)) return null;
  return { artist, events };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadSeed(slug);
  if (!data) return { title: 'Similar artists not found' };

  const canonicalPath = `${artistPath(data.artist)}/similar`;
  const genres = getArtistGenreLabels(data.artist);
  const description = compactText(
    `Find artists like ${data.artist.title} using shared Spotify genres, country, popularity, energy profile, top tracks, and festival event appearances.`
  ).slice(0, 160);

  return {
    title: `Artists Like ${data.artist.title}`,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: `Artists Like ${data.artist.title} | LineupBase`,
      description,
      url: canonicalPath,
      type: 'website',
      images: data.artist.image_url ? [{ url: data.artist.image_url, alt: data.artist.title }] : undefined,
    },
    keywords: [data.artist.title, ...genres, 'similar artists', 'electronic music discovery'].filter(Boolean) as string[],
  };
}

export default async function SimilarArtistsPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await loadSeed(slug);
  if (!data) notFound();

  const canonicalArtistPath = artistPath(data.artist);
  if (slug !== canonicalArtistPath.split('/').pop()) redirect(`${canonicalArtistPath}/similar`);

  const rows = await getSimilarArtistRows(data.artist);
  const genres = getArtistGenreLabels(data.artist);
  const canonicalPath = `${canonicalArtistPath}/similar`;
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Artists', href: '/artists' },
    { label: data.artist.title, href: canonicalArtistPath },
    { label: 'Similar', href: canonicalPath },
  ];
  const breadcrumbJson = buildJsonLd('breadcrumb', { items: breadcrumbItems(breadcrumbs.map((crumb) => ({ name: crumb.label, path: crumb.href }))) });
  const itemListJson = buildJsonLd('itemList', {
    name: `Artists like ${data.artist.title}`,
    items: rows.slice(0, 80).map((row) => ({ name: row.artist.title, url: absoluteUrl(artistPath(row.artist)) })),
  });

  return (
    <SeoShell breadcrumbs={breadcrumbs}>
      <JsonLd data={[breadcrumbJson, itemListJson]} />

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <p className="mb-3 text-sm font-medium uppercase text-primary">Similarity directory</p>
          <h1 className="max-w-5xl text-4xl font-semibold tracking-tight md:text-6xl">Artists Like {data.artist.title}</h1>
          <p className="mt-5 max-w-3xl text-lg text-muted-foreground">
            Similarity is based on shared Spotify genre labels, country, popularity range, energy profile, top-track context, and linked festival event appearances.
            Use this page to widen a booking shortlist without losing musical fit.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {data.artist.country_label ? (
              <Link href={countryPath(data.artist.country_label)} className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground">
                {data.artist.country_label}
              </Link>
            ) : null}
            {genres.map((genre) => (
              <Link key={genre} href={genrePath(genre)} className="rounded-md border border-primary/35 px-3 py-1.5 text-sm text-primary hover:bg-primary hover:text-primary-foreground">
                {genre}
              </Link>
            ))}
          </div>
        </div>

        <aside className="rounded-lg border border-border bg-card p-4">
          {data.artist.image_url ? (
            <img src={data.artist.image_url} alt={data.artist.title} className="aspect-[4/3] w-full rounded-md object-cover" />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">Seed artist</div>
          )}
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Matches</dt>
              <dd className="font-medium">{rows.length}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Seed events</dt>
              <dd className="font-medium">{data.events.length}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Followers</dt>
              <dd className="font-medium">{typeof data.artist.followers === 'number' ? data.artist.followers.toLocaleString() : 'n/a'}</dd>
            </div>
            <Link href="/monetize" className="mt-2 rounded-md bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Export similar artists
            </Link>
          </dl>
        </aside>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Closest artist matches</h2>
        <div className="mt-4 grid gap-4">
          {rows.length ? rows.slice(0, 80).map((row, index) => (
            <ArtistEvidenceCard
              key={row.artist.id}
              artist={row.artist}
              events={row.events}
              reasons={row.reasons}
              rank={index + 1}
            />
          )) : (
            <div className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
              No strong similarity matches are available yet.
            </div>
          )}
        </div>
      </section>
    </SeoShell>
  );
}
