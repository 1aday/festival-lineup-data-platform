import type { Metadata } from 'next';
import Link from 'next/link';

import { JsonLd } from '@/components/seo/json-ld';
import { SeoShell } from '@/components/seo/seo-shell';
import {
  absoluteUrl,
  breadcrumbItems,
  buildJsonLd,
  genrePath,
  getExpandedGenreIndex,
} from '@/lib/seo-data';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'European Electronic Music Genres',
  description: 'Browse curated electronic music genre pages with artists, events, venues, and festival metadata.',
  alternates: { canonical: '/genres' },
  openGraph: {
    title: 'European Electronic Music Genres | LineupBase',
    description: 'Curated genre directory for European electronic music festival discovery.',
    url: '/genres',
    type: 'website',
  },
};

export default async function GenresPage() {
  const genres = await getExpandedGenreIndex();
  const primaryGenres = genres.slice(0, 36);
  const subgenres = genres.slice(36, 180);
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Genres', href: '/genres' },
  ];
  const breadcrumbJson = buildJsonLd('breadcrumb', { items: breadcrumbItems(breadcrumbs.map((crumb) => ({ name: crumb.label, path: crumb.href }))) });
  const itemListJson = buildJsonLd('itemList', {
    name: 'European electronic music genres',
    items: genres.map((genre) => ({ name: genre.label, url: absoluteUrl(genrePath(genre)) })),
  });

  return (
    <SeoShell breadcrumbs={breadcrumbs}>
      <JsonLd data={[breadcrumbJson, itemListJson]} />

      <section>
        <p className="mb-3 text-sm font-medium uppercase text-primary">Curated genre directory</p>
        <h1 className="max-w-5xl text-4xl font-semibold tracking-tight md:text-6xl">European Electronic Music Genres</h1>
        <p className="mt-5 max-w-3xl text-lg text-muted-foreground">
          Explore genre and subgenre pages built from Spotify-enriched artist metadata, event categories, lineup metadata, and venue context. Noisy role labels and scraped biography fragments are excluded from this SEO index.
        </p>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {primaryGenres.map((genre) => (
          <Link key={genre.slug} href={genrePath(genre)} className="rounded-lg border border-border bg-card p-5 transition hover:border-primary/50">
            <h2 className="text-xl font-semibold">{genre.label}</h2>
            <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{genre.description}</p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-md border border-border px-2 py-1">{genre.eventCount} events</span>
              <span className="rounded-md border border-border px-2 py-1">{genre.artistCount} artists</span>
            </div>
          </Link>
        ))}
      </section>

      <section className="mt-12">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium uppercase text-primary">Spotify subgenres</p>
            <h2 className="mt-2 text-2xl font-semibold">Long-tail artist discovery pages</h2>
          </div>
          <Link href="/rising-artists" className="rounded-md border border-primary/50 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10">
            See rising artists
          </Link>
        </div>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          {subgenres.map((genre) => (
            <Link key={genre.slug} href={genrePath(genre)} className="flex justify-between gap-4 rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground">
              <span>{genre.label}</span>
              <span>{genre.artistCount}</span>
            </Link>
          ))}
        </div>
      </section>
    </SeoShell>
  );
}
