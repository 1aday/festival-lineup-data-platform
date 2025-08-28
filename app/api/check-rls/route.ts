import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  try {
    // Check RLS status for all our tables
    const { data: rlsStatus, error: rlsError } = await supabase
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .in('tablename', ['artists', 'events', 'artist_events', 'sync_history'])
      .eq('schemaname', 'public');

    // Try a test insert
    const testEvent = {
      ade_id: 99999999, // Test ID that shouldn't exist
      title: 'Test Event',
      subtitle: 'Test Subtitle',
      url: 'https://test.com',
      start_date: new Date().toISOString(),
      end_date: new Date().toISOString(),
      venue_name: 'Test Venue',
      categories: 'Test',
      sold_out: false
    };

    const { data: insertTest, error: insertError } = await supabase
      .from('events')
      .insert(testEvent)
      .select();

    // Clean up test event if it was inserted
    if (insertTest && insertTest[0]) {
      await supabase
        .from('events')
        .delete()
        .eq('ade_id', 99999999);
    }

    return NextResponse.json({
      rlsStatus: rlsStatus || 'Could not check RLS status',
      testInsert: {
        success: !insertError,
        data: insertTest,
        error: insertError ? {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint
        } : null
      }
    });

  } catch (error) {
    console.error('Error checking RLS:', error);
    return NextResponse.json({ 
      error: String(error),
      suggestion: 'Check Supabase dashboard for RLS policies on the events table'
    }, { status: 500 });
  }
}
