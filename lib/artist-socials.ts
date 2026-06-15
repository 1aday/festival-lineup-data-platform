import type { DBArtist } from '@/lib/types';

export type ArtistWithSocials = Partial<DBArtist> & {
  social_links?: Record<string, string | null | undefined> | null;
  [key: string]: unknown;
};

export const ARTIST_SOCIAL_PLATFORMS = [
  { key: 'instagram', field: 'instagram_url', label: 'Instagram' },
  { key: 'facebook', field: 'facebook_url', label: 'Facebook' },
  { key: 'soundcloud', field: 'soundcloud_url', label: 'SoundCloud' },
  { key: 'spotify', field: 'spotify_url', label: 'Spotify' },
  { key: 'website', field: 'website_url', label: 'Website' },
  { key: 'x', field: 'x_url', label: 'X' },
  { key: 'youtube', field: 'youtube_url', label: 'YouTube' },
  { key: 'tiktok', field: 'tiktok_url', label: 'TikTok' },
  { key: 'bandcamp', field: 'bandcamp_url', label: 'Bandcamp' },
  { key: 'ra', field: 'ra_url', label: 'RA' },
  { key: 'beatport', field: 'beatport_url', label: 'Beatport' },
  { key: 'mixcloud', field: 'mixcloud_url', label: 'Mixcloud' },
  { key: 'linktree', field: 'linktree_url', label: 'Linktree' },
] as const;

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function getArtistSocialLinks(artist: ArtistWithSocials) {
  const seen = new Set<string>();

  return ARTIST_SOCIAL_PLATFORMS.flatMap((platform) => {
    const direct = stringValue(artist[platform.field]);
    const nested = stringValue(artist.social_links?.[platform.key]);
    const url = direct || nested;
    if (!url || seen.has(url)) return [];
    seen.add(url);
    return [{ ...platform, url }];
  });
}

export function getArtistSameAs(artist: ArtistWithSocials) {
  const urls = [stringValue(artist.url), ...getArtistSocialLinks(artist).map((link) => link.url)];
  return Array.from(new Set(urls.filter(Boolean) as string[]));
}
