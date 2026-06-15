import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { enforceApiAccess, withApiHeaders } from '@/lib/api-access';
import { fetchCloudflareData } from '@/lib/cloudflare-data';
import { getDemoArtists } from '@/lib/demo-data';
import { isFetchFailure } from '@/lib/monetization-server';

export async function GET(request: NextRequest) {
  const access = await enforceApiAccess(request, '/api/artists');
  if (access.response) return access.response;

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '1000');
    const offset = parseInt(searchParams.get('offset') || '0');

    try {
      const cfParams = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      const search = searchParams.get('search');
      const country = searchParams.get('country');
      if (search) cfParams.set('search', search);
      if (country) cfParams.set('country', country);

      const cloudflareArtists = await fetchCloudflareData<unknown[]>(`/api/artists?${cfParams.toString()}`);
      if (cloudflareArtists) {
        const response = withApiHeaders(NextResponse.json(cloudflareArtists), access.headers);
        response.headers.set('X-Data-Source', 'cloudflare');
        return response;
      }
    } catch (error) {
      console.warn('Cloudflare artists fallback:', error);
    }

    if (!isSupabaseConfigured()) {
      const demo = getDemoArtists(limit, offset).map((artist) => ({
        ...artist,
        spotify_name: artist.title,
        spotify_image_url: artist.image_url,
        genres: artist.primary_genres
          ? artist.primary_genres.split('|').filter(Boolean)
          : artist.secondary_genres
            ? artist.secondary_genres.split('|').filter(Boolean)
            : [],
      }));

      const response = withApiHeaders(NextResponse.json(demo), access.headers);
      response.headers.set('X-Demo-Data', '1');
      return response;
    }

    const query = supabase
      .from('artists')
      .select(`
        id,
        ade_id,
        title,
        subtitle,
        country_label,
        image_url,
        spotify_id,
        spotify_url,
        followers,
        popularity,
        primary_genres,
        secondary_genres,
        energy_mean,
        danceability_mean,
        valence_mean,
        tempo_bpm_mean,
        sound_descriptor,
        top_track_name,
        top_track_popularity,
        preview_available,
        preview_length_sec,
        preview_start_sec,
        enriched_at
      `)
      .eq('is_active', true)
      .order('popularity', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    const { data: artists, error } = await query;

    if (error) {
      const demo = getDemoArtists(limit, offset).map((artist) => ({
        ...artist,
        spotify_name: artist.title,
        spotify_image_url: artist.image_url,
        genres: artist.primary_genres
          ? artist.primary_genres.split('|').filter(Boolean)
          : artist.secondary_genres
            ? artist.secondary_genres.split('|').filter(Boolean)
            : [],
      }));

      const response = withApiHeaders(NextResponse.json(demo), access.headers);
      response.headers.set('X-Demo-Reason', error.message || 'failed_to_fetch_artists');
      response.headers.set('X-Demo-Data', '1');
      return response;
    }

    // Process artists to include genres as array
    const processedArtists = artists?.map(artist => ({
      ...artist,
      spotify_name: artist.title, // Add spotify_name for compatibility
      spotify_image_url: artist.image_url, // Add spotify_image_url for compatibility
      genres: artist.primary_genres ? 
        artist.primary_genres.split('|').filter(Boolean) : 
        (artist.secondary_genres ? artist.secondary_genres.split('|').filter(Boolean) : [])
    })) || [];

    return withApiHeaders(NextResponse.json(processedArtists), access.headers);
  } catch (error) {
    if (isFetchFailure(error)) {
      const { searchParams } = new URL(request.url);
      const limit = parseInt(searchParams.get('limit') || '1000');
      const offset = parseInt(searchParams.get('offset') || '0');

      const demo = getDemoArtists(limit, offset).map((artist) => ({
        ...artist,
        spotify_name: artist.title,
        spotify_image_url: artist.image_url,
        genres: artist.primary_genres
          ? artist.primary_genres.split('|').filter(Boolean)
          : artist.secondary_genres
            ? artist.secondary_genres.split('|').filter(Boolean)
            : [],
      }));

      const response = withApiHeaders(NextResponse.json(demo), access.headers);
      response.headers.set('X-Demo-Data', '1');
      return response;
    }

    console.error('Error in artists API:', error);
    return withApiHeaders(
      NextResponse.json({ error: 'Internal server error' }, { status: 500 }),
      access.headers
    );
  }
}
