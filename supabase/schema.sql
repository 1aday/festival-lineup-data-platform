-- ADE Scraper Database Schema
-- Run this SQL in your Supabase SQL editor to create all necessary tables

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create artists table
CREATE TABLE IF NOT EXISTS public.artists (
    id SERIAL PRIMARY KEY,
    ade_id INTEGER UNIQUE NOT NULL,
    handle VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    subtitle TEXT,
    url TEXT,
    country_label VARCHAR(255),
    country_value VARCHAR(10),
    image_title TEXT,
    image_url TEXT,
    first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    raw_data JSONB
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_artists_ade_id ON public.artists(ade_id);
CREATE INDEX IF NOT EXISTS idx_artists_country ON public.artists(country_value);
CREATE INDEX IF NOT EXISTS idx_artists_first_seen ON public.artists(first_seen_at);
CREATE INDEX IF NOT EXISTS idx_artists_title ON public.artists(title);

-- Create sync history table
CREATE TABLE IF NOT EXISTS public.sync_history (
    id SERIAL PRIMARY KEY,
    sync_type VARCHAR(50) NOT NULL, -- 'artists', 'events', etc.
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    total_items_fetched INTEGER DEFAULT 0,
    new_items_added INTEGER DEFAULT 0,
    items_updated INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'in_progress', -- 'in_progress', 'completed', 'failed'
    error_message TEXT,
    metadata JSONB
);

-- Create artist changes history table
CREATE TABLE IF NOT EXISTS public.artist_changes (
    id SERIAL PRIMARY KEY,
    artist_id INTEGER REFERENCES public.artists(id) ON DELETE CASCADE,
    change_type VARCHAR(50) NOT NULL, -- 'added', 'updated', 'deactivated', 'reactivated'
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    previous_data JSONB,
    new_data JSONB
);

-- Create events table for future use
CREATE TABLE IF NOT EXISTS public.events (
    id SERIAL PRIMARY KEY,
    ade_id INTEGER UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    subtitle TEXT,
    url TEXT,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    venue_name VARCHAR(255),
    venue_address TEXT,
    event_type VARCHAR(100),
    categories TEXT,
    sold_out BOOLEAN DEFAULT false,
    first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    raw_data JSONB
);

-- Create artist_events junction table
CREATE TABLE IF NOT EXISTS public.artist_events (
    id SERIAL PRIMARY KEY,
    artist_id INTEGER REFERENCES public.artists(id) ON DELETE CASCADE,
    event_id INTEGER REFERENCES public.events(id) ON DELETE CASCADE,
    role VARCHAR(100), -- 'performer', 'speaker', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(artist_id, event_id)
);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to artists" ON public.artists;
DROP POLICY IF EXISTS "Allow public read access to sync_history" ON public.sync_history;
DROP POLICY IF EXISTS "Allow public read access to events" ON public.events;

-- Create policies for public read access
-- You can modify these based on your authentication needs
CREATE POLICY "Allow public read access to artists" 
    ON public.artists 
    FOR SELECT 
    USING (true);

CREATE POLICY "Allow public read access to sync_history" 
    ON public.sync_history 
    FOR SELECT 
    USING (true);

CREATE POLICY "Allow public read access to events" 
    ON public.events 
    FOR SELECT 
    USING (true);

-- If you want to allow authenticated users to write data, add these policies:
-- CREATE POLICY "Allow authenticated users to insert artists" 
--     ON public.artists 
--     FOR INSERT 
--     TO authenticated
--     WITH CHECK (true);

-- CREATE POLICY "Allow authenticated users to update artists" 
--     ON public.artists 
--     FOR UPDATE 
--     TO authenticated
--     USING (true);

-- Create views for easier data access
CREATE OR REPLACE VIEW public.artist_stats AS
SELECT 
    COUNT(*) as total_artists,
    COUNT(DISTINCT country_value) as unique_countries,
    COUNT(CASE WHEN DATE(first_seen_at) = CURRENT_DATE THEN 1 END) as added_today,
    MAX(last_updated_at) as last_updated
FROM public.artists
WHERE is_active = true;

-- Create a function to get new artists from the last N days
CREATE OR REPLACE FUNCTION public.get_recent_artists(days_ago INTEGER DEFAULT 7)
RETURNS TABLE (
    id INTEGER,
    ade_id INTEGER,
    title VARCHAR,
    country_label VARCHAR,
    first_seen_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.ade_id,
        a.title,
        a.country_label,
        a.first_seen_at
    FROM public.artists a
    WHERE a.first_seen_at >= NOW() - INTERVAL '1 day' * days_ago
    ORDER BY a.first_seen_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Create a function to search artists
CREATE OR REPLACE FUNCTION public.search_artists(search_term TEXT)
RETURNS TABLE (
    id INTEGER,
    ade_id INTEGER,
    title VARCHAR,
    subtitle TEXT,
    country_label VARCHAR,
    image_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.ade_id,
        a.title,
        a.subtitle,
        a.country_label,
        a.image_url
    FROM public.artists a
    WHERE 
        a.title ILIKE '%' || search_term || '%' OR
        a.subtitle ILIKE '%' || search_term || '%' OR
        a.handle ILIKE '%' || search_term || '%'
    ORDER BY 
        CASE 
            WHEN a.title ILIKE search_term THEN 1
            WHEN a.title ILIKE search_term || '%' THEN 2
            WHEN a.title ILIKE '%' || search_term || '%' THEN 3
            ELSE 4
        END,
        a.title;
END;
$$ LANGUAGE plpgsql;

-- Helpful indexes for search (using trigram for better text search)
CREATE INDEX IF NOT EXISTS idx_artists_title_trgm ON public.artists USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_artists_subtitle_trgm ON public.artists USING gin (subtitle gin_trgm_ops);
