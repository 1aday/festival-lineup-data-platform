-- Fix Row Level Security Policies to Allow Write Operations
-- Run this in your Supabase SQL Editor

-- Option 1: RECOMMENDED FOR DEVELOPMENT - Disable RLS temporarily
-- This allows all operations without restrictions
ALTER TABLE public.artists DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_changes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_events DISABLE ROW LEVEL SECURITY;

-- Option 2: PRODUCTION - Keep RLS enabled but allow anon users to write
-- Uncomment these if you want to keep RLS enabled

-- -- Drop existing read-only policies
-- DROP POLICY IF EXISTS "Allow public read access to artists" ON public.artists;
-- DROP POLICY IF EXISTS "Allow public read access to sync_history" ON public.sync_history;
-- DROP POLICY IF EXISTS "Allow public read access to events" ON public.events;

-- -- Create policies that allow both read and write for anon users
-- CREATE POLICY "Allow anon users full access to artists" 
--     ON public.artists 
--     FOR ALL 
--     TO anon
--     USING (true)
--     WITH CHECK (true);

-- CREATE POLICY "Allow anon users full access to sync_history" 
--     ON public.sync_history 
--     FOR ALL 
--     TO anon
--     USING (true)
--     WITH CHECK (true);

-- CREATE POLICY "Allow anon users full access to artist_changes" 
--     ON public.artist_changes 
--     FOR ALL 
--     TO anon
--     USING (true)
--     WITH CHECK (true);

-- CREATE POLICY "Allow anon users full access to events" 
--     ON public.events 
--     FOR ALL 
--     TO anon
--     USING (true)
--     WITH CHECK (true);

-- CREATE POLICY "Allow anon users full access to artist_events" 
--     ON public.artist_events 
--     FOR ALL 
--     TO anon
--     USING (true)
--     WITH CHECK (true);
