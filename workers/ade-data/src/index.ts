type R2Bucket = {
  get(key: string): Promise<R2ObjectBody | null>;
  put(
    key: string,
    value: ArrayBuffer | ReadableStream | string,
    options?: { httpMetadata?: Record<string, string> }
  ): Promise<unknown>;
};

type R2ObjectBody = {
  body: ReadableStream | null;
  httpEtag: string;
  json<T>(): Promise<T>;
  writeHttpMetadata(headers: Headers): void;
};

interface Env {
  ADE_DATA: R2Bucket;
}

type Artist = {
  id: number;
  title: string;
  country_label?: string | null;
  image_key?: string | null;
  image_url?: string | null;
  spotify_image_url?: string | null;
  [key: string]: unknown;
};

type EventRow = {
  id: number;
  start_date?: string | null;
  artists?: Artist[];
  [key: string]: unknown;
};

type ImageSource = {
  source: string;
  title?: string;
  ade_id?: number;
};

const DATA_KEYS = {
  artists: 'data/artists.json',
  events: 'data/events.json',
  eventsWithArtists: 'data/events-with-artists.json',
  artistEvents: 'data/artist-events.json',
  homepage: 'data/homepage-data.json',
  manifest: 'data/manifest.json',
  imageSources: 'data/image-sources.json',
};

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, HEAD, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'cache-control': 'public, max-age=300, s-maxage=3600',
};

let imageSourcesCache: Promise<Record<string, ImageSource>> | null = null;

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...jsonHeaders, ...(init?.headers || {}) },
  });
}

async function readJson<T>(env: Env, key: string): Promise<T> {
  const object = await env.ADE_DATA.get(key);
  if (!object) {
    throw new Error(`Missing R2 object: ${key}`);
  }
  return object.json<T>();
}

function absoluteArtistImage(artist: Artist, origin: string): Artist {
  if (!artist || typeof artist !== 'object') return artist;
  const imageKey = typeof artist.image_key === 'string' ? artist.image_key : null;
  if (!imageKey) return artist;
  const imageUrl = `${origin}/${imageKey}`;
  return {
    ...artist,
    image_url: imageUrl,
    spotify_image_url: artist.spotify_image_url || imageUrl,
  };
}

function pageRows<T>(rows: T[], url: URL) {
  const limit = Math.max(0, Number(url.searchParams.get('limit') || rows.length));
  const offset = Math.max(0, Number(url.searchParams.get('offset') || 0));
  return rows.slice(offset, offset + limit);
}

async function getImageSources(env: Env) {
  imageSourcesCache ||= readJson<Record<string, ImageSource>>(env, DATA_KEYS.imageSources);
  return imageSourcesCache;
}

async function serveImage(request: Request, env: Env, key: string) {
  const cached = await env.ADE_DATA.get(key);
  if (cached) {
    const headers = new Headers();
    cached.writeHttpMetadata(headers);
    headers.set('etag', cached.httpEtag);
    headers.set('cache-control', 'public, max-age=31536000, immutable');
    headers.set('access-control-allow-origin', '*');
    return new Response(request.method === 'HEAD' ? null : cached.body, { headers });
  }

  const sources = await getImageSources(env);
  const imageSource = sources[key];
  if (!imageSource?.source) {
    return json({ error: 'image_not_found' }, { status: 404 });
  }

  const upstream = await fetch(imageSource.source, {
    headers: {
      accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'user-agent': 'Mozilla/5.0',
    },
  });

  if (!upstream.ok) {
    return json({ error: 'image_source_failed', status: upstream.status }, { status: 502 });
  }

  const contentType = upstream.headers.get('content-type') || 'image/jpeg';
  const body = await upstream.arrayBuffer();
  await env.ADE_DATA.put(key, body, {
    httpMetadata: {
      contentType,
      cacheControl: 'public, max-age=31536000, immutable',
    },
  });

  return new Response(request.method === 'HEAD' ? null : body, {
    headers: {
      'content-type': contentType,
      'cache-control': 'public, max-age=31536000, immutable',
      'access-control-allow-origin': '*',
    },
  });
}

async function handleArtists(url: URL, env: Env, origin: string) {
  let rows = await readJson<Artist[]>(env, DATA_KEYS.artists);
  const search = url.searchParams.get('search')?.toLowerCase().trim();
  const country = url.searchParams.get('country');

  if (search) {
    rows = rows.filter((artist) =>
      `${artist.title || ''} ${artist.subtitle || ''}`.toLowerCase().includes(search)
    );
  }

  if (country && country !== 'all') {
    rows = rows.filter((artist) => artist.country_label === country);
  }

  return json(pageRows(rows, url).map((artist) => absoluteArtistImage(artist, origin)));
}

async function handleEvents(url: URL, env: Env, origin: string) {
  let rows = await readJson<EventRow[]>(env, DATA_KEYS.eventsWithArtists);
  const date = url.searchParams.get('date');

  if (date) {
    rows = rows.filter((event) => String(event.start_date || '').startsWith(date));
  }

  const paged = pageRows(rows, url).map((event) => ({
    ...event,
    artists: Array.isArray(event.artists)
      ? event.artists.map((artist) => absoluteArtistImage(artist, origin))
      : [],
  }));

  return json(paged);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const origin = url.origin;

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: jsonHeaders });
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return json({ error: 'method_not_allowed' }, { status: 405 });
    }

    try {
      if (path.startsWith('/images/')) {
        return serveImage(request, env, path.slice(1));
      }

      if (path === '/' || path === '/health') {
        return json({ ok: true, service: 'ade-data' });
      }

      if (path === '/api/artists' || path === '/artists.json') {
        return handleArtists(url, env, origin);
      }

      if (path === '/api/events' || path === '/events.json') {
        return handleEvents(url, env, origin);
      }

      if (path === '/api/artist-events' || path === '/artist-events.json') {
        return json(await readJson(env, DATA_KEYS.artistEvents));
      }

      if (path === '/api/homepage-data' || path === '/homepage-data.json') {
        return json(await readJson(env, DATA_KEYS.homepage));
      }

      if (path === '/manifest.json') {
        return json(await readJson(env, DATA_KEYS.manifest));
      }

      return json({ error: 'not_found' }, { status: 404 });
    } catch (error) {
      return json(
        { error: error instanceof Error ? error.message : 'internal_error' },
        { status: 500, headers: { 'cache-control': 'no-store' } }
      );
    }
  },
};
