import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Add Spotify enrichment columns to artists table
    const queries = [
      `ALTER TABLE artists 
       ADD COLUMN IF NOT EXISTS spotify_id TEXT`,
      `ALTER TABLE artists 
       ADD COLUMN IF NOT EXISTS spotify_url TEXT`,
      `ALTER TABLE artists 
       ADD COLUMN IF NOT EXISTS genres TEXT[]`,
      `ALTER TABLE artists 
       ADD COLUMN IF NOT EXISTS popularity INTEGER`,
      `ALTER TABLE artists 
       ADD COLUMN IF NOT EXISTS followers INTEGER`,
      `ALTER TABLE artists 
       ADD COLUMN IF NOT EXISTS spotify_image TEXT`,
      `ALTER TABLE artists 
       ADD COLUMN IF NOT EXISTS spotify_data JSONB`,
      `ALTER TABLE artists 
       ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ`,
      `CREATE INDEX IF NOT EXISTS idx_artists_spotify_id ON artists(spotify_id)`,
      `CREATE INDEX IF NOT EXISTS idx_artists_popularity ON artists(popularity DESC NULLS LAST)`,
      `CREATE INDEX IF NOT EXISTS idx_artists_followers ON artists(followers DESC NULLS LAST)`
    ];

    const results = [];
    for (const query of queries) {
      try {
        const { error } = await supabase.rpc('execute_sql', { 
          sql: query 
        }).single();
        
        if (error) {
          // Try direct approach if RPC doesn't work
          console.log(`Query: ${query.substring(0, 50)}... - Error: ${error.message}`);
          results.push({ query: query.substring(0, 50), error: error.message });
        } else {
          results.push({ query: query.substring(0, 50), success: true });
        }
      } catch (err) {
        results.push({ query: query.substring(0, 50), error: String(err) });
      }
    }

    // Test if columns exist by querying
    const { data: testData, error: testError } = await supabase
      .from('artists')
      .select('id, title, spotify_id, genres, popularity, followers')
      .limit(1);

    return NextResponse.json({
      message: 'Schema update attempted',
      results,
      test: testError ? { error: testError.message } : { success: true, sample: testData }
    });

  } catch (error) {
    return NextResponse.json({ 
      error: String(error)
    }, { status: 500 });
  }
}
