import type { Metadata } from 'next';
import Link from 'next/link';

import { JsonLd } from '@/components/seo/json-ld';
import { SeoShell } from '@/components/seo/seo-shell';
import {
  absoluteUrl,
  breadcrumbItems,
  buildJsonLd,
  countryGenrePath,
  countryPath,
  getCountryGenreIndex,
  getCountryIndex,
} from '@/lib/seo-data';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Electronic Music Artists by Country',
  description: 'Browse electronic music artists by country, with linked artist profiles, events, and festival metadata.',
  alternates: { canonical: '/countries' },
  openGraph: {
    title: 'Electronic Music Artists by Country | LineupBase',
    description: 'Country directory for electronic music artist discovery.',
    url: '/countries',
    type: 'website',
  },
};

export default async function CountriesPage() {
  const [countries, countryGenres] = await Promise.all([getCountryIndex(), getCountryGenreIndex()]);
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Countries', href: '/countries' },
  ];
  const breadcrumbJson = buildJsonLd('breadcrumb', { items: breadcrumbItems(breadcrumbs.map((crumb) => ({ name: crumb.label, path: crumb.href }))) });
  const itemListJson = buildJsonLd('itemList', {
    name: 'Electronic music artists by country',
    items: countries.map((country) => ({ name: country.label, url: absoluteUrl(countryPath(country.label)) })),
  });

  return (
    <SeoShell breadcrumbs={breadcrumbs}>
      <JsonLd data={[breadcrumbJson, itemListJson]} />

      <section>
        <p className="mb-3 text-sm font-medium uppercase text-primary">Country directory</p>
        <h1 className="max-w-5xl text-4xl font-semibold tracking-tight md:text-6xl">Electronic Music Artists by Country</h1>
        <p className="mt-5 max-w-3xl text-lg text-muted-foreground">
          Find electronic music artists by country, then drill into individual artist profiles, genres, subgenres, source links, and event appearances.
        </p>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {countries.map((country) => (
          <div key={country.slug} className="rounded-lg border border-border bg-card p-5 transition hover:border-primary/50">
            <h2 className="text-xl font-semibold">{country.label}</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              {country.artistCount.toLocaleString()} artist{country.artistCount === 1 ? '' : 's'}
              {country.eventCount ? ` and ${country.eventCount.toLocaleString()} linked event${country.eventCount === 1 ? '' : 's'}` : ''}.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={countryPath(country.label)} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                All artists
              </Link>
              {countryGenres.filter((row) => row.country.slug === country.slug).slice(0, 3).map((row) => (
                <Link key={row.genre.slug} href={countryGenrePath(row.country.label, row.genre.label)} className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground">
                  {row.genre.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>
    </SeoShell>
  );
}
