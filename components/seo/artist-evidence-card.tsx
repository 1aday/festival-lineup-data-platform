import Link from 'next/link';

import { ArtistSocialLinks } from '@/components/seo/artist-social-links';
import {
  artistPath,
  countryPath,
  genrePath,
  getArtistGenreLabels,
  type SeoArtist,
  type SeoEvent,
} from '@/lib/seo-data';

type ArtistEvidenceCardProps = {
  artist: SeoArtist;
  events?: SeoEvent[];
  reasons?: string[];
  rank?: number;
  compact?: boolean;
};

function formatNumber(value: number | null | undefined) {
  if (typeof value !== 'number') return 'n/a';
  return value.toLocaleString();
}

function formatEnergy(value: number | null | undefined) {
  if (typeof value !== 'number') return 'n/a';
  return `${Math.round(value * 100)}%`;
}

export function ArtistEvidenceCard({
  artist,
  events = [],
  reasons = [],
  rank,
  compact = false,
}: ArtistEvidenceCardProps) {
  const genres = getArtistGenreLabels(artist);

  return (
    <article className="rounded-lg border border-border bg-card p-4 transition hover:border-primary/50">
      <div className={`grid gap-4 ${compact ? '' : 'md:grid-cols-[88px_minmax(0,1fr)_220px]'}`}>
        <Link href={artistPath(artist)} className="block">
          {artist.image_url ? (
            <img src={artist.image_url} alt={artist.title} className="aspect-square w-20 rounded-md object-cover" />
          ) : (
            <div className="flex aspect-square w-20 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
              {rank ? `#${rank}` : 'Artist'}
            </div>
          )}
        </Link>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {rank ? <span className="text-sm text-primary">#{rank}</span> : null}
            <h3 className="text-lg font-semibold">
              <Link href={artistPath(artist)} className="hover:text-primary">
                {artist.title}
              </Link>
            </h3>
          </div>

          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {artist.sound_descriptor || artist.subtitle || artist.top_track_name || 'Electronic music artist profile with festival and Spotify metadata.'}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {artist.country_label ? (
              <Link href={countryPath(artist.country_label)} className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground">
                {artist.country_label}
              </Link>
            ) : null}
            {genres.slice(0, 5).map((genre) => (
              <Link key={genre} href={genrePath(genre)} className="rounded-md border border-primary/35 px-2 py-1 text-xs text-primary hover:bg-primary hover:text-primary-foreground">
                {genre}
              </Link>
            ))}
          </div>

          {reasons.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {reasons.slice(0, 4).map((reason) => (
                <span key={reason} className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
                  {reason}
                </span>
              ))}
            </div>
          ) : null}

          {events[0] ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Seen at <span className="text-foreground">{events[0].title}</span>
              {events[0].venue_name ? `, ${events[0].venue_name}` : ''}.
            </p>
          ) : null}

          <ArtistSocialLinks artist={artist} limit={4} compact />
        </div>

        {!compact ? (
          <dl className="grid content-start gap-2 rounded-md border border-border/70 p-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Followers</dt>
              <dd className="font-medium">{formatNumber(artist.followers)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Popularity</dt>
              <dd className="font-medium">{formatNumber(artist.popularity)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Energy</dt>
              <dd className="font-medium">{formatEnergy(artist.energy_mean)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Events</dt>
              <dd className="font-medium">{events.length}</dd>
            </div>
            {artist.top_track_name ? (
              <div>
                <dt className="text-muted-foreground">Top track</dt>
                <dd className="mt-1 line-clamp-2 font-medium">{artist.top_track_name}</dd>
              </div>
            ) : null}
            <div className="mt-2 grid gap-2">
              <Link href={artistPath(artist)} className="rounded-md bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Open profile
              </Link>
              <Link href={`${artistPath(artist)}/similar`} className="rounded-md border border-border px-3 py-2 text-center text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground">
                Similar artists
              </Link>
            </div>
          </dl>
        ) : null}
      </div>
    </article>
  );
}
