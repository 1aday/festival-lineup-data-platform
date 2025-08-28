-- =====================================================
-- FIX STORAGE RLS FOR ARTIST IMAGES
-- Run this in Supabase SQL Editor to fix upload errors
-- =====================================================

-- First, drop any existing policies that might be conflicting
DROP POLICY IF EXISTS "Public can view artist images" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for artist images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload artist images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update artist images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete artist images" ON storage.objects;
DROP POLICY IF EXISTS "Service role full access to artist images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view artist images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload artist images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update artist images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete artist images" ON storage.objects;

-- Create new, simple permissive policies for development
-- (You can restrict these later for production)

-- 1. Allow EVERYONE to view/read images
CREATE POLICY "Allow public read artist images"
ON storage.objects FOR SELECT
USING (bucket_id = 'artist-images');

-- 2. Allow EVERYONE to upload images (for dev - restrict later)
CREATE POLICY "Allow public insert artist images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'artist-images');

-- 3. Allow EVERYONE to update images (for dev - restrict later)
CREATE POLICY "Allow public update artist images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'artist-images')
WITH CHECK (bucket_id = 'artist-images');

-- 4. Allow EVERYONE to delete images (for dev - restrict later)
CREATE POLICY "Allow public delete artist images"
ON storage.objects FOR DELETE
USING (bucket_id = 'artist-images');

-- Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%artist%'
ORDER BY policyname;
