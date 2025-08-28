-- Add spotify_image_url column to store original Spotify image URL as backup
ALTER TABLE artists 
ADD COLUMN IF NOT EXISTS spotify_image_url TEXT;

-- Add comment for clarity
COMMENT ON COLUMN artists.spotify_image_url IS 'Original Spotify image URL as backup';
COMMENT ON COLUMN artists.image_url IS 'Primary image URL - preferably from Supabase Storage';
COMMENT ON COLUMN artists.image_url_medium IS 'Medium size image URL - preferably from Supabase Storage';
COMMENT ON COLUMN artists.image_url_small IS 'Small size image URL - preferably from Supabase Storage';
