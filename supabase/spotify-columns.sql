-- Spotify Enrichment Columns for Artists Table
-- Run this SQL in your Supabase SQL Editor to add Spotify enrichment columns

-- Add Spotify enrichment columns to artists table
ALTER TABLE artists 
ADD COLUMN IF NOT EXISTS spotify_id TEXT,
ADD COLUMN IF NOT EXISTS spotify_url TEXT,
ADD COLUMN IF NOT EXISTS genres TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS popularity INTEGER,
ADD COLUMN IF NOT EXISTS followers INTEGER,
ADD COLUMN IF NOT EXISTS spotify_image TEXT,
ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS spotify_data JSONB;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_artists_spotify_id ON artists(spotify_id);
CREATE INDEX IF NOT EXISTS idx_artists_enriched_at ON artists(enriched_at);
CREATE INDEX IF NOT EXISTS idx_artists_genres ON artists USING GIN(genres);
CREATE INDEX IF NOT EXISTS idx_artists_popularity ON artists(popularity);

-- Optional: View to see enrichment status
CREATE OR REPLACE VIEW artist_enrichment_status AS
SELECT 
  COUNT(*) as total_artists,
  COUNT(enriched_at) as enriched_count,
  COUNT(spotify_id) as with_spotify,
  COUNT(CASE WHEN array_length(genres, 1) > 0 THEN 1 END) as with_genres,
  ROUND((COUNT(enriched_at)::numeric / COUNT(*)::numeric * 100), 2) as enrichment_percentage
FROM artists;

-- Grant permissions if using RLS
GRANT SELECT ON artist_enrichment_status TO anon, authenticated;
