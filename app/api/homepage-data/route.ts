import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ 
      error: 'Supabase not configured',
      configured: false 
    }, { status: 500 });
  }

  try {
    // Load artists
    const { data: artists, error: artistsError } = await supabase
      .from('artists')
      .select('*')
      .limit(5);

    // Load events
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .limit(5);

    // Load artist-event relationships
    const { data: artistEvents, error: linksError } = await supabase
      .from('artist_events')
      .select('*')
      .limit(5);

    // Count totals
    const { count: artistCount } = await supabase
      .from('artists')
      .select('*', { count: 'exact', head: true });

    const { count: eventCount } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true });

    const { count: linkCount } = await supabase
      .from('artist_events')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      configured: true,
      counts: {
        artists: artistCount,
        events: eventCount,
        links: linkCount
      },
      samples: {
        artists: artists?.slice(0, 3).map(a => a.title),
        events: events?.slice(0, 3).map(e => e.title),
        hasData: (artists?.length || 0) > 0
      },
      errors: {
        artists: artistsError,
        events: eventsError,
        links: linksError
      }
    });

  } catch (error) {
    console.error('Error fetching homepage data:', error);
    return NextResponse.json({ 
      error: String(error),
      configured: true
    }, { status: 500 });
  }
}
