-- Enhanced ADE Scraper Database Schema with Run Tracking and Content Hashing
-- Run this after the initial schema to add the new features

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create scrape_runs table for tracking each sync operation
CREATE TABLE IF NOT EXISTS public.scrape_runs (
    id SERIAL PRIMARY KEY,
    run_id UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'running', -- running, success, error, partial
    sync_type VARCHAR(50) NOT NULL, -- artists, events, both, linking
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Date window being scraped
    from_date DATE,
    to_date DATE,
    
    -- Statistics
    total_pages_fetched INTEGER DEFAULT 0,
    total_items_processed INTEGER DEFAULT 0,
    items_created INTEGER DEFAULT 0,
    items_updated INTEGER DEFAULT 0,
    items_unchanged INTEGER DEFAULT 0,
    links_added INTEGER DEFAULT 0,
    links_removed INTEGER DEFAULT 0,
    stubs_created INTEGER DEFAULT 0, -- Artists created from event lineups
    
    -- Detailed metrics
    artists_pages INTEGER DEFAULT 0,
    events_pages INTEGER DEFAULT 0,
    event_details_fetched INTEGER DEFAULT 0,
    
    -- Error tracking
    error_count INTEGER DEFAULT 0,
    error_message TEXT,
    warnings JSONB DEFAULT '[]',
    
    -- Progress tracking
    current_step VARCHAR(100),
    progress_percent INTEGER DEFAULT 0,
    
    metadata JSONB DEFAULT '{}'
);

-- Add content_hash and run tracking to artists table
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64);
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS added_by_run UUID REFERENCES public.scrape_runs(run_id);
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS updated_by_run UUID REFERENCES public.scrape_runs(run_id);
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS is_stub BOOLEAN DEFAULT false; -- True if created from lineup without full data

-- Add content_hash and run tracking to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS added_by_run UUID REFERENCES public.scrape_runs(run_id);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS updated_by_run UUID REFERENCES public.scrape_runs(run_id);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS lineup_parsed BOOLEAN DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS lineup_html TEXT; -- Store the raw HTML for debugging

-- Enhanced artist_events table with better tracking
ALTER TABLE public.artist_events ADD COLUMN IF NOT EXISTS added_by_run UUID REFERENCES public.scrape_runs(run_id);
ALTER TABLE public.artist_events ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual'; -- lineup, manual, api
ALTER TABLE public.artist_events ADD COLUMN IF NOT EXISTS confidence DECIMAL(3,2) DEFAULT 1.0; -- Matching confidence

-- Create source_snapshots table for raw data storage
CREATE TABLE IF NOT EXISTS public.source_snapshots (
    id SERIAL PRIMARY KEY,
    run_id UUID REFERENCES public.scrape_runs(run_id),
    source_type VARCHAR(50) NOT NULL, -- artists_page, events_page, event_detail
    source_url TEXT,
    page_number INTEGER,
    external_id INTEGER, -- The ADE ID if applicable
    raw_payload JSONB,
    raw_html TEXT,
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    response_headers JSONB,
    status_code INTEGER,
    
    -- Indexing for quick lookups
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create change_logs table for detailed change tracking
CREATE TABLE IF NOT EXISTS public.change_logs (
    id SERIAL PRIMARY KEY,
    run_id UUID REFERENCES public.scrape_runs(run_id),
    entity_type VARCHAR(50) NOT NULL, -- artist, event, link
    entity_id INTEGER, -- The database ID
    external_id INTEGER, -- The ADE ID
    change_type VARCHAR(50) NOT NULL, -- created, updated, deleted, unchanged
    
    old_content_hash VARCHAR(64),
    new_content_hash VARCHAR(64),
    
    -- Store the actual changes
    old_data JSONB,
    new_data JSONB,
    diff JSONB, -- Computed diff between old and new
    
    changed_fields TEXT[], -- Array of field names that changed
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create progress_logs table for live progress updates
CREATE TABLE IF NOT EXISTS public.progress_logs (
    id SERIAL PRIMARY KEY,
    run_id UUID REFERENCES public.scrape_runs(run_id),
    log_level VARCHAR(20) DEFAULT 'info', -- debug, info, warning, error
    message TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_scrape_runs_status ON public.scrape_runs(status);
CREATE INDEX IF NOT EXISTS idx_scrape_runs_started ON public.scrape_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_artists_content_hash ON public.artists(content_hash);
CREATE INDEX IF NOT EXISTS idx_events_content_hash ON public.events(content_hash);
CREATE INDEX IF NOT EXISTS idx_source_snapshots_run ON public.source_snapshots(run_id);
CREATE INDEX IF NOT EXISTS idx_source_snapshots_external ON public.source_snapshots(external_id);
CREATE INDEX IF NOT EXISTS idx_change_logs_run ON public.change_logs(run_id);
CREATE INDEX IF NOT EXISTS idx_change_logs_entity ON public.change_logs(entity_type, external_id);
CREATE INDEX IF NOT EXISTS idx_progress_logs_run ON public.progress_logs(run_id, created_at);
CREATE INDEX IF NOT EXISTS idx_artist_events_artist ON public.artist_events(artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_events_event ON public.artist_events(event_id);

-- Disable RLS for development (enable in production with proper policies)
ALTER TABLE IF EXISTS public.scrape_runs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.source_snapshots DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.change_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.progress_logs DISABLE ROW LEVEL SECURITY;

-- Create views for easier querying
CREATE OR REPLACE VIEW public.run_statistics AS
SELECT 
    r.id,
    r.run_id,
    r.status,
    r.sync_type,
    r.started_at,
    r.completed_at,
    r.completed_at - r.started_at as duration,
    r.total_items_processed,
    r.items_created,
    r.items_updated,
    r.items_unchanged,
    r.links_added,
    r.error_count,
    r.progress_percent,
    (
        SELECT COUNT(*) 
        FROM progress_logs 
        WHERE progress_logs.run_id = r.run_id
    ) as log_count
FROM scrape_runs r
ORDER BY r.started_at DESC;

-- Function to compute content hash for an artist
CREATE OR REPLACE FUNCTION compute_artist_hash(
    p_title TEXT,
    p_subtitle TEXT,
    p_country_label TEXT,
    p_country_value TEXT,
    p_url TEXT,
    p_image_url TEXT
) RETURNS VARCHAR AS $$
BEGIN
    RETURN encode(
        digest(
            COALESCE(p_title, '') || '|' ||
            COALESCE(p_subtitle, '') || '|' ||
            COALESCE(p_country_label, '') || '|' ||
            COALESCE(p_country_value, '') || '|' ||
            COALESCE(p_url, '') || '|' ||
            COALESCE(p_image_url, ''),
            'sha256'
        ),
        'hex'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to compute content hash for an event
CREATE OR REPLACE FUNCTION compute_event_hash(
    p_title TEXT,
    p_subtitle TEXT,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE,
    p_venue_name TEXT,
    p_categories TEXT,
    p_url TEXT,
    p_sold_out BOOLEAN
) RETURNS VARCHAR AS $$
BEGIN
    RETURN encode(
        digest(
            COALESCE(p_title, '') || '|' ||
            COALESCE(p_subtitle, '') || '|' ||
            COALESCE(p_start_date::TEXT, '') || '|' ||
            COALESCE(p_end_date::TEXT, '') || '|' ||
            COALESCE(p_venue_name, '') || '|' ||
            COALESCE(p_categories, '') || '|' ||
            COALESCE(p_url, '') || '|' ||
            COALESCE(p_sold_out::TEXT, ''),
            'sha256'
        ),
        'hex'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get recent run summary
CREATE OR REPLACE FUNCTION get_recent_runs(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    run_id UUID,
    status VARCHAR,
    sync_type VARCHAR,
    started_at TIMESTAMP WITH TIME ZONE,
    duration INTERVAL,
    total_processed INTEGER,
    created INTEGER,
    updated INTEGER,
    links_added INTEGER,
    error_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.run_id,
        r.status,
        r.sync_type,
        r.started_at,
        r.completed_at - r.started_at,
        r.total_items_processed,
        r.items_created,
        r.items_updated,
        r.links_added,
        r.error_count
    FROM scrape_runs r
    ORDER BY r.started_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
