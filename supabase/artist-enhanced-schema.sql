-- Enhanced artists table with all available metadata
-- This ensures we capture ALL information from ADE API

-- Add columns for additional artist metadata if they don't exist
ALTER TABLE public.artists
ADD COLUMN IF NOT EXISTS subtitle TEXT,
ADD COLUMN IF NOT EXISTS handle VARCHAR(50),
ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS artist_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS is_dj BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_producer BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_live_act BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_band BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS country_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS image_title TEXT,
ADD COLUMN IF NOT EXISTS associated_genres TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS performance_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS venue_types TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS collaboration_count INTEGER DEFAULT 0;

-- Create indexes for better querying
CREATE INDEX IF NOT EXISTS idx_artists_roles ON artists USING GIN(roles);
CREATE INDEX IF NOT EXISTS idx_artists_country_code ON artists(country_code);
CREATE INDEX IF NOT EXISTS idx_artists_artist_type ON artists(artist_type);
CREATE INDEX IF NOT EXISTS idx_artists_is_dj ON artists(is_dj);
CREATE INDEX IF NOT EXISTS idx_artists_is_producer ON artists(is_producer);
CREATE INDEX IF NOT EXISTS idx_artists_associated_genres ON artists USING GIN(associated_genres);

-- Function to parse artist subtitle/roles
CREATE OR REPLACE FUNCTION parse_artist_roles(subtitle_text TEXT)
RETURNS TABLE(
    roles TEXT[],
    artist_type VARCHAR(100),
    is_dj BOOLEAN,
    is_producer BOOLEAN,
    is_live_act BOOLEAN,
    is_band BOOLEAN
) AS $$
DECLARE
    v_roles TEXT[] := '{}';
    v_artist_type VARCHAR(100);
    v_is_dj BOOLEAN := false;
    v_is_producer BOOLEAN := false;
    v_is_live_act BOOLEAN := false;
    v_is_band BOOLEAN := false;
    lower_subtitle TEXT;
BEGIN
    IF subtitle_text IS NULL OR subtitle_text = '' THEN
        RETURN QUERY SELECT 
            '{}'::TEXT[],
            NULL::VARCHAR(100),
            false,
            false,
            false,
            false;
        RETURN;
    END IF;
    
    lower_subtitle := LOWER(subtitle_text);
    
    -- Parse roles from subtitle
    IF lower_subtitle LIKE '%,%' THEN
        -- Split by comma for multiple roles
        v_roles := string_to_array(lower_subtitle, ',');
        FOR i IN 1..array_length(v_roles, 1) LOOP
            v_roles[i] := TRIM(v_roles[i]);
        END LOOP;
    ELSE
        v_roles := ARRAY[TRIM(lower_subtitle)];
    END IF;
    
    -- Set boolean flags based on roles
    IF lower_subtitle LIKE '%dj%' THEN
        v_is_dj := true;
        IF v_artist_type IS NULL THEN v_artist_type := 'DJ'; END IF;
    END IF;
    
    IF lower_subtitle LIKE '%produc%' THEN
        v_is_producer := true;
        IF v_artist_type IS NULL THEN 
            v_artist_type := 'Producer';
        ELSIF v_is_dj THEN
            v_artist_type := 'DJ/Producer';
        END IF;
    END IF;
    
    IF lower_subtitle LIKE '%live%' OR lower_subtitle LIKE '%perform%' THEN
        v_is_live_act := true;
        IF v_artist_type IS NULL THEN v_artist_type := 'Live Act'; END IF;
    END IF;
    
    IF lower_subtitle LIKE '%band%' OR lower_subtitle LIKE '%group%' OR lower_subtitle LIKE '%duo%' OR lower_subtitle LIKE '%trio%' THEN
        v_is_band := true;
        IF v_artist_type IS NULL THEN v_artist_type := 'Band/Group'; END IF;
    END IF;
    
    -- Default type if none detected
    IF v_artist_type IS NULL AND subtitle_text IS NOT NULL THEN
        v_artist_type := 'Artist';
    END IF;
    
    RETURN QUERY SELECT 
        v_roles,
        v_artist_type,
        v_is_dj,
        v_is_producer,
        v_is_live_act,
        v_is_band;
END;
$$ LANGUAGE plpgsql;

-- View to see artists with all their metadata
CREATE OR REPLACE VIEW artist_metadata_view AS
SELECT 
    a.id,
    a.ade_id,
    a.title,
    a.subtitle,
    a.country_label,
    a.country_code,
    a.roles,
    a.artist_type,
    a.is_dj,
    a.is_producer,
    a.is_live_act,
    a.is_band,
    a.spotify_id,
    a.genres as spotify_genres,
    a.associated_genres,
    a.popularity,
    a.followers,
    a.image_url,
    a.performance_count,
    COUNT(DISTINCT ae.event_id) as linked_events_count,
    a.enriched_at,
    a.created_at
FROM artists a
LEFT JOIN artist_events ae ON ae.artist_id = a.id
GROUP BY 
    a.id, a.ade_id, a.title, a.subtitle, a.country_label, a.country_code,
    a.roles, a.artist_type, a.is_dj, a.is_producer, a.is_live_act, a.is_band,
    a.spotify_id, a.genres, a.associated_genres, a.popularity, a.followers,
    a.image_url, a.performance_count, a.enriched_at, a.created_at;

-- Stats view for artist types
CREATE OR REPLACE VIEW artist_type_stats AS
SELECT 
    artist_type,
    COUNT(*) as count,
    COUNT(CASE WHEN spotify_id IS NOT NULL THEN 1 END) as with_spotify,
    ROUND(AVG(popularity)::numeric, 1) as avg_popularity,
    ROUND(AVG(followers)::numeric, 0) as avg_followers
FROM artists
WHERE artist_type IS NOT NULL
GROUP BY artist_type
ORDER BY count DESC;

-- View for artist country distribution
CREATE OR REPLACE VIEW artist_country_stats AS
SELECT 
    COALESCE(country_label, 'Unknown') as country,
    country_code,
    COUNT(*) as artist_count,
    COUNT(CASE WHEN is_dj THEN 1 END) as dj_count,
    COUNT(CASE WHEN is_producer THEN 1 END) as producer_count,
    COUNT(CASE WHEN spotify_id IS NOT NULL THEN 1 END) as with_spotify
FROM artists
GROUP BY country_label, country_code
ORDER BY artist_count DESC;

-- Function to extract genres from artist's events
CREATE OR REPLACE FUNCTION update_artist_associated_genres(p_artist_id INTEGER)
RETURNS TEXT[] AS $$
DECLARE
    v_genres TEXT[] := '{}';
BEGIN
    SELECT ARRAY_AGG(DISTINCT genre)
    INTO v_genres
    FROM (
        SELECT unnest(e.genres) as genre
        FROM artist_events ae
        JOIN events e ON e.id = ae.event_id
        WHERE ae.artist_id = p_artist_id
        AND e.genres IS NOT NULL
        AND array_length(e.genres, 1) > 0
    ) t
    WHERE genre IS NOT NULL;
    
    -- Update the artist's associated_genres
    UPDATE artists
    SET associated_genres = COALESCE(v_genres, '{}')
    WHERE id = p_artist_id;
    
    RETURN v_genres;
END;
$$ LANGUAGE plpgsql;

-- Update existing artists to parse their roles
UPDATE artists a
SET (roles, artist_type, is_dj, is_producer, is_live_act, is_band) = (
    SELECT * FROM parse_artist_roles(a.subtitle)
)
WHERE a.subtitle IS NOT NULL AND a.subtitle != '';
