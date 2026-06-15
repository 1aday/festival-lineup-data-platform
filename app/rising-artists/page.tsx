import type { Metadata } from 'next';
import Link from 'next/link';

import { ArtistEvidenceCard } from '@/components/seo/artist-evidence-card';
import { JsonLd } from '@/components/seo/json-ld';
import { SeoShell } from '@/components/seo/seo-shell';
import {
  absoluteUrl,
  artistPath,
  breadcrumbItems,
  buildJsonLd,
  getExpandedGenreIndex,
  getRisingArtistRows,
} from '@/lib/seo-data';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Rising Electronic Music Artists',
  description: 'Discover emerging and rising electronic music artists using festival appearances, Spotify enrichment, genres, followers, top tracks, and popularity signals.',
  alternates: { canonical: '/rising-artists' },
  openGraph: {
    title: 'Rising Electronic Music Artists | LineupBase',
    description: 'Emerging artist discovery for electronic music promoters, agencies, venues, and festival teams.',
    url: '/rising-artists',
    type: 'website',
  },
};

export default async function RisingArtistsPage() {
  const [rows, genres] = await Promise.all([getRisingArtistRows(), getExpandedGenreIndex()]);
  const visibleRows = rows.slice(0, 120);
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Artists', href: '/artists' },
    { label: 'Rising artists', href: '/rising-artists' },
  ];
  const breadcrumbJson = buildJsonLd('breadcrumb', { items: breadcrumbItems(breadcrumbs.map((crumb) => ({ name: crumb.label, path: crumb.href }))) });
  const itemListJson = buildJsonLd('itemList', {
    name: 'Rising electronic music artists',
    items: visibleRows.slice(0, 80).map((row) => ({ name: row.artist.title, url: absoluteUrl(artistPath(row.artist)) })),
  });

  return (
    <SeoShell breadcrumbs={breadcrumbs}>
      <JsonLd data={[breadcrumbJson, itemListJson]} />

      <section>
        <p className="mb-3 text-sm font-medium uppercase text-primary">Growth radar</p>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <h1 className="max-w-5xl text-4xl font-semibold tracking-tight md:text-6xl">Rising Electronic Music Artists</h1>
            <p className="mt-5 max-w-3xl text-lg text-muted-foreground">
              A discovery layer for emerging electronic artists with festival appearances, Spotify profiles, genre signals, images, top tracks, and lower follower counts. Built for promoters, bookers, agencies, venues, and artist discovery teams.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Ranked artists', rows.length],
              ['Visible now', visibleRows.length],
              ['Genres indexed', genres.length],
              ['Export fields', 12],
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
            <h2 className="text-xl font-semibold">Turn discovery into a shortlist</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Export artist names, countries, Spotify URLs, followers, popularity, top tracks, genres, and event context.
            </p>
          </div>
          <Link href="/monetize" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Export rising artists
          </Link>
        </div>
      </section>

      <section className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <h2 className="text-2xl font-semibold">Ranked by discovery signal</h2>
          <div className="mt-4 grid gap-4">
            {visibleRows.map((row, index) => (
              <ArtistEvidenceCard
                key={row.artist.id}
                artist={row.artist}
                events={row.events}
                reasons={row.reasons}
                rank={index + 1}
              />
            ))}
          </div>
        </div>

        <aside className="grid content-start gap-5">
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-semibold">Strong subgenres</h2>
            <div className="mt-4 grid gap-3">
              {genres.slice(0, 14).map((genre) => (
                <Link key={genre.slug} href={`/genres/${genre.slug}`} className="flex justify-between gap-4 text-sm text-muted-foreground hover:text-foreground">
                  <span>{genre.label}</span>
                  <span>{genre.artistCount}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-semibold">Why this page ranks</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              The score favors artists with real festival appearances, Spotify profile data, images, genre specificity, and moderate follower counts where discovery value is higher.
            </p>
          </div>
        </aside>
      </section>
    </SeoShell>
  );
}
