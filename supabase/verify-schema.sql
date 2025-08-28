-- Verify your current artists table schema
-- Run this to see what columns exist

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'artists'
ORDER BY ordinal_position;
