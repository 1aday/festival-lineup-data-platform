#!/usr/bin/env node

import * as cheerio from 'cheerio';
import { readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DATA_DIR = process.env.ADE_EXPORT_DIR
  ? path.join(process.env.ADE_EXPORT_DIR, 'data')
  : '.ade-cloudflare-data/data';
const ARTISTS_FILE = path.join(DATA_DIR, 'artists.json');
const EVENTS_FILE = path.join(DATA_DIR, 'events-with-artists.json');
const MANIFEST_FILE = path.join(DATA_DIR, 'manifest.json');
const ENRICHMENT_VERSION = 'source-page-socials-2026-06-15';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith('--')) continue;
  const [rawKey, rawValue] = arg.slice(2).split('=');
  args.set(rawKey, rawValue ?? process.argv[index + 1] ?? 'true');
  if (rawValue === undefined && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')) {
    index += 1;
  }
}

const limit = Number(args.get('limit') || 0);
const offset = Number(args.get('offset') || 0);
const force = args.has('force');
const dryRun = args.has('dry-run');
const concurrency = Math.max(1, Number(args.get('concurrency') || 8));
const delayMs = Number(args.get('delay-ms') || 120);
const timeoutMs = Number(args.get('timeout-ms') || 18_000);
const saveEvery = Math.max(Number(args.get('save-every') || 50), 1);

const SOCIAL_FIELDS = {
  instagram: 'instagram_url',
  facebook: 'facebook_url',
  x: 'x_url',
  youtube: 'youtube_url',
  soundcloud: 'soundcloud_url',
  bandcamp: 'bandcamp_url',
  tiktok: 'tiktok_url',
  spotify: 'spotify_url',
  ra: 'ra_url',
  beatport: 'beatport_url',
  discogs: 'discogs_url',
  mixcloud: 'mixcloud_url',
  apple_music: 'apple_music_url',
  deezer: 'deezer_url',
  linktree: 'linktree_url',
  website: 'website_url',
};

const BLOCKED_HOST_PATTERNS = [
  /(^|\.)amsterdam-dance-event\.nl$/i,
  /(^|\.)googletagmanager\.com$/i,
  /(^|\.)google-analytics\.com$/i,
  /(^|\.)cdn\.plyr\.io$/i,
  /(^|\.)w3\.org$/i,
  /(^|\.)bravoure\.nl$/i,
  /(^|\.)bumastemra\.nl$/i,
  /(^|\.)demerkplaats\.nl$/i,
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function cleanUrl(value, baseUrl) {
  if (!value) return null;
  const trimmed = String(value).replace(/&amp;/g, '&').trim();
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) return null;
  try {
    const url = new URL(trimmed, baseUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|mc_|ref$)/i.test(key)) url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return null;
  }
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

function classifyUrl(url, label = '') {
  const host = hostOf(url);
  const lowerUrl = url.toLowerCase();
  const lowerLabel = label.toLowerCase();

  if (!host || BLOCKED_HOST_PATTERNS.some((pattern) => pattern.test(host))) return null;
  if (/instagram\.com$/.test(host)) return 'instagram';
  if (/(^|\.)facebook\.com$/.test(host) || /(^|\.)fb\.com$/.test(host)) return 'facebook';
  if (/x\.com$/.test(host) || /twitter\.com$/.test(host)) return 'x';
  if (/youtube\.com$/.test(host) || /youtu\.be$/.test(host)) return 'youtube';
  if (/soundcloud\.com$/.test(host)) return 'soundcloud';
  if (/bandcamp\.com$/.test(host)) return 'bandcamp';
  if (/tiktok\.com$/.test(host)) return 'tiktok';
  if (/open\.spotify\.com$/.test(host) && lowerUrl.includes('/artist/')) return 'spotify';
  if (/ra\.co$/.test(host) || /residentadvisor\.net$/.test(host)) return 'ra';
  if (/beatport\.com$/.test(host)) return 'beatport';
  if (/discogs\.com$/.test(host)) return 'discogs';
  if (/mixcloud\.com$/.test(host)) return 'mixcloud';
  if (/music\.apple\.com$/.test(host)) return 'apple_music';
  if (/deezer\.com$/.test(host)) return 'deezer';
  if (/linktr\.ee$/.test(host) || /lnk\.bio$/.test(host) || /bio\.site$/.test(host)) return 'linktree';
  if (lowerLabel === 'ws' || lowerLabel.includes('website') || lowerLabel.includes('official')) return 'website';
  return null;
}

function collectSocialLinks(html, sourceUrl) {
  const $ = cheerio.load(html);
  const links = {};
  const rawLinks = [];

  function addCandidate(href, label, source) {
    const url = cleanUrl(href, sourceUrl);
    if (!url) return;
    const type = classifyUrl(url, label);
    if (!type) return;
    if (!links[type]) links[type] = url;
    rawLinks.push({ type, url, label: String(label || '').trim() || null, source });
  }

  $('.social-buttons a[href]').each((_, element) => {
    addCandidate($(element).attr('href'), $(element).text(), 'social-buttons');
  });

  $('script[type="application/ld+json"]').each((_, element) => {
    const text = $(element).contents().text();
    if (!text.trim()) return;
    try {
      const payload = JSON.parse(text);
      const rows = Array.isArray(payload) ? payload : [payload];
      for (const row of rows) {
        const sameAs = Array.isArray(row?.sameAs) ? row.sameAs : [];
        for (const href of sameAs) addCandidate(href, 'sameAs', 'json-ld');
      }
    } catch {
      // Ignore malformed embedded JSON.
    }
  });

  return {
    links,
    rawLinks: rawLinks.filter(
      (link, index, rows) => rows.findIndex((row) => row.type === link.type && row.url === link.url) === index
    ),
  };
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'en-US,en;q=0.9',
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

async function atomicWriteJson(file, data) {
  const tmp = `${file}.tmp`;
  await writeFile(tmp, `${JSON.stringify(data)}\n`);
  await rename(tmp, file);
}

function mergeSocialFields(artist, links, rawLinks, status = 'found') {
  const next = {
    ...artist,
    social_links: {
      ...(artist.social_links || {}),
      ...links,
    },
    social_link_rows: rawLinks,
    social_link_count: Object.keys(links).length,
    socials_match_status: status,
    socials_last_checked_at: new Date().toISOString(),
    socials_enrichment_version: ENRICHMENT_VERSION,
  };

  for (const [type, field] of Object.entries(SOCIAL_FIELDS)) {
    if (links[type]) next[field] = links[type];
  }

  return next;
}

async function saveData(artists, eventsWithArtists, manifest, stats) {
  if (dryRun) return;
  const artistsByAdeId = new Map(artists.map((artist) => [Number(artist.ade_id || artist.id), artist]));
  const updatedEvents = eventsWithArtists.map((event) => ({
    ...event,
    artists: Array.isArray(event.artists)
      ? event.artists.map((artist) => artistsByAdeId.get(Number(artist.ade_id || artist.id)) || artist)
      : [],
  }));

  await atomicWriteJson(ARTISTS_FILE, artists);
  await atomicWriteJson(EVENTS_FILE, updatedEvents);
  await atomicWriteJson(MANIFEST_FILE, {
    ...manifest,
    social_enrichment: {
      version: ENRICHMENT_VERSION,
      updated_at: new Date().toISOString(),
      with_any_social: artists.filter((artist) => Number(artist.social_link_count || 0) > 0).length,
      with_instagram: artists.filter((artist) => artist.instagram_url).length,
      with_facebook: artists.filter((artist) => artist.facebook_url).length,
      with_ra: artists.filter((artist) => artist.ra_url).length,
      with_website: artists.filter((artist) => artist.website_url).length,
      with_soundcloud: artists.filter((artist) => artist.soundcloud_url).length,
      with_youtube: artists.filter((artist) => artist.youtube_url).length,
      last_run: stats,
    },
  });
}

async function mapConcurrent(items, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

async function main() {
  const [artists, eventsWithArtists, manifest] = await Promise.all([
    readJson(ARTISTS_FILE),
    readJson(EVENTS_FILE),
    readJson(MANIFEST_FILE).catch(() => ({})),
  ]);

  let queue = artists
    .map((artist, index) => ({ artist, index }))
    .filter(({ artist }) => artist.url && (force || !artist.socials_last_checked_at));

  if (offset) queue = queue.slice(offset);
  if (limit) queue = queue.slice(0, limit);

  const stats = {
    dryRun,
    force,
    totalQueued: queue.length,
    processed: 0,
    found: 0,
    noLinks: 0,
    errors: 0,
  };

  console.log(`[socials] queued=${queue.length} totalArtists=${artists.length} concurrency=${concurrency} dryRun=${dryRun}`);

  await mapConcurrent(queue, async ({ artist, index }) => {
    await sleep(delayMs);
    try {
      const html = await fetchHtml(artist.url);
      const { links, rawLinks } = collectSocialLinks(html, artist.url);
      const count = Object.keys(links).length;
      artists[index] = mergeSocialFields(artist, links, rawLinks, count ? 'found' : 'none');
      stats.processed += 1;
      if (count) stats.found += 1;
      else stats.noLinks += 1;
      console.log(`[${stats.processed}/${queue.length}] ${count ? `found=${count}` : 'none'} ${artist.title}`);
    } catch (error) {
      stats.processed += 1;
      stats.errors += 1;
      artists[index] = {
        ...artist,
        social_link_count: artist.social_link_count || 0,
        socials_match_status: 'error',
        socials_last_checked_at: new Date().toISOString(),
        socials_enrichment_version: ENRICHMENT_VERSION,
        socials_error: error instanceof Error ? error.message : String(error),
      };
      console.warn(`[${stats.processed}/${queue.length}] error ${artist.title}: ${artists[index].socials_error}`);
    }

    if (stats.processed % saveEvery === 0) {
      await saveData(artists, eventsWithArtists, manifest, stats);
      console.log(`[socials] checkpoint processed=${stats.processed} found=${stats.found} errors=${stats.errors}`);
    }
  });

  await saveData(artists, eventsWithArtists, manifest, stats);
  console.log('[socials] complete', stats);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
