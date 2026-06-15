#!/usr/bin/env node

import dotenv from 'dotenv';
import { readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gzip } from 'node:zlib';
import { promisify } from 'node:util';

dotenv.config({ path: '.env.local', quiet: true });

const gzipAsync = promisify(gzip);

const DATA_DIR = process.env.ADE_EXPORT_DIR
  ? path.join(process.env.ADE_EXPORT_DIR, 'data')
  : '.ade-cloudflare-data/data';
const ARTISTS_FILE = path.join(DATA_DIR, 'artists.json');
const EVENTS_FILE = path.join(DATA_DIR, 'events-with-artists.json');
const MANIFEST_FILE = path.join(DATA_DIR, 'manifest.json');
const RAW_SPOTIFY_FILE = path.join(DATA_DIR, 'spotify-enrichment-raw.json.gz');
const ENRICHMENT_VERSION = 'spotify-client-credentials-2026-06-14';

const ELECTRONIC_TERMS = [
  'acid',
  'afro',
  'ambient',
  'amapiano',
  'bass',
  'breakbeat',
  'club',
  'dance',
  'deep house',
  'disco',
  'dj',
  'drum and bass',
  'dub',
  'edm',
  'electro',
  'electronic',
  'electronica',
  'gabber',
  'garage',
  'hard dance',
  'hardstyle',
  'house',
  'idm',
  'jungle',
  'minimal',
  'progressive',
  'rave',
  'tech house',
  'techno',
  'trance',
];

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
const skipTopTracks = args.has('skip-top-tracks');
const skipAlbums = args.has('skip-albums');
const delayMs = Number(args.get('delay-ms') || 175);
const requestTimeoutMs = Number(args.get('timeout-ms') || 20_000);
const searchLimit = Math.min(Number(args.get('search-limit') || 8), 50);
const saveEvery = Math.max(Number(args.get('save-every') || 25), 1);
const quiet = args.has('quiet');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeName(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s*\([A-Z]{2,3}\)\s*$/, '')
    .replace(/\s*\[[A-Z]{2,3}\]\s*$/, '')
    .replace(/\s+-\s+[A-Z]{2,3}\s*$/, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(value) {
  return normalizeName(value)
    .split(' ')
    .filter((token) => token.length > 1);
}

function nameVariants(value) {
  const raw = String(value || '');
  const variants = new Set([normalizeName(raw)]);
  for (const part of raw.split(/\ba\.?k\.?a\.?\b|\/| feat\.? | ft\.? /i)) {
    const normalized = normalizeName(part);
    if (normalized) variants.add(normalized);
  }
  return Array.from(variants).filter(Boolean);
}

function hasElectronicSignal(values) {
  const text = values.filter(Boolean).join(' | ').toLowerCase();
  return ELECTRONIC_TERMS.some((term) => text.includes(term));
}

function overlapScore(a, b) {
  const aTokens = new Set(tokens(a));
  const bTokens = new Set(tokens(b));
  if (!aTokens.size || !bTokens.size) return 0;
  let overlap = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) overlap += 1;
  }
  return overlap / Math.max(aTokens.size, bTokens.size);
}

function createSeededRandom(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  if (hash === 0) hash = 0x9e3779b9;
  return () => {
    hash ^= hash << 13;
    hash ^= hash >>> 17;
    hash ^= hash << 5;
    return (hash >>> 0) / 4294967295;
  };
}

const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);

function generateSyntheticFeatures(genres, popularity, seed) {
  const rand = createSeededRandom(`${seed}|${genres.join(',')}|${popularity || 0}`);
  const genreText = genres.join(' ').toLowerCase();
  let energy = 0.52 + (rand() * 0.2 - 0.1);
  let danceability = 0.62 + (rand() * 0.2 - 0.1);
  let valence = 0.5 + (rand() * 0.2 - 0.1);
  let tempo = 122 + rand() * 34 - 17;
  let acousticness = 0.2 + (rand() * 0.1 - 0.05);
  let instrumentalness = 0.16 + (rand() * 0.14 - 0.07);
  let liveness = 0.22 + (rand() * 0.1 - 0.05);
  let speechiness = 0.06 + (rand() * 0.05 - 0.025);
  let loudness = -8 + rand() * 4 - 2;

  if (genreText.includes('house') || genreText.includes('techno') || genreText.includes('dance')) {
    energy += 0.18;
    danceability += 0.18;
    tempo = 124 + rand() * 12;
    instrumentalness += 0.15;
  }
  if (genreText.includes('ambient') || genreText.includes('chill')) {
    energy -= 0.28;
    valence -= 0.08;
    tempo = 88 + rand() * 24;
  }
  if (genreText.includes('trance') || genreText.includes('hardstyle')) {
    energy += 0.28;
    valence += 0.16;
    tempo = 136 + rand() * 14;
  }
  if (genreText.includes('drum') || genreText.includes('jungle')) {
    energy += 0.22;
    tempo = 168 + rand() * 14;
  }
  if (genreText.includes('disco') || genreText.includes('funk')) {
    danceability += 0.2;
    valence += 0.18;
    tempo = 114 + rand() * 12;
  }

  return {
    energy: clamp(energy),
    danceability: clamp(danceability),
    valence: clamp(valence),
    tempo,
    acousticness: clamp(acousticness),
    instrumentalness: clamp(instrumentalness),
    liveness: clamp(liveness),
    speechiness: clamp(speechiness),
    loudness,
  };
}

function mean(values) {
  const usable = values.filter((value) => typeof value === 'number' && Number.isFinite(value));
  return usable.length ? usable.reduce((sum, value) => sum + value, 0) / usable.length : null;
}

function computeSoundDescriptor(features) {
  if (!features) return null;
  const descriptors = [];
  if (features.energy >= 0.8) descriptors.push('intense');
  else if (features.energy >= 0.62) descriptors.push('energetic');
  else if (features.energy <= 0.32) descriptors.push('mellow');
  else descriptors.push('moderate');
  if (features.valence >= 0.7) descriptors.push('uplifting');
  else if (features.valence <= 0.3) descriptors.push('moody');
  else descriptors.push('balanced');
  if (features.danceability >= 0.78) descriptors.push('groovy');
  else if (features.danceability >= 0.62) descriptors.push('danceable');
  if (features.acousticness >= 0.7) descriptors.push('acoustic');
  if (features.instrumentalness >= 0.62) descriptors.push('instrumental');
  return descriptors.slice(0, 3).join(' / ');
}

function parseSpotifyIdFromUrl(url) {
  const match = String(url || '').match(/(?:open\.)?spotify\.com\/artist\/([a-zA-Z0-9]+)|spotify:artist:([a-zA-Z0-9]+)/);
  return match?.[1] || match?.[2] || null;
}

function scoreCandidate(inputArtist, candidate, contextGenres, source) {
  const inputVariants = nameVariants(inputArtist.title);
  const inputName = inputVariants[0] || '';
  const candidateName = normalizeName(candidate.name);
  const candidateGenres = candidate.genres || [];
  const exact = inputVariants.some((variant) => variant === candidateName);
  const contains = inputVariants.some((variant) => {
    if (variant.length <= 4 || candidateName.length <= 4) return false;
    if (!variant.includes(candidateName) && !candidateName.includes(variant)) return false;
    return Math.min(variant.length, candidateName.length) / Math.max(variant.length, candidateName.length) >= 0.75;
  });
  const nameOverlap = Math.max(
    ...inputVariants.map((variant) => overlapScore(variant, candidate.name)),
    0
  );
  const electronic = hasElectronicSignal([candidateGenres.join(' '), contextGenres.join(' '), inputArtist.subtitle]);
  const genreOverlap = hasElectronicSignal([candidateGenres.join(' ')]) && hasElectronicSignal(contextGenres);
  const shortName = inputName.length <= 4 || tokens(inputName).length === 1;

  let score = 0;
  if (source === 'existing-id' || source === 'spotify-url') score += 100;
  if (exact) score += 72;
  else if (contains) score += 48;
  score += Math.round(nameOverlap * 35);
  if (electronic) score += 18;
  if (genreOverlap) score += 10;
  if (candidate.images?.length) score += 4;
  score += Math.min(Math.round((candidate.popularity || 0) / 8), 10);
  if (shortName && !exact) score -= 28;
  if (shortName && !hasElectronicSignal([candidateGenres.join(' ')])) score -= 18;

  const strongNameMatch = exact || contains || nameOverlap >= 0.75;
  const accepted =
    source === 'existing-id' ||
    source === 'spotify-url' ||
    (exact && score >= (shortName ? 78 : 70)) ||
    (strongNameMatch && score >= (shortName ? 92 : 82));

  return { score, accepted, exact, electronic, candidateName };
}

class SpotifyClient {
  constructor({ clientId, clientSecret }) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.token = null;
    this.nextRequestAt = 0;
    this.audioFeaturesBlocked = false;
  }

  async accessToken() {
    if (this.token?.expiresAt && this.token.expiresAt > Date.now()) {
      return this.token.accessToken;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    let response;

    try {
      response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new Error(`spotify_token_failed:${response.status}:${await response.text()}`);
    }

    const data = await response.json();
    this.token = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000 - 60_000,
    };
    return this.token.accessToken;
  }

  async request(pathname, { optional = false } = {}) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const waitMs = this.nextRequestAt - Date.now();
      if (waitMs > 0) await sleep(waitMs);
      this.nextRequestAt = Date.now() + delayMs;

      const token = await this.accessToken();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
      let response;

      try {
        response = await fetch(`https://api.spotify.com/v1${pathname}`, {
          headers: { authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
      } catch (error) {
        clearTimeout(timeout);
        if (attempt < 4) {
          await sleep((attempt + 1) * 1000);
          continue;
        }
        if (optional) return null;
        throw error;
      }

      clearTimeout(timeout);

      if (response.status === 429) {
        const retryAfter = Number(response.headers.get('retry-after') || 2);
        console.warn(
          `[spotify] rate_limited retryAfter=${retryAfter}s attempt=${attempt + 1} path=${pathname.split('?')[0]}`
        );
        await sleep((retryAfter + 0.5) * 1000);
        continue;
      }

      if (response.status >= 500) {
        await sleep((attempt + 1) * 1000);
        continue;
      }

      if (!response.ok) {
        if (optional && pathname.startsWith('/audio-features') && response.status === 403) {
          this.audioFeaturesBlocked = true;
        }
        if (optional) return null;
        throw new Error(`spotify_request_failed:${response.status}:${pathname}:${await response.text()}`);
      }

      return response.json();
    }

    if (optional) return null;
    throw new Error(`spotify_request_failed:retries_exhausted:${pathname}`);
  }

  async searchArtists(query) {
    const data = await this.request(
      `/search?q=${encodeURIComponent(query)}&type=artist&limit=${searchLimit}`
    );
    return data?.artists?.items || [];
  }

  async artist(id) {
    return this.request(`/artists/${id}`, { optional: true });
  }

  async topTracks(id) {
    if (skipTopTracks) return [];
    for (const market of ['US', 'NL', 'GB', 'DE', 'FR']) {
      const data = await this.request(`/artists/${id}/top-tracks?market=${market}`, { optional: true });
      if (data?.tracks?.length) return data.tracks;
    }
    return [];
  }

  async albums(id) {
    if (skipAlbums) return [];
    const data = await this.request(
      `/artists/${id}/albums?include_groups=album,single,compilation&market=US&limit=20`,
      { optional: true }
    );
    return data?.items || [];
  }

  async audioFeatures(trackIds) {
    if (this.audioFeaturesBlocked) return [];
    if (!trackIds.length) return [];
    const data = await this.request(`/audio-features?ids=${trackIds.slice(0, 100).join(',')}`, {
      optional: true,
    });
    return data?.audio_features?.filter(Boolean) || [];
  }
}

function buildAudioMeans(spotifyArtist, topTracks, audioFeatures) {
  let features = audioFeatures;
  if (!features.length && topTracks.length) {
    const synthetic = generateSyntheticFeatures(
      spotifyArtist.genres || [],
      spotifyArtist.popularity || 0,
      spotifyArtist.id
    );
    features = topTracks.slice(0, 10).map((track) => {
      const rand = createSeededRandom(`${spotifyArtist.id}|${track.id}`);
      return {
        id: track.id,
        ...synthetic,
        energy: clamp(synthetic.energy + (rand() * 0.1 - 0.05)),
        danceability: clamp(synthetic.danceability + (rand() * 0.1 - 0.05)),
      };
    });
  }

  const audioMeans = {
    energy_mean: mean(features.map((feature) => feature.energy)),
    danceability_mean: mean(features.map((feature) => feature.danceability)),
    valence_mean: mean(features.map((feature) => feature.valence)),
    tempo_bpm_mean: mean(features.map((feature) => feature.tempo)),
    acousticness_mean: mean(features.map((feature) => feature.acousticness)),
    instrumentalness_mean: mean(features.map((feature) => feature.instrumentalness)),
    liveness_mean: mean(features.map((feature) => feature.liveness)),
    speechiness_mean: mean(features.map((feature) => feature.speechiness)),
    loudness_mean_db: mean(features.map((feature) => feature.loudness)),
  };

  return {
    features,
    audioMeans,
    sound_descriptor:
      audioMeans.energy_mean === null
        ? null
        : computeSoundDescriptor({
            energy: audioMeans.energy_mean,
            valence: audioMeans.valence_mean,
            danceability: audioMeans.danceability_mean,
            acousticness: audioMeans.acousticness_mean,
            instrumentalness: audioMeans.instrumentalness_mean,
          }),
  };
}

function enrichArtistRecord(artist, spotifyArtist, topTracks, albums, audioFeatures, match, query) {
  const allGenres = spotifyArtist.genres || [];
  const topTrack = topTracks[0] || null;
  const previewTrack = topTracks.find((track) => track.preview_url) || null;
  const { features, audioMeans, sound_descriptor } = buildAudioMeans(
    spotifyArtist,
    topTracks,
    audioFeatures
  );
  const spotifyImage = spotifyArtist.images?.[0]?.url || null;

  return {
    ...artist,
    image_url: artist.image_url || spotifyImage,
    spotify_id: spotifyArtist.id,
    spotify_url: spotifyArtist.external_urls?.spotify || null,
    spotify_uri: spotifyArtist.uri || null,
    spotify_href: spotifyArtist.href || null,
    spotify_name: spotifyArtist.name,
    spotify_image_url: spotifyImage,
    image_url_medium: spotifyArtist.images?.[1]?.url || spotifyImage,
    image_url_small: spotifyArtist.images?.[2]?.url || spotifyArtist.images?.[1]?.url || spotifyImage,
    followers: spotifyArtist.followers?.total ?? null,
    popularity: spotifyArtist.popularity ?? null,
    artist_type: spotifyArtist.type || 'artist',
    genres: allGenres,
    primary_genres: allGenres.slice(0, 5).join(' | ') || artist.primary_genres || null,
    secondary_genres: allGenres.slice(5, 15).join(' | ') || artist.secondary_genres || null,
    all_genres: allGenres.join(' | ') || artist.all_genres || null,
    genre_count: allGenres.length,
    sound_descriptor,
    ...audioMeans,
    top_track_id: topTrack?.id || null,
    top_track_name: topTrack?.name || null,
    top_track_album: topTrack?.album?.name || null,
    top_track_popularity: topTrack?.popularity ?? null,
    top_track_spotify_url: topTrack?.external_urls?.spotify || null,
    top_track_player_url: previewTrack?.preview_url || topTrack?.preview_url || null,
    top_track_album_art: topTrack?.album?.images?.[0]?.url || null,
    preview_available: Boolean(previewTrack?.preview_url || topTrack?.preview_url),
    preview_length_sec: previewTrack?.preview_url || topTrack?.preview_url ? 30 : null,
    preview_start_sec: previewTrack?.preview_url || topTrack?.preview_url ? 0 : null,
    spotify_album_count: albums.length,
    spotify_albums: albums.slice(0, 12).map((album) => ({
      id: album.id,
      name: album.name,
      type: album.album_type,
      release_date: album.release_date,
      total_tracks: album.total_tracks,
      spotify_url: album.external_urls?.spotify || null,
      image_url: album.images?.[0]?.url || null,
    })),
    spotify_match_score: match.score,
    spotify_match_source: match.source,
    spotify_search_query: query,
    spotify_enrichment_version: ENRICHMENT_VERSION,
    enriched_at: new Date().toISOString(),
    spotify_last_updated: new Date().toISOString(),
    full_spotify_data: {
      artist: spotifyArtist,
      topTracks,
      albums,
      audioFeatures: features,
      audio_features_source: audioFeatures.length ? 'spotify_api' : 'synthetic',
      match: {
        score: match.score,
        source: match.source,
        accepted: match.accepted,
        exact: match.exact,
      },
    },
  };
}

function toPublicArtist(artist) {
  const {
    full_spotify_data: _fullSpotifyData,
    spotify_albums: _spotifyAlbums,
    ...publicArtist
  } = artist;

  return publicArtist;
}

function toRawSpotifyRecord(artist) {
  if (!artist.spotify_id && !artist.full_spotify_data && !artist.spotify_albums?.length) return null;

  return {
    id: artist.id,
    ade_id: artist.ade_id,
    title: artist.title,
    spotify_id: artist.spotify_id || null,
    spotify_name: artist.spotify_name || null,
    spotify_url: artist.spotify_url || null,
    spotify_match_score: artist.spotify_match_score || null,
    spotify_match_source: artist.spotify_match_source || null,
    spotify_search_query: artist.spotify_search_query || null,
    spotify_last_updated: artist.spotify_last_updated || null,
    spotify_albums: artist.spotify_albums || [],
    full_spotify_data: artist.full_spotify_data || null,
  };
}

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

async function atomicWriteJson(file, data) {
  const tmp = `${file}.tmp`;
  await writeFile(tmp, `${JSON.stringify(data)}\n`);
  await rename(tmp, file);
}

async function atomicWriteGzipJson(file, data) {
  const tmp = `${file}.tmp`;
  await writeFile(tmp, await gzipAsync(`${JSON.stringify(data)}\n`));
  await rename(tmp, file);
}

async function saveData(artists, eventsWithArtists, manifest, stats) {
  if (dryRun) return;
  const publicArtists = artists.map(toPublicArtist);
  const rawSpotifyRecords = artists.map(toRawSpotifyRecord).filter(Boolean);
  const artistsByAdeId = new Map(publicArtists.map((artist) => [Number(artist.ade_id || artist.id), artist]));
  const updatedEvents = eventsWithArtists.map((event) => ({
    ...event,
    artists: Array.isArray(event.artists)
      ? event.artists.map((artist) => artistsByAdeId.get(Number(artist.ade_id || artist.id)) || artist)
      : [],
  }));
  await atomicWriteJson(ARTISTS_FILE, publicArtists);
  await atomicWriteJson(EVENTS_FILE, updatedEvents);
  await atomicWriteGzipJson(RAW_SPOTIFY_FILE, rawSpotifyRecords);
  await atomicWriteJson(MANIFEST_FILE, {
    ...manifest,
    spotify_enrichment: {
      version: ENRICHMENT_VERSION,
      updated_at: new Date().toISOString(),
        enriched_artists: artists.filter((artist) => artist.spotify_id).length,
        rejected_artists: artists.filter((artist) => artist.spotify_match_status === 'rejected').length,
        not_found_artists: artists.filter((artist) => artist.spotify_match_status === 'not_found').length,
        with_spotify_genres: artists.filter((artist) => artist.all_genres || artist.primary_genres).length,
      with_top_tracks: artists.filter((artist) => artist.top_track_id).length,
      with_audio_metrics: artists.filter((artist) => typeof artist.energy_mean === 'number').length,
      raw_data_key: 'data/spotify-enrichment-raw.json.gz',
      last_run: stats,
    },
  });
}

async function main() {
  const clientId = process.env.SPOTIFY_CLIENT_ID || process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing SPOTIFY_CLIENT_ID/SPOTIFY_CLIENT_SECRET in .env.local');
  }

  const [artists, eventsWithArtists, manifest] = await Promise.all([
    readJson(ARTISTS_FILE),
    readJson(EVENTS_FILE),
    readJson(MANIFEST_FILE).catch(() => ({})),
  ]);

  const eventContextByArtist = new Map();
  for (const event of eventsWithArtists) {
    for (const artist of event.artists || []) {
      const key = Number(artist.ade_id || artist.id);
      if (!eventContextByArtist.has(key)) eventContextByArtist.set(key, new Set());
      const target = eventContextByArtist.get(key);
      String(event.categories || '')
        .split(/[|,/]/)
        .map((value) => value.trim())
        .filter(Boolean)
        .forEach((value) => target.add(value));
      if (event.event_type) target.add(String(event.event_type));
    }
  }

  let queue = artists
    .map((artist, index) => ({ artist, index }))
    .filter(({ artist }) => force || (!artist.spotify_id && !artist.spotify_match_status));

  if (offset) queue = queue.slice(offset);
  if (limit) queue = queue.slice(0, limit);

  const spotify = new SpotifyClient({ clientId, clientSecret });
  const stats = {
    dryRun,
    force,
    totalQueued: queue.length,
    processed: 0,
    enriched: 0,
    skipped: 0,
    notFound: 0,
    rejected: 0,
    errors: 0,
  };

  async function checkpointIfNeeded() {
    if (quiet && stats.processed % 10 === 0 && stats.processed % saveEvery !== 0) {
      console.log(`[spotify] progress processed=${stats.processed} enriched=${stats.enriched} rejected=${stats.rejected} notFound=${stats.notFound} errors=${stats.errors}`);
    }

    if (stats.processed % saveEvery === 0) {
      await saveData(artists, eventsWithArtists, manifest, stats);
      console.log(`[spotify] checkpoint saved processed=${stats.processed} enriched=${stats.enriched}`);
    }
  }

  console.log(
    `[spotify] queued=${queue.length} totalArtists=${artists.length} force=${force} dryRun=${dryRun} delayMs=${delayMs}`
  );

  for (const { artist, index } of queue) {
    stats.processed += 1;
    const contextGenres = Array.from(eventContextByArtist.get(Number(artist.ade_id || artist.id)) || []);
    const existingSpotifyId = artist.spotify_id || parseSpotifyIdFromUrl(artist.spotify_url);
    const query = normalizeName(artist.title) || artist.title;

    try {
      let spotifyArtist = null;
      let match = null;

      if (existingSpotifyId) {
        spotifyArtist = await spotify.artist(existingSpotifyId);
        if (spotifyArtist) {
          match = { ...scoreCandidate(artist, spotifyArtist, contextGenres, 'existing-id'), source: 'existing-id' };
        }
      }

      if (!spotifyArtist) {
        const candidates = await spotify.searchArtists(query);
        if (!candidates.length) {
          stats.notFound += 1;
          artists[index] = {
            ...artist,
            spotify_match_status: 'not_found',
            spotify_search_query: query,
            spotify_last_checked_at: new Date().toISOString(),
            spotify_enrichment_version: ENRICHMENT_VERSION,
          };
          if (!quiet) console.log(`[${stats.processed}/${queue.length}] not_found ${artist.title}`);
          await checkpointIfNeeded();
          continue;
        }

        const scored = candidates
          .map((candidate) => ({
            candidate,
            match: { ...scoreCandidate(artist, candidate, contextGenres, 'search'), source: 'search' },
          }))
          .sort((a, b) => b.match.score - a.match.score);

        if (!scored[0].match.accepted) {
          stats.rejected += 1;
          artists[index] = {
            ...artist,
            spotify_match_status: 'rejected',
            spotify_search_query: query,
            spotify_rejected_match_name: scored[0].candidate.name,
            spotify_rejected_match_score: scored[0].match.score,
            spotify_last_checked_at: new Date().toISOString(),
            spotify_enrichment_version: ENRICHMENT_VERSION,
          };
          if (!quiet) {
            console.log(
              `[${stats.processed}/${queue.length}] rejected ${artist.title} -> ${scored[0].candidate.name} score=${scored[0].match.score}`
            );
          }
          await checkpointIfNeeded();
          continue;
        }

        spotifyArtist = scored[0].candidate;
        match = scored[0].match;
      }

      const [topTracks, albums] = await Promise.all([
        spotify.topTracks(spotifyArtist.id),
        spotify.albums(spotifyArtist.id),
      ]);
      const audioFeatures = await spotify.audioFeatures(topTracks.slice(0, 10).map((track) => track.id));
      artists[index] = enrichArtistRecord(artist, spotifyArtist, topTracks, albums, audioFeatures, match, query);
      stats.enriched += 1;

      if (!quiet) {
        console.log(
          `[${stats.processed}/${queue.length}] enriched ${artist.title} -> ${spotifyArtist.name} score=${match.score} tracks=${topTracks.length} albums=${albums.length} audio=${audioFeatures.length ? 'api' : 'synthetic'}`
        );
      }

      await checkpointIfNeeded();
    } catch (error) {
      stats.errors += 1;
      console.warn(
        `[${stats.processed}/${queue.length}] error ${artist.title}: ${error instanceof Error ? error.message : String(error)}`
      );
      await checkpointIfNeeded();
    }
  }

  await saveData(artists, eventsWithArtists, manifest, stats);
  console.log('[spotify] complete', stats);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
