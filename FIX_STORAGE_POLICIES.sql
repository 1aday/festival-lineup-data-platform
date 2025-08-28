-- =====================================================
-- FIX STORAGE POLICIES FOR ARTIST IMAGES
-- Run this in Supabase SQL Editor to fix RLS errors
-- =====================================================

-- First, drop any existing policies that might be conflicting
DROP POLICY IF EXISTS "Public can view artist images" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for artist images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload artist images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update artist images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete artist images" ON storage.objects;
DROP POLICY IF EXISTS "Service role full access to artist images" ON storage.objects;

-- Create new, more permissive policies

-- 1. Allow ANYONE to read/view images (true public access)
CREATE POLICY "Anyone can view artist images"
ON storage.objects FOR SELECT
USING (bucket_id = 'artist-images');

-- 2. Allow ANYONE to upload (for development - restrict later if needed)
CREATE POLICY "Anyone can upload artist images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'artist-images');

-- 3. Allow ANYONE to update (for development - restrict later if needed)
CREATE POLICY "Anyone can update artist images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'artist-images')
WITH CHECK (bucket_id = 'artist-images');

-- 4. Allow ANYONE to delete (for development - restrict later if needed)
CREATE POLICY "Anyone can delete artist images"
ON storage.objects FOR DELETE
USING (bucket_id = 'artist-images');

-- Verify the policies were created
SELECT 
  name,
  action,
  definition
FROM storage.policies
WHERE bucket_id = 'artist-images'
ORDER BY name;
