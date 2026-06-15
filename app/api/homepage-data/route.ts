import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { enforceApiAccess, withApiHeaders } from '@/lib/api-access';
import { fetchCloudflareData } from '@/lib/cloudflare-data';
import { getDemoHomepageData } from '@/lib/demo-data';
import { isFetchFailure } from '@/lib/monetization-server';

type DateRow = { start_date: string };
type GenreRow = {
  primary_genres: string | null;
  secondary_genres: string | null;
  subtitle: string | null;
  genres?: unknown;
};

export async function GET(req: NextRequest) {
  const access = await enforceApiAccess(req, '/api/homepage-data');
  if (access.response) return access.response;

  try {
    try {
      const cloudflareHomepage = await fetchCloudflareData('/api/homepage-data');
      if (cloudflareHomepage) {
        const response = withApiHeaders(NextResponse.json(cloudflareHomepage), access.headers);
        response.headers.set('X-Data-Source', 'cloudflare');
        return response;
      }
    } catch (error) {
      console.warn('Cloudflare homepage fallback:', error);
    }

    if (!isSupabaseConfigured()) {
      const response = withApiHeaders(NextResponse.json(getDemoHomepageData()), access.headers);
      response.headers.set('X-Demo-Data', '1');
      return response;
    }

    // Counts
    const [{ count: artistCount }, { count: eventCount }] = await Promise.all([
      supabase.from('artists').select('*', { count: 'exact', head: true }),
      supabase.from('events').select('*', { count: 'exact', head: true }),
    ]);

    // Distinct venues and countries counts
    const [venueRes, countryRes] = await Promise.all([
      supabase.from('events').select('venue_name').not('venue_name', 'is', null),
      supabase.from('artists').select('country_label').not('country_label', 'is', null),
    ]);

    const venueSet = new Set<string>();
    venueRes.data?.forEach((r) => r.venue_name && venueSet.add(r.venue_name));
    const countrySet = new Set<string>();
    countryRes.data?.forEach((r) => r.country_label && countrySet.add(r.country_label));

    // Dates
    const datesRes = await supabase.from('events').select('start_date');
    const dateSet = new Set<string>();
    datesRes.data?.forEach((e: DateRow) => {
      const iso = new Date(e.start_date).toLocaleDateString('en-CA');
      dateSet.add(iso);
    });
    const dates = Array.from(dateSet).sort();

    // Top venues (approximate using client grouping)
    const tvMap = new Map<string, number>();
    venueRes.data?.forEach((r) => {
      if (r.venue_name) tvMap.set(r.venue_name, (tvMap.get(r.venue_name) || 0) + 1);
    });
    const topVenues = Array.from(tvMap.entries())
      .map(([venue, count]) => ({ venue, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const normalizeGenre = (value: string) =>
      value
        .replace(/&/g, ' AND ')
        .replace(/[-_/]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();

    const addRawGenres = (raw: string | null | undefined, target: Set<string>) => {
      if (!raw) return;
      raw
        .split(/[|,/]/)
        .map(part => normalizeGenre(part))
        .filter(Boolean)
        .forEach(g => target.add(g));
    };

    const addGenreArray = (arr: unknown, target: Set<string>) => {
      if (!Array.isArray(arr)) return;
      for (const entry of arr) {
        if (typeof entry === 'string') {
          const norm = normalizeGenre(entry);
          if (norm) target.add(norm);
        }
      }
    };

    const genresRes = await supabase
      .from('artists')
      .select('primary_genres, secondary_genres, subtitle, full_spotify_data->artist->genres')
      .limit(5000);
    const genreSet = new Set<string>();
    genresRes.data?.forEach((row: GenreRow) => {
      addRawGenres(row.primary_genres, genreSet);
      addRawGenres(row.secondary_genres, genreSet);
      addGenreArray(row.genres, genreSet);
      if (row.subtitle) {
        row.subtitle
          .split(/[|,]/)
          .map((val: string) => normalizeGenre(val))
          .filter(Boolean)
          .forEach((val: string) => genreSet.add(val));
      }
    });
    const genres = Array.from(genreSet).sort();

    const noLiveData =
      (artistCount || 0) === 0 &&
      (eventCount || 0) === 0 &&
      venueSet.size === 0 &&
      countrySet.size === 0;

    if (noLiveData && process.env.NODE_ENV !== 'production') {
      const response = withApiHeaders(NextResponse.json(getDemoHomepageData()), access.headers);
      response.headers.set('X-Demo-Data', '1');
      return response;
    }

    return withApiHeaders(
      NextResponse.json({
        counts: {
          artists: artistCount || 0,
          events: eventCount || 0,
          venues: venueSet.size,
          countries: countrySet.size,
          genres: genres.length,
        },
        dates,
        topVenues,
        genres,
      }),
      access.headers
    );
  } catch (e: unknown) {
    if (isFetchFailure(e)) {
      const response = withApiHeaders(NextResponse.json(getDemoHomepageData()), access.headers);
      response.headers.set('X-Demo-Data', '1');
      return response;
    }

    const message = e instanceof Error ? e.message : 'Failed to load homepage data';
    return withApiHeaders(
      NextResponse.json({ error: message }, { status: 500 }),
      access.headers
    );
  }
}
