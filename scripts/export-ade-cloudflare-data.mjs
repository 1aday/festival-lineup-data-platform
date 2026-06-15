#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';

const OUT_DIR = process.env.ADE_EXPORT_DIR || '.ade-cloudflare-data';
const DATA_DIR = path.join(OUT_DIR, 'data');
const FROM_DATE = process.env.ADE_FROM_DATE || '2025-10-22';
const TO_DATE = process.env.ADE_TO_DATE || '2025-10-26';
const TYPES = process.env.ADE_TYPES || '8262,8263';
const YEAR = process.env.ADE_YEAR || '2025';
const CONCURRENCY = Number(process.env.ADE_LINEUP_CONCURRENCY || 6);
const PAGE_DELAY_MS = Number(process.env.ADE_PAGE_DELAY_MS || 150);

const headers = {
  accept: 'application/json, text/plain, */*',
  'accept-language': 'en-US,en;q=0.9',
  referer: 'https://www.amsterdam-dance-event.nl/en/program/filter/',
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'artist';
}

function imageExtension(url) {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.(jpe?g|png|webp|gif|avif)(?:$|\?)/i);
    return match ? match[1].toLowerCase().replace('jpeg', 'jpg') : 'jpg';
  } catch {
    return 'jpg';
  }
}

function parseAdeDate(value) {
  if (!value) return null;
  return new Date(String(value).replace(' ', 'T')).toISOString();
}

function normalizeGenre(value) {
  return String(value || '')
    .replace(/&/g, ' and ')
    .replace(/[-_/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function addGenresFromText(value, target) {
  if (!value) return;
  String(value)
    .split(/[|,/]/)
    .map(normalizeGenre)
    .filter((genre) => genre.length > 2)
    .forEach((genre) => target.add(genre));
}

async function fetchWithRetry(url, options = {}, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, { ...options, headers: { ...headers, ...(options.headers || {}) } });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${url}`);
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await sleep(500 * attempt);
      }
    }
  }
  throw lastError;
}

async function fetchAdePage(section, page) {
  const url = new URL('https://www.amsterdam-dance-event.nl/api/program/filter/');
  url.searchParams.set('section', section);
  url.searchParams.set('type', TYPES);
  url.searchParams.set('from', FROM_DATE);
  url.searchParams.set('to', TO_DATE);
  url.searchParams.set('page', String(page));

  const response = await fetchWithRetry(url.toString());
  return response.json();
}

async function fetchAllAdeSection(section) {
  const rows = [];
  for (let page = 0; ; page++) {
    const payload = await fetchAdePage(section, page);
    const batch = Array.isArray(payload.data) ? payload.data : [];
    console.log(`[${section}] page ${page}: ${batch.length}`);
    if (batch.length === 0) break;
    rows.push(...batch);
    await sleep(PAGE_DELAY_MS);
  }
  return rows;
}

function transformArtist(raw) {
  const sourceImageUrl = raw.image?.url || null;
  const imageKey = sourceImageUrl
    ? `images/artists/${raw.id}-${slugify(raw.title)}.${imageExtension(sourceImageUrl)}`
    : null;

  return {
    id: raw.id,
    ade_id: raw.id,
    handle: raw.handle || null,
    title: raw.title || 'Unknown Artist',
    subtitle: raw.subtitle || null,
    url: raw.url || null,
    country_label: raw.country?.label || null,
    country_value: raw.country?.value || null,
    image_title: raw.image?.title || null,
    image_url: sourceImageUrl,
    source_image_url: sourceImageUrl,
    image_key: imageKey,
    first_seen_at: new Date().toISOString(),
    last_updated_at: new Date().toISOString(),
    is_active: true,
    raw_data: raw,
    popularity: null,
    spotify_id: null,
    spotify_url: null,
    spotify_name: null,
    spotify_image_url: null,
    primary_genres: raw.subtitle || null,
    secondary_genres: null,
    all_genres: raw.subtitle || null,
  };
}

function transformEvent(raw) {
  return {
    id: raw.id,
    ade_id: raw.id,
    title: raw.title || 'Unknown Event',
    subtitle: raw.subtitle || null,
    url: raw.url || null,
    start_date: parseAdeDate(raw.start_date_time?.date),
    end_date: parseAdeDate(raw.end_date_time?.date),
    venue_name: raw.venue?.title || null,
    venue_address: null,
    event_type: raw.handle || null,
    categories: raw.categories || null,
    sold_out: Boolean(raw.soldOut),
    first_seen_at: new Date().toISOString(),
    last_updated_at: new Date().toISOString(),
    is_active: true,
    raw_data: raw,
  };
}

function parseLineup(html) {
  const $ = cheerio.load(html);
  const lineups = [];
  const seen = new Set();

  $('a[href*="/artists-speakers/"]').each((_, element) => {
    const href = $(element).attr('href');
    if (!href) return;
    const match = href.match(/\/artists-speakers\/[^/]+\/(\d+)\/?$/);
    if (!match) return;
    const adeId = Number(match[1]);
    if (!adeId || seen.has(adeId)) return;

    seen.add(adeId);
    const text = $(element).text().replace(/\s+/g, ' ').trim();
    lineups.push({
      ade_id: adeId,
      title: text.replace(/\s+\([A-Z]{2,3}\)$/i, '').trim() || null,
      profile_url: href.startsWith('http') ? href : `https://www.amsterdam-dance-event.nl${href}`,
    });
  });

  return lineups;
}

async function parseEventLineup(event) {
  if (!event.url) return [];
  try {
    const response = await fetchWithRetry(event.url, { headers: { accept: 'text/html' } }, 3);
    const html = await response.text();
    return parseLineup(html);
  } catch (error) {
    console.warn(`[lineup] failed ${event.ade_id}: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

async function mapConcurrent(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker(workerIndex) {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await mapper(items[index], index, workerIndex);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, (_, index) => worker(index)));
  return results;
}

function buildHomepageData(artists, events) {
  const venueMap = new Map();
  const countrySet = new Set();
  const genreSet = new Set();
  const dateSet = new Set();

  for (const artist of artists) {
    if (artist.country_label) countrySet.add(artist.country_label);
    addGenresFromText(artist.primary_genres || artist.subtitle, genreSet);
  }

  for (const event of events) {
    if (event.venue_name) {
      venueMap.set(event.venue_name, (venueMap.get(event.venue_name) || 0) + 1);
    }
    addGenresFromText(event.categories, genreSet);
    if (event.start_date) {
      dateSet.add(new Date(event.start_date).toLocaleDateString('en-CA'));
    }
  }

  return {
    counts: {
      artists: artists.length,
      events: events.length,
      venues: venueMap.size,
      countries: countrySet.size,
      genres: genreSet.size,
    },
    dates: Array.from(dateSet).sort(),
    topVenues: Array.from(venueMap.entries())
      .map(([venue, count]) => ({ venue, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    genres: Array.from(genreSet).sort(),
    source: 'cloudflare_ade_export',
  };
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });

  const [rawArtists, rawEvents] = await Promise.all([
    fetchAllAdeSection('persons'),
    fetchAllAdeSection('events'),
  ]);

  const artists = rawArtists
    .map(transformArtist)
    .sort((a, b) => a.title.localeCompare(b.title));
  const events = rawEvents
    .map(transformEvent)
    .filter((event) => event.start_date)
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  const artistsByAdeId = new Map(artists.map((artist) => [artist.ade_id, artist]));
  const imageSources = {};
  for (const artist of artists) {
    if (artist.image_key && artist.source_image_url) {
      imageSources[artist.image_key] = {
        source: artist.source_image_url,
        title: artist.title,
        ade_id: artist.ade_id,
      };
    }
  }

  let parsed = 0;
  const lineupResults = await mapConcurrent(events, CONCURRENCY, async (event, index) => {
    const lineup = await parseEventLineup(event);
    parsed++;
    if (parsed % 25 === 0 || parsed === events.length) {
      console.log(`[lineups] ${parsed}/${events.length}`);
    }
    await sleep(75);
    return { event, lineup };
  });

  const artistEvents = [];
  const seenLinks = new Set();
  for (const { event, lineup } of lineupResults) {
    for (const entry of lineup) {
      if (!artistsByAdeId.has(entry.ade_id)) continue;
      const key = `${entry.ade_id}:${event.ade_id}`;
      if (seenLinks.has(key)) continue;
      seenLinks.add(key);
      artistEvents.push({
        id: artistEvents.length + 1,
        artist_id: entry.ade_id,
        artist_ade_id: entry.ade_id,
        event_id: event.ade_id,
        event_ade_id: event.ade_id,
        role: null,
        created_at: new Date().toISOString(),
        match_type: 'ade_event_page',
      });
    }
  }

  const artistEventsByEvent = new Map();
  for (const link of artistEvents) {
    if (!artistEventsByEvent.has(link.event_id)) artistEventsByEvent.set(link.event_id, []);
    artistEventsByEvent.get(link.event_id).push(link);
  }

  const eventsWithArtists = events.map((event) => ({
    ...event,
    artists: (artistEventsByEvent.get(event.id) || [])
      .map((link) => artistsByAdeId.get(link.artist_id))
      .filter(Boolean),
  }));

  const homepageData = buildHomepageData(artists, events);
  const manifest = {
    generated_at: new Date().toISOString(),
    year: YEAR,
    source: 'https://www.amsterdam-dance-event.nl/api/program/filter/',
    from: FROM_DATE,
    to: TO_DATE,
    types: TYPES,
    counts: {
      artists: artists.length,
      events: events.length,
      artist_events: artistEvents.length,
      image_sources: Object.keys(imageSources).length,
    },
  };

  const files = {
    'artists.json': artists,
    'events.json': events,
    'events-with-artists.json': eventsWithArtists,
    'artist-events.json': artistEvents,
    'homepage-data.json': homepageData,
    'image-sources.json': imageSources,
    'manifest.json': manifest,
  };

  await Promise.all(
    Object.entries(files).map(([filename, data]) =>
      writeFile(path.join(DATA_DIR, filename), `${JSON.stringify(data)}\n`)
    )
  );

  console.log('Export complete:', manifest);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
