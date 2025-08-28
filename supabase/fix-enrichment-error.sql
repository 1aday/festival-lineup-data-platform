-- Quick Fix for Spotify Enrichment Database Error
-- Run this in your Supabase SQL Editor to fix the "preview_available column" error

-- Add the missing preview columns that are causing the enrichment to fail
ALTER TABLE artists
ADD COLUMN IF NOT EXISTS preview_available BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS preview_length_sec INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS preview_start_sec INTEGER DEFAULT 0;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'artists'
AND column_name IN ('preview_available', 'preview_length_sec', 'preview_start_sec');
