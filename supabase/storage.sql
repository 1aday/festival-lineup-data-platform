-- Create the artist-images storage bucket
-- Run this in the Supabase SQL Editor

-- Insert bucket (requires admin permissions)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'artist-images',
  'artist-images', 
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the bucket
-- Allow public read access
CREATE POLICY "Public read access for artist images"
ON storage.objects FOR SELECT
USING (bucket_id = 'artist-images');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload artist images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'artist-images' AND auth.role() = 'authenticated');

-- Allow service role to do everything
CREATE POLICY "Service role full access to artist images"
ON storage.objects FOR ALL
USING (bucket_id = 'artist-images' AND auth.role() = 'service_role');
