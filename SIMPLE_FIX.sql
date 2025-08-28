-- =====================================================
-- SIMPLE FIX FOR STORAGE UPLOADS
-- Run each section separately if needed
-- =====================================================

-- SECTION 1: Drop old policies
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
DROP POLICY IF EXISTS "Allow public read artist images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public insert artist images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update artist images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete artist images" ON storage.objects;

-- SECTION 2: Create simple public access policies
CREATE POLICY "artist_images_public_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'artist-images');

CREATE POLICY "artist_images_public_insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'artist-images');

CREATE POLICY "artist_images_public_update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'artist-images')
WITH CHECK (bucket_id = 'artist-images');

CREATE POLICY "artist_images_public_delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'artist-images');

-- Done! No verification query needed
