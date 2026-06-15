import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { enforceApiAccess, withApiHeaders } from '@/lib/api-access';
import { fetchCloudflareData } from '@/lib/cloudflare-data';
import { getDemoEvents } from '@/lib/demo-data';
import { isFetchFailure } from '@/lib/monetization-server';

type EventArtistJoin = {
  artists: {
    title: string;
    image_url: string | null;
    primary_genres: string | null;
    secondary_genres: string | null;
    energy_mean: number | null;
    [key: string]: unknown;
  };
};

export async function GET(request: NextRequest) {
  const access = await enforceApiAccess(request, '/api/events');
  if (access.response) return access.response;

  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const limit = parseInt(searchParams.get('limit') || '1000');
    const offset = parseInt(searchParams.get('offset') || '0');

    try {
      const cfParams = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (date) cfParams.set('date', date);

      const cloudflareEvents = await fetchCloudflareData<unknown[]>(`/api/events?${cfParams.toString()}`);
      if (cloudflareEvents) {
        const response = withApiHeaders(NextResponse.json(cloudflareEvents), access.headers);
        response.headers.set('X-Data-Source', 'cloudflare');
        return response;
      }
    } catch (error) {
      console.warn('Cloudflare events fallback:', error);
    }

    if (!isSupabaseConfigured()) {
      const demoRows = getDemoEvents({ date: date || undefined, limit, offset }).map((event) => {
        const avgEnergy =
          event.artists.length > 0
            ? event.artists.reduce((sum, artist) => sum + (artist.energy_mean || 0), 0) / event.artists.length
            : 0;

        return {
          ...event,
          artists: event.artists.map((artist) => ({
            ...artist,
            spotify_name: artist.title,
            spotify_image_url: artist.image_url,
            genres: artist.primary_genres
              ? artist.primary_genres.split('|').filter(Boolean)
              : artist.secondary_genres
                ? artist.secondary_genres.split('|').filter(Boolean)
                : [],
          })),
          avg_energy: avgEnergy,
        };
      });

      const response = withApiHeaders(NextResponse.json(demoRows), access.headers);
      response.headers.set('X-Demo-Data', '1');
      return response;
    }

    let query = supabase
      .from('events')
      .select(`
        id,
        ade_id,
        title,
        subtitle,
        start_date,
        end_date,
        venue_name,
        venue_address,
        categories,
        sold_out,
        url,
        artist_events!inner(
          artists!inner(
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
            preview_start_sec
          )
        )
      `)
      .eq('is_active', true)
      .order('start_date', { ascending: true })
      .range(offset, offset + limit - 1);

    // Filter by date if provided
    if (date) {
      const startOfDay = new Date(date + 'T00:00:00.000Z').toISOString();
      const endOfDay = new Date(date + 'T23:59:59.999Z').toISOString();
      query = query
        .gte('start_date', startOfDay)
        .lte('start_date', endOfDay);
    }

    const { data: events, error } = await query;

    if (error) {
      const demoRows = getDemoEvents({ date: date || undefined, limit, offset }).map((event) => {
        const avgEnergy =
          event.artists.length > 0
            ? event.artists.reduce((sum, artist) => sum + (artist.energy_mean || 0), 0) / event.artists.length
            : 0;

        return {
          ...event,
          artists: event.artists.map((artist) => ({
            ...artist,
            spotify_name: artist.title,
            spotify_image_url: artist.image_url,
            genres: artist.primary_genres
              ? artist.primary_genres.split('|').filter(Boolean)
              : artist.secondary_genres
                ? artist.secondary_genres.split('|').filter(Boolean)
                : [],
          })),
          avg_energy: avgEnergy,
        };
      });

      const response = withApiHeaders(NextResponse.json(demoRows), access.headers);
      response.headers.set('X-Demo-Reason', error.message || 'failed_to_fetch_events');
      response.headers.set('X-Demo-Data', '1');
      return response;
    }

    // Process events to include artists and calculate averages
    const processedEvents = events?.map(event => {
      const artists = event.artist_events?.map((ae: EventArtistJoin) => {
        const artist = ae.artists;
        return {
          ...artist,
          spotify_name: artist.title, // Add spotify_name for compatibility
          spotify_image_url: artist.image_url, // Add spotify_image_url for compatibility
          genres: artist.primary_genres ? 
            artist.primary_genres.split('|').filter(Boolean) : 
            (artist.secondary_genres ? artist.secondary_genres.split('|').filter(Boolean) : [])
        };
      }) || [];

      // Calculate average energy for the event
      const avgEnergy = artists.length > 0 ? 
        artists.reduce((sum, artist) => sum + (artist.energy_mean || 0), 0) / artists.length : 0;

      return {
        id: event.id,
        ade_id: event.ade_id,
        title: event.title,
        subtitle: event.subtitle,
        start_date: event.start_date,
        end_date: event.end_date,
        venue_name: event.venue_name,
        venue_address: event.venue_address,
        categories: event.categories,
        sold_out: event.sold_out,
        url: event.url,
        artists,
        avg_energy: avgEnergy
      };
    }) || [];

    return withApiHeaders(NextResponse.json(processedEvents), access.headers);
  } catch (error) {
    if (isFetchFailure(error)) {
      const { searchParams } = new URL(request.url);
      const date = searchParams.get('date');
      const limit = parseInt(searchParams.get('limit') || '1000');
      const offset = parseInt(searchParams.get('offset') || '0');

      const demoRows = getDemoEvents({ date: date || undefined, limit, offset }).map((event) => {
        const avgEnergy =
          event.artists.length > 0
            ? event.artists.reduce((sum, artist) => sum + (artist.energy_mean || 0), 0) / event.artists.length
            : 0;

        return {
          ...event,
          artists: event.artists.map((artist) => ({
            ...artist,
            spotify_name: artist.title,
            spotify_image_url: artist.image_url,
            genres: artist.primary_genres
              ? artist.primary_genres.split('|').filter(Boolean)
              : artist.secondary_genres
                ? artist.secondary_genres.split('|').filter(Boolean)
                : [],
          })),
          avg_energy: avgEnergy,
        };
      });

      const response = withApiHeaders(NextResponse.json(demoRows), access.headers);
      response.headers.set('X-Demo-Data', '1');
      return response;
    }

    console.error('Error in events API:', error);
    return withApiHeaders(
      NextResponse.json({ error: 'Internal server error' }, { status: 500 }),
      access.headers
    );
  }
}
