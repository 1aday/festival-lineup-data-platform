import { cache } from 'react';

import { absoluteUrl, appBaseUrl, parseEntitySlug, slugifyEntity } from '@/lib/entity-slugs';
import { fetchCloudflareData } from '@/lib/cloudflare-data';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { DBArtist, DBEvent } from '@/lib/types';
import fallbackArtistsJson from '@/data/seo-artists.json';
import fallbackEventsJson from '@/data/seo-events.json';

export { absoluteUrl, appBaseUrl, parseEntitySlug, slugifyEntity };

export type SeoArtist = DBArtist & {
  source_image_url?: string | null;
  image_key?: string | null;
};

export type SeoEvent = DBEvent & {
  artists?: SeoArtist[];
  avg_energy?: number;
};

export type SeoVenue = {
  name: string;
  slug: string;
  events: SeoEvent[];
  eventCount: number;
  artists: SeoArtist[];
  lastModified: Date;
};

export type SeoCountry = {
  label: string;
  slug: string;
  artists: SeoArtist[];
  events: SeoEvent[];
  artistCount: number;
  eventCount: number;
  lastModified: Date;
};

export type CuratedGenre = {
  label: string;
  slug: string;
  aliases: string[];
  description: string;
};

export type SeoGenre = CuratedGenre & {
  events: SeoEvent[];
  artists: SeoArtist[];
  eventCount: number;
  artistCount: number;
  lastModified: Date;
  source?: 'curated' | 'spotify';
};

export type SeoCountryGenre = {
  country: SeoCountry;
  genre: SeoGenre;
  artists: SeoArtist[];
  events: SeoEvent[];
  artistCount: number;
  eventCount: number;
  lastModified: Date;
};

export type SeoArtistScoreRow = {
  artist: SeoArtist;
  events: SeoEvent[];
  genres: string[];
  score: number;
  reasons: string[];
};

export const CURATED_GENRES: CuratedGenre[] = [
  { label: 'Techno', slug: 'techno', aliases: ['Techno', 'Peak Time Techno', 'Minimal Techno'], description: 'Techno artists, showcases, and club events across European electronic music festivals.' },
  { label: 'House', slug: 'house', aliases: ['House', 'Deep House', 'Tech House', 'Big Room House'], description: 'House music lineups, artists, venues, and festival events.' },
  { label: 'Deep House', slug: 'deep-house', aliases: ['Deep House'], description: 'Deep house artists and events in the European festival circuit.' },
  { label: 'Tech House', slug: 'tech-house', aliases: ['Tech House', 'Techhouse'], description: 'Tech house events, artists, and venues from the featured festival dataset.' },
  { label: 'Trance', slug: 'trance', aliases: ['Trance', 'Psy Trance'], description: 'Trance-focused artists, parties, and festival programming.' },
  { label: 'Drum and Bass', slug: 'drum-and-bass', aliases: ['Drum and Bass', 'Drum & Bass'], description: 'Drum and bass artists and event listings from European festival data.' },
  { label: 'Hard Dance', slug: 'hard-dance', aliases: ['Hard Dance', 'Hard Attack'], description: 'Hard dance lineups, showcases, and high-energy festival events.' },
  { label: 'Ambient', slug: 'ambient', aliases: ['Ambient'], description: 'Ambient performances and listening-focused festival programming.' },
  { label: 'Disco', slug: 'disco', aliases: ['Disco', 'Funky'], description: 'Disco and funky dance music events, artists, and venues.' },
  { label: 'Afrobeats', slug: 'afrobeats', aliases: ['Afrobeats'], description: 'Afrobeats artists and festival events in the electronic music ecosystem.' },
  { label: 'Amapiano', slug: 'amapiano', aliases: ['Amapiano'], description: 'Amapiano artists, events, and festival showcases.' },
  { label: 'Breakbeat', slug: 'breakbeat', aliases: ['Breakbeat'], description: 'Breakbeat artists and events from the featured festival dataset.' },
  { label: 'Dub', slug: 'dub', aliases: ['Dub'], description: 'Dub-influenced electronic music programming and artists.' },
  { label: 'Bass', slug: 'bass', aliases: ['Bass'], description: 'Bass music artists, venues, and event listings.' },
  { label: 'Hip Hop and Rap', slug: 'hip-hop-and-rap', aliases: ['Hip Hop and Rap', 'Hip Hop', 'Rap'], description: 'Hip hop and rap-adjacent festival programming in electronic music contexts.' },
  { label: 'Live Performances', slug: 'live-performances', aliases: ['Live', 'Live Performances', 'Live Concerts'], description: 'Live electronic music performances and concert-format festival events.' },
  { label: 'Club Nights', slug: 'club-nights', aliases: ['Club Nights', 'Nighttime Events'], description: 'Nighttime club events, lineups, and venues.' },
  { label: 'Daytime Events', slug: 'daytime-events', aliases: ['Daytime Events', 'Evening Starters'], description: 'Daytime festival programming, talks, showcases, and social events.' },
  { label: 'Boat Parties', slug: 'boat-parties', aliases: ['Boat Parties', 'Boats'], description: 'Boat party events and waterfront festival programming.' },
  { label: 'Free Events', slug: 'free-events', aliases: ['Free Events'], description: 'Free festival events and open-access programming.' },
  { label: 'Panels and Talks', slug: 'panels-and-talks', aliases: ['Panels and Talks', 'Talks and Networking', 'Keynotes', 'Q and As'], description: 'Industry talks, panels, keynotes, and networking events.' },
  { label: 'Workshops', slug: 'workshops', aliases: ['Workshops', 'Masterclasses'], description: 'Workshops, masterclasses, and learning sessions for artists and industry teams.' },
  { label: 'Networking Events', slug: 'networking-events', aliases: ['Networking', 'Networking Events'], description: 'Networking sessions and industry meetups across the festival week.' },
  { label: 'Showcases', slug: 'showcases', aliases: ['Showcases and Expo\'s', 'Showcases'], description: 'Label showcases, expo programming, and curated festival lineups.' },
  { label: 'Audiovisual and Immersive Arts', slug: 'audiovisual-and-immersive-arts', aliases: ['Audiovisual and Immersive Arts', 'Visual Spectacles'], description: 'Audiovisual, immersive, and visual arts programming at electronic music festivals.' },
];

async function fetchCloudflareJson<T>(pathname: string): Promise<T | null> {
  try {
    return await fetchCloudflareData<T>(pathname);
  } catch {
    return null;
  }
}

async function fetchCloudflarePages<T>(pathname: string, pageSize: number, maxRows: number): Promise<T[] | null> {
  const rows: T[] = [];

  for (let offset = 0; offset < maxRows; offset += pageSize) {
    const separator = pathname.includes('?') ? '&' : '?';
    const batch = await fetchCloudflareJson<T[]>(`${pathname}${separator}limit=${pageSize}&offset=${offset}`);
    if (!batch) return null;

    rows.push(...batch);
    if (batch.length < pageSize) break;
  }

  return rows;
}

function normalizeArtist(artist: Partial<SeoArtist>): SeoArtist {
  return {
    id: Number(artist.id || artist.ade_id),
    ade_id: Number(artist.ade_id || artist.id),
    handle: artist.handle || null,
    title: artist.title || 'Unknown Artist',
    subtitle: artist.subtitle || null,
    url: artist.url || null,
    country_label: artist.country_label || null,
    country_value: artist.country_value || null,
    image_title: artist.image_title || null,
    image_url: artist.image_url || artist.spotify_image_url || null,
    first_seen_at: artist.first_seen_at || new Date().toISOString(),
    last_updated_at: artist.last_updated_at || new Date().toISOString(),
    is_active: artist.is_active !== false,
    raw_data: artist.raw_data || {},
    ...artist,
  } as SeoArtist;
}

function normalizeEvent(event: Partial<SeoEvent>): SeoEvent {
  return {
    id: Number(event.id || event.ade_id),
    ade_id: Number(event.ade_id || event.id),
    title: event.title || 'Unknown Event',
    subtitle: event.subtitle || null,
    url: event.url || null,
    start_date: event.start_date || '',
    end_date: event.end_date || event.start_date || '',
    venue_name: event.venue_name || null,
    venue_address: event.venue_address || null,
    event_type: event.event_type || null,
    categories: event.categories || null,
    sold_out: Boolean(event.sold_out),
    first_seen_at: event.first_seen_at || new Date().toISOString(),
    last_updated_at: event.last_updated_at || new Date().toISOString(),
    is_active: event.is_active !== false,
    raw_data: event.raw_data || {},
    ...event,
    artists: Array.isArray(event.artists) ? event.artists.map(normalizeArtist) : [],
  } as SeoEvent;
}

function getFallbackSeoArtists() {
  return (fallbackArtistsJson as Partial<SeoArtist>[]).map(normalizeArtist).filter((artist) => artist.is_active !== false);
}

function getFallbackSeoEvents() {
  return (fallbackEventsJson as Partial<SeoEvent>[]).map(normalizeEvent).filter(hasSeoEventValue);
}

export const getSeoArtists = cache(async (): Promise<SeoArtist[]> => {
  const cloudflareRows = await fetchCloudflarePages<SeoArtist>('/api/artists', 250, 6000);
  if (cloudflareRows?.length) {
    return cloudflareRows.map(normalizeArtist).filter((artist) => artist.is_active !== false);
  }

  const fallbackRows = getFallbackSeoArtists();
  if (fallbackRows.length) return fallbackRows;

  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from('artists')
    .select('*')
    .eq('is_active', true)
    .order('title', { ascending: true })
    .range(0, 4999);

  if (error || !data) return [];
  return data.map(normalizeArtist);
});

export const getSeoEvents = cache(async (): Promise<SeoEvent[]> => {
  const cloudflareRows = await fetchCloudflarePages<SeoEvent>('/api/events', 200, 3000);
  if (cloudflareRows?.length) {
    return cloudflareRows.map(normalizeEvent).filter(hasSeoEventValue);
  }

  const fallbackRows = getFallbackSeoEvents();
  if (fallbackRows.length) return fallbackRows;

  if (!isSupabaseConfigured()) return [];

  const [{ data: events }, { data: links }, { data: artists }] = await Promise.all([
    supabase.from('events').select('*').eq('is_active', true).order('start_date', { ascending: true }).range(0, 2999),
    supabase.from('artist_events').select('*').range(0, 9999),
    supabase.from('artists').select('*').eq('is_active', true).range(0, 4999),
  ]);

  const artistById = new Map<number, SeoArtist>((artists || []).map((artist) => [artist.id, normalizeArtist(artist)]));
  return (events || [])
    .map((event) => {
      const eventArtists = (links || [])
        .filter((link) => link.event_id === event.id)
        .map((link) => artistById.get(link.artist_id))
        .filter(Boolean) as SeoArtist[];

      return normalizeEvent({ ...event, artists: eventArtists });
    })
    .filter(hasSeoEventValue);
});

function truthyText(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function splitListText(value: string | null | undefined) {
  if (!value) return [];
  return value
    .split(/[|,/]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function normalizeGenre(value: string | null | undefined) {
  return String(value || '')
    .replace(/&/g, ' and ')
    .replace(/[-_/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

export function getArtistGenreLabels(artist: Partial<SeoArtist>) {
  const values = new Set<string>();

  if (Array.isArray(artist.genres)) {
    artist.genres.forEach((genre) => truthyText(genre) && values.add(String(genre).trim()));
  }

  splitListText(artist.primary_genres).forEach((genre) => values.add(genre));
  splitListText(artist.secondary_genres).forEach((genre) => values.add(genre));
  splitListText(artist.all_genres).forEach((genre) => values.add(genre));

  return Array.from(values).filter((genre) => genre.length > 1).slice(0, 8);
}

function genreSlug(value: string) {
  return slugifyEntity(value);
}

function normalizedGenreValue(value: string | null | undefined) {
  return normalizeGenre(value).toLowerCase();
}

export function artistMatchesGenreLabel(artist: Partial<SeoArtist>, genreLabel: string, aliases: string[] = []) {
  const artistGenres = getArtistGenreLabels(artist).map(normalizedGenreValue);
  const targets = [genreLabel, ...aliases].map(normalizedGenreValue).filter(Boolean);
  if (!artistGenres.length || !targets.length) return false;

  return targets.some((target) =>
    artistGenres.some((genre) => genre === target || genre.includes(target) || target.includes(genre))
  );
}

export function hasSeoArtistValue(artist: SeoArtist, events: SeoEvent[] = []) {
  if (!truthyText(artist.title)) return false;
  const appearsInEvent = events.some((event) =>
    event.artists?.some((eventArtist) => Number(eventArtist.id) === Number(artist.id) || Number(eventArtist.ade_id) === Number(artist.ade_id))
  );

  return Boolean(
    artist.image_url ||
      artist.spotify_image_url ||
      artist.country_label ||
      artist.url ||
      artist.spotify_url ||
      getArtistGenreLabels(artist).length ||
      appearsInEvent
  );
}

export function hasSeoEventValue(event: SeoEvent) {
  return Boolean(
    truthyText(event.title) &&
      truthyText(event.start_date) &&
      (truthyText(event.venue_name) || truthyText(event.categories) || Boolean(event.artists?.length))
  );
}

export const getEligibleSeoArtists = cache(async () => {
  const [artists, events] = await Promise.all([getSeoArtists(), getSeoEvents()]);
  return artists.filter((artist) => hasSeoArtistValue(artist, events));
});

export const getEligibleSeoEvents = cache(async () => {
  const events = await getSeoEvents();
  return events.filter(hasSeoEventValue);
});

export async function getArtistEvents(artist: SeoArtist) {
  const events = await getSeoEvents();
  return events
    .filter((event) =>
      event.artists?.some((eventArtist) => Number(eventArtist.id) === Number(artist.id) || Number(eventArtist.ade_id) === Number(artist.ade_id))
    )
    .sort((a, b) => dateMs(a.start_date) - dateMs(b.start_date));
}

export async function findArtistBySlug(slug: string) {
  const { id, baseSlug } = parseEntitySlug(slug);
  if (id && baseSlug) {
    const searchRows = await fetchCloudflareJson<SeoArtist[]>(
      `/api/artists?search=${encodeURIComponent(baseSlug.replace(/-/g, ' '))}&limit=25&offset=0`
    );
    const directMatch = searchRows
      ?.map(normalizeArtist)
      .find((artist) => Number(artist.ade_id || artist.id) === id || Number(artist.id) === id);
    if (directMatch) return directMatch;
  }

  const artists = await getSeoArtists();
  return artists.find((artist) => {
    if (id) return Number(artist.ade_id || artist.id) === id || Number(artist.id) === id;
    return slugifyEntity(artist.title) === baseSlug;
  }) || null;
}

export async function findEventBySlug(slug: string) {
  const { id, baseSlug } = parseEntitySlug(slug);
  const events = await getSeoEvents();
  return events.find((event) => {
    if (id) return Number(event.ade_id || event.id) === id || Number(event.id) === id;
    return slugifyEntity(event.title) === baseSlug;
  }) || null;
}

export function artistPath(artist: Pick<SeoArtist, 'title' | 'ade_id' | 'id'>) {
  return `/artists/${slugifyEntity(artist.title, artist.ade_id || artist.id)}`;
}

export function eventPath(event: Pick<SeoEvent, 'title' | 'ade_id' | 'id'>) {
  return `/events/${slugifyEntity(event.title, event.ade_id || event.id)}`;
}

export function venuePath(venueName: string) {
  return `/venues/${slugifyEntity(venueName)}`;
}

export function countryPath(countryLabel: string) {
  return `/countries/${slugifyEntity(countryLabel)}`;
}

export function genrePath(genre: Pick<CuratedGenre, 'slug'> | string) {
  return `/genres/${typeof genre === 'string' ? slugifyEntity(genre) : genre.slug}`;
}

function dateMs(value: string | null | undefined) {
  const ms = value ? new Date(value).getTime() : 0;
  return Number.isFinite(ms) ? ms : 0;
}

function latestDate(values: Array<string | null | undefined>) {
  const latest = values.reduce((max, value) => Math.max(max, dateMs(value)), 0);
  return latest ? new Date(latest) : new Date();
}

export const getVenueIndex = cache(async (): Promise<SeoVenue[]> => {
  const events = await getEligibleSeoEvents();
  const map = new Map<string, SeoEvent[]>();

  for (const event of events) {
    if (!event.venue_name) continue;
    const rows = map.get(event.venue_name) || [];
    rows.push(event);
    map.set(event.venue_name, rows);
  }

  return Array.from(map.entries())
    .map(([name, venueEvents]) => {
      const artists = uniqueArtists(venueEvents.flatMap((event) => event.artists || []));
      return {
        name,
        slug: slugifyEntity(name),
        events: venueEvents.sort((a, b) => dateMs(a.start_date) - dateMs(b.start_date)),
        eventCount: venueEvents.length,
        artists,
        lastModified: latestDate(venueEvents.map((event) => event.last_updated_at || event.start_date)),
      };
    })
    .filter((venue) => venue.eventCount > 0)
    .sort((a, b) => b.eventCount - a.eventCount || a.name.localeCompare(b.name));
});

export async function findVenueBySlug(slug: string) {
  const venues = await getVenueIndex();
  return venues.find((venue) => venue.slug === slug) || null;
}

export const getCountryIndex = cache(async (): Promise<SeoCountry[]> => {
  const [artists, events] = await Promise.all([getEligibleSeoArtists(), getEligibleSeoEvents()]);
  const map = new Map<string, SeoArtist[]>();

  for (const artist of artists) {
    if (!artist.country_label) continue;
    const rows = map.get(artist.country_label) || [];
    rows.push(artist);
    map.set(artist.country_label, rows);
  }

  return Array.from(map.entries())
    .map(([label, countryArtists]) => {
      const artistIds = new Set(countryArtists.flatMap((artist) => [Number(artist.id), Number(artist.ade_id)]));
      const countryEvents = events.filter((event) =>
        event.artists?.some((artist) => artistIds.has(Number(artist.id)) || artistIds.has(Number(artist.ade_id)))
      );
      return {
        label,
        slug: slugifyEntity(label),
        artists: countryArtists.sort((a, b) => a.title.localeCompare(b.title)),
        events: countryEvents.sort((a, b) => dateMs(a.start_date) - dateMs(b.start_date)),
        artistCount: countryArtists.length,
        eventCount: countryEvents.length,
        lastModified: latestDate([...countryArtists.map((artist) => artist.last_updated_at), ...countryEvents.map((event) => event.last_updated_at)]),
      };
    })
    .filter((country) => country.artistCount > 0)
    .sort((a, b) => b.artistCount - a.artistCount || a.label.localeCompare(b.label));
});

export async function findCountryBySlug(slug: string) {
  const countries = await getCountryIndex();
  return countries.find((country) => country.slug === slug) || null;
}

function categoryParts(value: string | null | undefined) {
  return splitListText(value).map(normalizeGenre);
}

function eventMatchesGenre(event: SeoEvent, genre: CuratedGenre) {
  const eventParts = categoryParts(event.categories);
  const aliases = genre.aliases.map(normalizeGenre);
  return aliases.some((alias) => eventParts.includes(alias));
}

export const getCuratedGenreIndex = cache(async (): Promise<SeoGenre[]> => {
  const events = await getEligibleSeoEvents();

  return CURATED_GENRES.map((genre) => {
    const genreEvents = events.filter((event) => eventMatchesGenre(event, genre));
    const artists = uniqueArtists(genreEvents.flatMap((event) => event.artists || []));
    return {
      ...genre,
      events: genreEvents.sort((a, b) => dateMs(a.start_date) - dateMs(b.start_date)),
      artists,
      eventCount: genreEvents.length,
      artistCount: artists.length,
      lastModified: latestDate(genreEvents.map((event) => event.last_updated_at || event.start_date)),
      source: 'curated' as const,
    };
  })
    .filter((genre) => genre.eventCount > 0 || genre.artistCount > 0)
    .sort((a, b) => b.eventCount - a.eventCount || a.label.localeCompare(b.label));
});

function shouldIndexSpotifyGenre(label: string, artistCount: number) {
  if (artistCount < 3) return false;
  const normalized = normalizedGenreValue(label);
  if (!normalized || normalized.length < 3) return false;
  const blocked = ['movie tunes', 'background music', 'sleep', 'children', 'christmas'];
  if (blocked.some((term) => normalized.includes(term))) return false;
  return true;
}

export const getSpotifyGenreIndex = cache(async (): Promise<SeoGenre[]> => {
  const [artists, events] = await Promise.all([getEligibleSeoArtists(), getEligibleSeoEvents()]);
  const artistEvents = new Map<number, SeoEvent[]>();

  for (const event of events) {
    for (const artist of event.artists || []) {
      const ids = [Number(artist.id), Number(artist.ade_id)].filter(Boolean);
      for (const id of ids) {
        const rows = artistEvents.get(id) || [];
        rows.push(event);
        artistEvents.set(id, rows);
      }
    }
  }

  const genreArtists = new Map<string, SeoArtist[]>();
  const labelBySlug = new Map<string, string>();

  for (const artist of artists) {
    for (const label of getArtistGenreLabels(artist)) {
      const slug = genreSlug(label);
      const rows = genreArtists.get(slug) || [];
      rows.push(artist);
      genreArtists.set(slug, rows);
      if (!labelBySlug.has(slug)) labelBySlug.set(slug, label);
    }
  }

  return Array.from(genreArtists.entries())
    .map(([slug, rows]) => {
      const label = labelBySlug.get(slug) || slug;
      const unique = uniqueArtists(rows);
      const genreEvents = uniqueArtists(rows)
        .flatMap((artist) => artistEvents.get(Number(artist.id)) || artistEvents.get(Number(artist.ade_id)) || [])
        .filter(Boolean);
      const seenEvents = new Set<number>();
      const eventsForGenre = genreEvents.filter((event) => {
        const id = Number(event.ade_id || event.id);
        if (!id || seenEvents.has(id)) return false;
        seenEvents.add(id);
        return true;
      });

      return {
        label,
        slug,
        aliases: [label],
        description: `${label} artists, countries, venues, top tracks, and festival appearances in the LineupBase electronic music directory.`,
        events: eventsForGenre.sort((a, b) => dateMs(a.start_date) - dateMs(b.start_date)),
        artists: unique,
        eventCount: eventsForGenre.length,
        artistCount: unique.length,
        lastModified: latestDate([...unique.map((artist) => artist.spotify_last_updated || artist.last_updated_at), ...eventsForGenre.map((event) => event.last_updated_at)]),
        source: 'spotify' as const,
      };
    })
    .filter((genre) => shouldIndexSpotifyGenre(genre.label, genre.artistCount))
    .sort((a, b) => b.artistCount - a.artistCount || a.label.localeCompare(b.label));
});

export const getExpandedGenreIndex = cache(async (): Promise<SeoGenre[]> => {
  const [curated, spotify] = await Promise.all([getCuratedGenreIndex(), getSpotifyGenreIndex()]);
  const bySlug = new Map<string, SeoGenre>();

  for (const genre of [...curated, ...spotify]) {
    const existing = bySlug.get(genre.slug);
    if (!existing) {
      bySlug.set(genre.slug, genre);
      continue;
    }

    const artists = uniqueArtists([...existing.artists, ...genre.artists]);
    const eventMap = new Map<number, SeoEvent>();
    for (const event of [...existing.events, ...genre.events]) {
      const id = Number(event.ade_id || event.id);
      if (id) eventMap.set(id, event);
    }
    const events = Array.from(eventMap.values()).sort((a, b) => dateMs(a.start_date) - dateMs(b.start_date));
    bySlug.set(genre.slug, {
      ...existing,
      aliases: Array.from(new Set([...existing.aliases, ...genre.aliases])),
      description: existing.description || genre.description,
      artists,
      events,
      artistCount: artists.length,
      eventCount: events.length,
      lastModified: latestDate([existing.lastModified.toISOString(), genre.lastModified.toISOString()]),
      source: existing.source === 'curated' ? existing.source : genre.source,
    });
  }

  return Array.from(bySlug.values()).sort((a, b) => b.artistCount - a.artistCount || b.eventCount - a.eventCount || a.label.localeCompare(b.label));
});

export async function findGenreBySlug(slug: string) {
  const genres = await getExpandedGenreIndex();
  return genres.find((genre) => genre.slug === slug) || null;
}

export function countryGenrePath(countryLabel: string, genreLabel: string) {
  return `/countries/${slugifyEntity(countryLabel)}/${slugifyEntity(genreLabel)}-artists`;
}

export const getCountryGenreIndex = cache(async (): Promise<SeoCountryGenre[]> => {
  const [countries, genres, events] = await Promise.all([getCountryIndex(), getExpandedGenreIndex(), getEligibleSeoEvents()]);
  const topGenres = genres.filter((genre) => genre.artistCount >= 8).slice(0, 160);

  return countries
    .flatMap((country) =>
      topGenres.map((genre) => {
        const artists = country.artists.filter((artist) => artistMatchesGenreLabel(artist, genre.label, genre.aliases));
        if (artists.length < 5) return null;
        const artistIds = new Set(artists.flatMap((artist) => [Number(artist.id), Number(artist.ade_id)]));
        const countryGenreEvents = events.filter((event) =>
          event.artists?.some((artist) => artistIds.has(Number(artist.id)) || artistIds.has(Number(artist.ade_id)))
        );
        return {
          country,
          genre,
          artists: artists.sort((a, b) => artistQualityScore(b) - artistQualityScore(a) || a.title.localeCompare(b.title)),
          events: countryGenreEvents.sort((a, b) => dateMs(a.start_date) - dateMs(b.start_date)),
          artistCount: artists.length,
          eventCount: countryGenreEvents.length,
          lastModified: latestDate([...artists.map((artist) => artist.spotify_last_updated || artist.last_updated_at), ...countryGenreEvents.map((event) => event.last_updated_at)]),
        } satisfies SeoCountryGenre;
      })
    )
    .filter(Boolean)
    .sort((a, b) => b.artistCount - a.artistCount || b.eventCount - a.eventCount)
    .slice(0, 500);
});

export async function findCountryGenreBySlug(countrySlug: string, genreSlug: string) {
  const normalizedGenreSlug = genreSlug.replace(/-artists$/, '');
  const rows = await getCountryGenreIndex();
  return rows.find((row) => row.country.slug === countrySlug && row.genre.slug === normalizedGenreSlug) || null;
}

function artistQualityScore(artist: SeoArtist) {
  return (
    (artist.spotify_id ? 35 : 0) +
    (artist.image_url ? 20 : 0) +
    (artist.followers ? Math.min(Math.log10(Number(artist.followers) + 1) * 5, 25) : 0) +
    (typeof artist.popularity === 'number' ? artist.popularity / 4 : 0) +
    (getArtistGenreLabels(artist).length ? 10 : 0)
  );
}

export const getRisingArtistRows = cache(async (): Promise<SeoArtistScoreRow[]> => {
  const [artists, events] = await Promise.all([getEligibleSeoArtists(), getEligibleSeoEvents()]);
  const eventCounts = new Map<number, SeoEvent[]>();

  for (const event of events) {
    for (const artist of event.artists || []) {
      for (const id of [Number(artist.id), Number(artist.ade_id)].filter(Boolean)) {
        const rows = eventCounts.get(id) || [];
        rows.push(event);
        eventCounts.set(id, rows);
      }
    }
  }

  return artists
    .filter((artist) => artist.spotify_id && Number(artist.followers || 0) > 0)
    .map((artist) => {
      const artistEvents = eventCounts.get(Number(artist.id)) || eventCounts.get(Number(artist.ade_id)) || [];
      const followers = Number(artist.followers || 0);
      const popularity = Number(artist.popularity || 0);
      const genres = getArtistGenreLabels(artist);
      const score =
        Math.min(artistEvents.length * 18, 90) +
        Math.max(0, 70 - Math.log10(followers + 1) * 10) +
        Math.min(popularity, 55) +
        (artist.image_url ? 10 : 0) +
        (genres.length ? 10 : 0);
      const reasons = [
        artistEvents.length ? `${artistEvents.length} event${artistEvents.length === 1 ? '' : 's'}` : null,
        followers ? `${followers.toLocaleString()} followers` : null,
        popularity ? `${popularity}/100 popularity` : null,
        genres[0] || null,
      ].filter(Boolean) as string[];
      return { artist, events: artistEvents, genres, score, reasons };
    })
    .filter((row) => row.events.length > 0 && Number(row.artist.followers || 0) <= 75000)
    .sort((a, b) => b.score - a.score || a.artist.title.localeCompare(b.artist.title));
});

export async function getSimilarArtistRows(seed: SeoArtist): Promise<SeoArtistScoreRow[]> {
  const [artists, events, seedEvents] = await Promise.all([getEligibleSeoArtists(), getEligibleSeoEvents(), getArtistEvents(seed)]);
  const seedGenres = getArtistGenreLabels(seed).map(normalizedGenreValue);
  const seedEventIds = new Set(seedEvents.map((event) => Number(event.ade_id || event.id)));
  const seedCountry = seed.country_label;
  const seedPopularity = Number(seed.popularity || 0);
  const seedEnergy = Number(seed.energy_mean || 0);

  const eventRowsByArtist = new Map<number, SeoEvent[]>();
  for (const event of events) {
    for (const artist of event.artists || []) {
      for (const id of [Number(artist.id), Number(artist.ade_id)].filter(Boolean)) {
        const rows = eventRowsByArtist.get(id) || [];
        rows.push(event);
        eventRowsByArtist.set(id, rows);
      }
    }
  }

  return artists
    .filter((artist) => Number(artist.ade_id || artist.id) !== Number(seed.ade_id || seed.id))
    .map((artist) => {
      const genres = getArtistGenreLabels(artist);
      const normalizedGenres = genres.map(normalizedGenreValue);
      const sharedGenres = normalizedGenres.filter((genre) =>
        seedGenres.some((seedGenre) => genre === seedGenre || genre.includes(seedGenre) || seedGenre.includes(genre))
      );
      const artistEvents = eventRowsByArtist.get(Number(artist.id)) || eventRowsByArtist.get(Number(artist.ade_id)) || [];
      const sharedEvents = artistEvents.filter((event) => seedEventIds.has(Number(event.ade_id || event.id)));
      const popularityDelta = seedPopularity && artist.popularity ? Math.abs(seedPopularity - Number(artist.popularity)) : 40;
      const energyDelta = seedEnergy && artist.energy_mean ? Math.abs(seedEnergy - Number(artist.energy_mean)) : 0.4;
      const score =
        sharedGenres.length * 36 +
        sharedEvents.length * 25 +
        (seedCountry && artist.country_label === seedCountry ? 12 : 0) +
        (artist.spotify_id ? 10 : 0) +
        Math.max(0, 18 - popularityDelta / 3) +
        Math.max(0, 16 - energyDelta * 30);
      const reasons = [
        sharedGenres.length ? `${sharedGenres.length} shared genre${sharedGenres.length === 1 ? '' : 's'}` : null,
        sharedEvents.length ? `${sharedEvents.length} shared event${sharedEvents.length === 1 ? '' : 's'}` : null,
        seedCountry && artist.country_label === seedCountry ? seedCountry : null,
        artist.top_track_name ? `Top track: ${artist.top_track_name}` : null,
      ].filter(Boolean) as string[];
      return { artist, events: artistEvents, genres, score, reasons };
    })
    .filter((row) => row.score >= 45)
    .sort((a, b) => b.score - a.score || a.artist.title.localeCompare(b.artist.title))
    .slice(0, 80);
}

function uniqueArtists(artists: SeoArtist[]) {
  const seen = new Set<number>();
  const rows: SeoArtist[] = [];

  for (const artist of artists) {
    const id = Number(artist.ade_id || artist.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    rows.push(artist);
  }

  return rows.sort((a, b) => a.title.localeCompare(b.title));
}

export function compactText(value: string | null | undefined, fallback = '') {
  return String(value || fallback).replace(/\s+/g, ' ').trim();
}

export function formatEventDate(value: string | null | undefined, options?: Intl.DateTimeFormatOptions) {
  if (!value) return 'Date TBA';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date TBA';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Amsterdam',
    ...options,
  }).format(date);
}

export function buildJsonLd(kind: string, payload: Record<string, unknown>) {
  if (kind === 'breadcrumb') {
    const items = (payload.items as Array<{ name: string; url: string }>) || [];
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    };
  }

  if (kind === 'itemList') {
    const items = (payload.items as Array<{ name: string; url: string }>) || [];
    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: payload.name,
      numberOfItems: items.length,
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: item.url,
        name: item.name,
      })),
    };
  }

  return {
    '@context': 'https://schema.org',
    ...payload,
  };
}

export function breadcrumbItems(items: Array<{ name: string; path: string }>) {
  return items.map((item) => ({ name: item.name, url: absoluteUrl(item.path) }));
}
