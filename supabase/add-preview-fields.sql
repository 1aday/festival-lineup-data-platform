-- Add preview-specific fields to the artists table
-- These fields help control preview playback and availability

ALTER TABLE public.artists 
ADD COLUMN IF NOT EXISTS preview_available boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS preview_length_sec integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS preview_start_sec integer DEFAULT 0;

-- Update preview_available based on existing top_track_player_url
UPDATE public.artists
SET preview_available = (top_track_player_url IS NOT NULL AND top_track_player_url != '')
WHERE preview_available IS NULL OR preview_available = false;

-- Add comments for clarity
COMMENT ON COLUMN public.artists.top_track_player_url IS 'Direct MP3 preview URL from Spotify API (30 second clip)';
COMMENT ON COLUMN public.artists.preview_available IS 'Whether a preview URL is available for the top track';
COMMENT ON COLUMN public.artists.preview_length_sec IS 'Length of preview in seconds (typically 30)';
COMMENT ON COLUMN public.artists.preview_start_sec IS 'Start offset in seconds for preview playback (default 0)';

-- Create an index for faster filtering of artists with previews
CREATE INDEX IF NOT EXISTS idx_artists_preview_available 
ON public.artists(preview_available) 
WHERE preview_available = true;
