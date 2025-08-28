-- Comprehensive Spotify Enrichment Schema for Artists Table
-- Run this SQL in your Supabase SQL Editor to add all Spotify enrichment columns
-- This script safely handles existing columns
--
-- IMPORTANT: Copy and paste the ENTIRE contents of this file into your Supabase SQL Editor
-- Then click "Run" to apply all the schema changes at once

-- Add comprehensive Spotify columns (only if they don't exist)
ALTER TABLE artists 
-- Basic Spotify data
ADD COLUMN IF NOT EXISTS spotify_id TEXT,
ADD COLUMN IF NOT EXISTS spotify_url TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS name TEXT, -- Spotify's official name
ADD COLUMN IF NOT EXISTS followers INTEGER,
ADD COLUMN IF NOT EXISTS popularity INTEGER,

-- Genres
ADD COLUMN IF NOT EXISTS primary_genres TEXT, -- First 3-5 genres joined with |
ADD COLUMN IF NOT EXISTS secondary_genres TEXT, -- Next up to 10 genres joined with |

-- Audio features (averaged across top tracks)
ADD COLUMN IF NOT EXISTS sound_descriptor TEXT, -- Computed description like "intense / moody"
ADD COLUMN IF NOT EXISTS energy_mean DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS danceability_mean DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS valence_mean DECIMAL(5,4), -- Musical positivity
ADD COLUMN IF NOT EXISTS tempo_bpm_mean DECIMAL(6,2),
ADD COLUMN IF NOT EXISTS acousticness_mean DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS instrumentalness_mean DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS liveness_mean DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS speechiness_mean DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS loudness_mean_db DECIMAL(5,2),

-- Top track info
ADD COLUMN IF NOT EXISTS top_track_id TEXT,
ADD COLUMN IF NOT EXISTS top_track_name TEXT,
ADD COLUMN IF NOT EXISTS top_track_popularity INTEGER,
ADD COLUMN IF NOT EXISTS top_track_player_url TEXT,

-- Preview metadata
ADD COLUMN IF NOT EXISTS preview_available BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS preview_length_sec INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS preview_start_sec INTEGER DEFAULT 0,

-- Related artists
ADD COLUMN IF NOT EXISTS related_1 TEXT,
ADD COLUMN IF NOT EXISTS related_2 TEXT,
ADD COLUMN IF NOT EXISTS related_3 TEXT,

-- Metadata
ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS full_spotify_data JSONB; -- Store complete response for future reference

-- Drop old columns that might conflict (if they exist)
ALTER TABLE artists
DROP COLUMN IF EXISTS genres,
DROP COLUMN IF EXISTS spotify_image,
DROP COLUMN IF EXISTS spotify_data;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_artists_spotify_id ON artists(spotify_id);
CREATE INDEX IF NOT EXISTS idx_artists_enriched_at ON artists(enriched_at);
CREATE INDEX IF NOT EXISTS idx_artists_popularity ON artists(popularity);
CREATE INDEX IF NOT EXISTS idx_artists_followers ON artists(followers);
CREATE INDEX IF NOT EXISTS idx_artists_energy ON artists(energy_mean);
CREATE INDEX IF NOT EXISTS idx_artists_valence ON artists(valence_mean);
CREATE INDEX IF NOT EXISTS idx_artists_tempo ON artists(tempo_bpm_mean);

-- Create a view for enrichment status with audio features
CREATE OR REPLACE VIEW artist_enrichment_full AS
SELECT 
  COUNT(*) as total_artists,
  COUNT(enriched_at) as enriched_count,
  COUNT(spotify_id) as with_spotify,
  COUNT(primary_genres) as with_genres,
  COUNT(top_track_id) as with_top_track,
  COUNT(energy_mean) as with_audio_features,
  AVG(popularity) as avg_popularity,
  AVG(followers) as avg_followers,
  AVG(energy_mean) as avg_energy,
  AVG(danceability_mean) as avg_danceability,
  AVG(valence_mean) as avg_valence,
  ROUND((COUNT(enriched_at)::numeric / NULLIF(COUNT(*)::numeric, 0) * 100), 2) as enrichment_percentage
FROM artists;

-- Grant permissions if using RLS
GRANT SELECT ON artist_enrichment_full TO anon, authenticated;

-- QUICK FIX: If you just want to fix the immediate error, run this minimal SQL:
-- ALTER TABLE artists ADD COLUMN IF NOT EXISTS preview_available BOOLEAN DEFAULT false;
-- ALTER TABLE artists ADD COLUMN IF NOT EXISTS preview_length_sec INTEGER DEFAULT 30;
-- ALTER TABLE artists ADD COLUMN IF NOT EXISTS preview_start_sec INTEGER DEFAULT 0;