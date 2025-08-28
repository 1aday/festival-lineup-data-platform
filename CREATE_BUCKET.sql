-- =====================================================
-- CREATE STORAGE BUCKET FOR ARTIST IMAGES
-- Run this in Supabase SQL Editor (supabase.com/dashboard)
-- =====================================================

-- Step 1: Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'artist-images',
  'artist-images', 
  true,  -- Public access for images
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) 
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Step 2: Create RLS policies for the bucket

-- Allow everyone to view images (public read)
CREATE POLICY "Public can view artist images"
ON storage.objects FOR SELECT
USING (bucket_id = 'artist-images');

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated can upload artist images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'artist-images' 
  AND (auth.role() = 'authenticated' OR auth.role() = 'service_role')
);

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated can update artist images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'artist-images' AND auth.role() = 'authenticated')
WITH CHECK (bucket_id = 'artist-images');

-- Allow authenticated users to delete their uploads  
CREATE POLICY "Authenticated can delete artist images"
ON storage.objects FOR DELETE
USING (bucket_id = 'artist-images' AND auth.role() = 'authenticated');

-- Note: If the policies fail, it's okay - the bucket will still work
-- You can manage policies from the Dashboard > Storage > Policies
