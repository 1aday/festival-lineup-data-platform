import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

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
  eventPath,
  findCountryBySlug,
  formatEventDate,
  getCountryGenreIndex,
} from '@/lib/seo-data';

export const revalidate = 3600;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const country = await findCountryBySlug(slug);
  if (!country) return { title: 'Country not found' };

  const canonicalPath = countryPath(country.label);
  const description = compactText(
    `${country.artistCount} ${country.label} artist${country.artistCount === 1 ? '' : 's'} in the LineupBase European electronic music festival directory, with linked events and venue metadata.`
  ).slice(0, 160);

  return {
    title: `${country.label} Electronic Music Artists`,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: `${country.label} Electronic Music Artists | LineupBase`,
      description,
      url: canonicalPath,
      type: 'website',
    },
  };
}

export default async function CountryPage({ params }: PageProps) {
  const { slug } = await params;
  const country = await findCountryBySlug(slug);
  if (!country) notFound();

  const canonicalPath = countryPath(country.label);
  const countryGenres = (await getCountryGenreIndex()).filter((row) => row.country.slug === country.slug).slice(0, 18);
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Countries', href: '/artists' },
    { label: country.label, href: canonicalPath },
  ];
  const breadcrumbJson = buildJsonLd('breadcrumb', { items: breadcrumbItems(breadcrumbs.map((crumb) => ({ name: crumb.label, path: crumb.href }))) });
  const itemListJson = buildJsonLd('itemList', {
    name: `${country.label} electronic music artists`,
    items: country.artists.slice(0, 80).map((artist) => ({ name: artist.title, url: absoluteUrl(artistPath(artist)) })),
  });

  return (
    <SeoShell breadcrumbs={breadcrumbs}>
      <JsonLd data={[breadcrumbJson, itemListJson]} />

      <section>
        <p className="mb-3 text-sm font-medium uppercase text-primary">Country directory</p>
        <h1 className="max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">{country.label} Electronic Music Artists</h1>
        <p className="mt-5 max-w-3xl text-lg text-muted-foreground">
          LineupBase indexes {country.artistCount} artist{country.artistCount === 1 ? '' : 's'} from {country.label}
          {country.eventCount ? ` across ${country.eventCount} linked festival event${country.eventCount === 1 ? '' : 's'}.` : ' in the European electronic music festival dataset.'}
        </p>
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <h2 className="text-2xl font-semibold">Artists from {country.label}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {country.artists.slice(0, 80).map((artist) => (
              <Link key={artist.id} href={artistPath(artist)} className="flex gap-3 rounded-lg border border-border bg-card p-4 transition hover:border-primary/50">
                {artist.image_url ? <img src={artist.image_url} alt={artist.title} className="h-14 w-14 rounded-md object-cover" /> : <span className="h-14 w-14 rounded-md bg-muted" />}
                <span>
                  <span className="block font-semibold">{artist.title}</span>
                  <span className="text-sm text-muted-foreground">{artist.subtitle || 'Artist profile'}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>

        <aside>
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-semibold">Popular segments</h2>
            <div className="mt-4 grid gap-3">
              {countryGenres.map((row) => (
                <Link key={row.genre.slug} href={countryGenrePath(row.country.label, row.genre.label)} className="flex justify-between gap-4 text-sm text-muted-foreground hover:text-foreground">
                  <span>{row.genre.label}</span>
                  <span>{row.artistCount}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-border bg-card p-5">
            <h2 className="font-semibold">Linked events</h2>
            <div className="mt-4 grid gap-3">
              {country.events.slice(0, 12).map((event) => (
                <Link key={event.id} href={eventPath(event)} className="block rounded-md border border-border p-3 text-sm hover:border-primary/50">
                  <span className="font-medium">{event.title}</span>
                  <span className="mt-1 block text-muted-foreground">{formatEventDate(event.start_date)}</span>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </SeoShell>
  );
}
