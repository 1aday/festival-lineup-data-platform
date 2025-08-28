-- Add Spotify enrichment columns to artists table
ALTER TABLE artists 
ADD COLUMN IF NOT EXISTS spotify_id TEXT,
ADD COLUMN IF NOT EXISTS spotify_url TEXT,
ADD COLUMN IF NOT EXISTS genres TEXT[],
ADD COLUMN IF NOT EXISTS popularity INTEGER,
ADD COLUMN IF NOT EXISTS followers INTEGER,
ADD COLUMN IF NOT EXISTS spotify_image TEXT,
ADD COLUMN IF NOT EXISTS spotify_data JSONB,
ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ;

-- Create index for spotify_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_artists_spotify_id ON artists(spotify_id);

-- Create index for popularity for sorting
CREATE INDEX IF NOT EXISTS idx_artists_popularity ON artists(popularity DESC NULLS LAST);

-- Create index for followers for sorting
CREATE INDEX IF NOT EXISTS idx_artists_followers ON artists(followers DESC NULLS LAST);

-- Create a view for enrichment statistics
CREATE OR REPLACE VIEW artist_enrichment_stats AS
SELECT 
  COUNT(*) as total_artists,
  COUNT(spotify_id) as enriched_artists,
  ROUND((COUNT(spotify_id)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2) as enrichment_percentage,
  AVG(popularity) as avg_popularity,
  AVG(followers) as avg_followers,
  MAX(followers) as max_followers,
  MIN(followers) FILTER (WHERE followers > 0) as min_followers,
  COUNT(DISTINCT UNNEST(genres)) as unique_genres
FROM artists;

-- Grant permissions
GRANT SELECT ON artist_enrichment_stats TO anon, authenticated;
GRANT SELECT, UPDATE ON artists TO anon, authenticated;
