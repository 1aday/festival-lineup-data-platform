-- Fix events table by adding missing columns
-- Run this if you get errors inserting events

-- Add missing columns to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS categories TEXT,
ADD COLUMN IF NOT EXISTS sold_out BOOLEAN DEFAULT false;

-- If you want to drop and recreate the table (WARNING: This will delete all existing events!)
-- DROP TABLE IF EXISTS public.events CASCADE;
-- Then run the CREATE TABLE from schema.sql

-- Verify the columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'events'
ORDER BY ordinal_position;

