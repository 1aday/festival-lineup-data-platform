import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Test database connection and fetch counts
    const [
      artistsResult,
      syncHistoryResult,
      artistChangesResult
    ] = await Promise.all([
      supabase.from('artists').select('*', { count: 'exact', head: false }).limit(5),
      supabase.from('sync_history').select('*', { count: 'exact', head: false }).limit(5),
      supabase.from('artist_changes').select('*', { count: 'exact', head: false }).limit(5)
    ]);

    return NextResponse.json({
      success: true,
      artists: {
        count: artistsResult.count || 0,
        error: artistsResult.error,
        sample: artistsResult.data?.slice(0, 3).map(a => ({
          id: a.id,
          title: a.title,
          ade_id: a.ade_id
        }))
      },
      sync_history: {
        count: syncHistoryResult.count || 0,
        error: syncHistoryResult.error,
        latest: syncHistoryResult.data?.[0]
      },
      artist_changes: {
        count: artistChangesResult.count || 0,
        error: artistChangesResult.error
      },
      debug_info: {
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        key_present: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: String(error),
      message: 'Failed to connect to database'
    }, { status: 500 });
  }
}
