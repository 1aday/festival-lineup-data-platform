-- Enhanced artist_events table for smart linking with confidence scores
-- This tracks how artists are connected to events with matching confidence

-- First ensure the artist_events table has all needed columns
ALTER TABLE public.artist_events 
ADD COLUMN IF NOT EXISTS confidence DECIMAL(3,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS match_details JSONB,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add index for confidence to quickly find high-confidence matches
CREATE INDEX IF NOT EXISTS idx_artist_events_confidence 
ON public.artist_events(confidence DESC);

-- Add composite index for finding specific artist-event pairs
CREATE UNIQUE INDEX IF NOT EXISTS idx_artist_events_unique 
ON public.artist_events(artist_id, event_id);

-- Create a view for easy querying of artist events with details
CREATE OR REPLACE VIEW public.artist_event_details AS
SELECT 
    ae.id as link_id,
    ae.artist_id,
    a.ade_id as artist_ade_id,
    a.title as artist_name,
    a.subtitle as artist_subtitle,
    a.country_label as artist_country,
    ae.event_id,
    e.ade_id as event_ade_id,
    e.title as event_title,
    e.subtitle as event_subtitle,
    e.start_date,
    e.end_date,
    e.venue_name,
    e.categories,
    ae.role,
    ae.confidence,
    ae.source,
    ae.match_details,
    ae.created_at as linked_at
FROM 
    public.artist_events ae
    JOIN public.artists a ON ae.artist_id = a.id
    JOIN public.events e ON ae.event_id = e.id
ORDER BY 
    e.start_date, 
    ae.confidence DESC;

-- Create a view for artists with their event counts
CREATE OR REPLACE VIEW public.artist_event_counts AS
SELECT 
    a.id,
    a.ade_id,
    a.title,
    a.country_label,
    COUNT(ae.event_id) as event_count,
    COUNT(CASE WHEN ae.confidence >= 0.9 THEN 1 END) as high_confidence_count,
    COUNT(CASE WHEN ae.confidence < 0.9 THEN 1 END) as low_confidence_count,
    ARRAY_AGG(
        DISTINCT e.venue_name 
        ORDER BY e.venue_name
    ) FILTER (WHERE e.venue_name IS NOT NULL) as venues,
    MIN(e.start_date) as first_event,
    MAX(e.end_date) as last_event
FROM 
    public.artists a
    LEFT JOIN public.artist_events ae ON a.id = ae.artist_id
    LEFT JOIN public.events e ON ae.event_id = e.id
GROUP BY 
    a.id, a.ade_id, a.title, a.country_label;

-- Create a view for events with their artist lineups
CREATE OR REPLACE VIEW public.event_lineups AS
SELECT 
    e.id,
    e.ade_id,
    e.title,
    e.start_date,
    e.end_date,
    e.venue_name,
    e.categories,
    COUNT(ae.artist_id) as artist_count,
    STRING_AGG(
        a.title, 
        ', ' 
        ORDER BY ae.confidence DESC, a.title
    ) as lineup,
    ARRAY_AGG(
        JSON_BUILD_OBJECT(
            'id', a.id,
            'ade_id', a.ade_id,
            'name', a.title,
            'confidence', ae.confidence,
            'role', ae.role
        )
        ORDER BY ae.confidence DESC, a.title
    ) as artists
FROM 
    public.events e
    LEFT JOIN public.artist_events ae ON e.id = ae.event_id
    LEFT JOIN public.artists a ON ae.artist_id = a.id
GROUP BY 
    e.id, e.ade_id, e.title, e.start_date, e.end_date, e.venue_name, e.categories;

-- Function to find potential matches for an artist
CREATE OR REPLACE FUNCTION find_artist_events(artist_name TEXT)
RETURNS TABLE(
    event_id INTEGER,
    event_title TEXT,
    event_subtitle TEXT,
    match_confidence DECIMAL,
    match_location TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.subtitle,
        CASE 
            WHEN e.title ILIKE '%' || artist_name || '%' THEN 0.95
            WHEN e.subtitle ILIKE '%' || artist_name || '%' THEN 0.85
            WHEN e.raw_data::text ILIKE '%' || artist_name || '%' THEN 0.75
            ELSE 0.5
        END as confidence,
        CASE 
            WHEN e.title ILIKE '%' || artist_name || '%' THEN 'title'
            WHEN e.subtitle ILIKE '%' || artist_name || '%' THEN 'subtitle'
            WHEN e.raw_data::text ILIKE '%' || artist_name || '%' THEN 'raw_data'
            ELSE 'unknown'
        END as location
    FROM public.events e
    WHERE 
        e.title ILIKE '%' || artist_name || '%' OR
        e.subtitle ILIKE '%' || artist_name || '%' OR
        e.raw_data::text ILIKE '%' || artist_name || '%'
    ORDER BY confidence DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for the views
GRANT SELECT ON public.artist_event_details TO anon, authenticated;
GRANT SELECT ON public.artist_event_counts TO anon, authenticated;
GRANT SELECT ON public.event_lineups TO anon, authenticated;
