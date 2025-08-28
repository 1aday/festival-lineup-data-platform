-- Enhanced events table with genre/category parsing
-- This adds proper genre extraction and normalization for events

-- Add columns for parsed genres if they don't exist
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS genres TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS venue_type TEXT,
ADD COLUMN IF NOT EXISTS event_format TEXT,
ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_nighttime BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_daytime BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_sold_out BOOLEAN DEFAULT false;

-- Create indexes for better querying
CREATE INDEX IF NOT EXISTS idx_events_genres ON events USING GIN(genres);
CREATE INDEX IF NOT EXISTS idx_events_venue_type ON events(venue_type);
CREATE INDEX IF NOT EXISTS idx_events_is_free ON events(is_free);
CREATE INDEX IF NOT EXISTS idx_events_is_sold_out ON events(is_sold_out);

-- Create a genres reference table
CREATE TABLE IF NOT EXISTS public.genres (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50), -- music, venue, format, special
    event_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create event_genres junction table for normalized relationships
CREATE TABLE IF NOT EXISTS public.event_genres (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES public.events(id) ON DELETE CASCADE,
    genre_id INTEGER REFERENCES public.genres(id) ON DELETE CASCADE,
    UNIQUE(event_id, genre_id)
);

-- Function to parse categories string into genres array
CREATE OR REPLACE FUNCTION parse_event_categories(category_string TEXT)
RETURNS TABLE(
    genres TEXT[],
    venue_type TEXT,
    event_format TEXT,
    is_free BOOLEAN,
    is_nighttime BOOLEAN,
    is_daytime BOOLEAN,
    is_live BOOLEAN
) AS $$
DECLARE
    parts TEXT[];
    genre_list TEXT[] := '{}';
    v_venue_type TEXT;
    v_event_format TEXT;
    v_is_free BOOLEAN := false;
    v_is_nighttime BOOLEAN := false;
    v_is_daytime BOOLEAN := false;
    v_is_live BOOLEAN := false;
BEGIN
    -- Split by / and trim each part
    parts := string_to_array(category_string, '/');
    
    FOR i IN 1..array_length(parts, 1) LOOP
        parts[i] := TRIM(parts[i]);
        
        -- Extract venue types
        IF parts[i] ILIKE '%venues%' OR parts[i] ILIKE '%basement%' OR parts[i] ILIKE '%warehouse%' THEN
            v_venue_type := parts[i];
        -- Extract event formats
        ELSIF parts[i] ILIKE '%night%' OR parts[i] ILIKE '%day%' OR parts[i] ILIKE '%exhibition%' THEN
            v_event_format := parts[i];
            IF parts[i] ILIKE '%night%' THEN
                v_is_nighttime := true;
            ELSIF parts[i] ILIKE '%day%' THEN
                v_is_daytime := true;
            END IF;
        -- Check if free
        ELSIF parts[i] ILIKE '%free%' THEN
            v_is_free := true;
        -- Check if live
        ELSIF parts[i] ILIKE '%live%' THEN
            v_is_live := true;
        END IF;
        
        -- Extract music genres (common ones)
        IF parts[i] ILIKE '%techno%' OR 
           parts[i] ILIKE '%house%' OR 
           parts[i] ILIKE '%trance%' OR
           parts[i] ILIKE '%drum%bass%' OR
           parts[i] ILIKE '%dubstep%' OR
           parts[i] ILIKE '%disco%' OR
           parts[i] ILIKE '%minimal%' OR
           parts[i] ILIKE '%elektro%' OR
           parts[i] ILIKE '%hip%hop%' OR
           parts[i] ILIKE '%rap%' OR
           parts[i] ILIKE '%afro%' OR
           parts[i] ILIKE '%latin%' OR
           parts[i] ILIKE '%ambient%' OR
           parts[i] ILIKE '%experimental%' THEN
            genre_list := array_append(genre_list, parts[i]);
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT 
        genre_list,
        v_venue_type,
        v_event_format,
        v_is_free,
        v_is_nighttime,
        v_is_daytime,
        v_is_live;
END;
$$ LANGUAGE plpgsql;

-- View to see events with parsed genres
CREATE OR REPLACE VIEW event_genre_analysis AS
SELECT 
    e.id,
    e.title,
    e.venue_name,
    e.categories,
    e.genres,
    e.venue_type,
    e.event_format,
    e.is_free,
    e.is_nighttime,
    e.is_live,
    e.sold_out
FROM events e
ORDER BY e.start_date DESC;

-- Stats view for genres
CREATE OR REPLACE VIEW genre_stats AS
SELECT 
    unnest(genres) as genre,
    COUNT(*) as event_count
FROM events
WHERE array_length(genres, 1) > 0
GROUP BY genre
ORDER BY event_count DESC;

-- Update existing events to parse their categories
UPDATE events e
SET (genres, venue_type, event_format, is_free, is_nighttime, is_daytime, is_live) = (
    SELECT * FROM parse_event_categories(e.categories)
)
WHERE e.categories IS NOT NULL AND e.categories != '';
