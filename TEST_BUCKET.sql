-- TEST IF BUCKET EXISTS
-- Run this after creating the bucket to verify it works

SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
WHERE name = 'artist-images';
