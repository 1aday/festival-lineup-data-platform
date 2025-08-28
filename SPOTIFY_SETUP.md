# Artist Studio - Spotify Enrichment Setup

## Quick Setup

To enable Spotify enrichment in the Artist Studio page, you need to:

1. **Add Database Columns** - Run the SQL script in your Supabase dashboard
2. **Ensure Spotify API Credentials** - Already added to your `.env.local`

## Step 1: Add Database Columns

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/spotify-columns.sql`
4. Click **Run** to execute the SQL

This will add the following columns to your `artists` table:
- `spotify_id` - Spotify artist ID
- `spotify_url` - Link to Spotify artist page
- `genres` - Array of music genres
- `popularity` - Spotify popularity score (0-100)
- `followers` - Number of Spotify followers
- `spotify_image` - Artist image from Spotify
- `enriched_at` - Timestamp when enriched
- `spotify_data` - Full JSON response from Spotify

## Step 2: Using Artist Studio

1. Visit `/artist-studio` in your app
2. You'll see a table with all your artists
3. Click **"Enrich"** on any artist to fetch Spotify data
4. Or select multiple artists and click **"Enrich Selected"**

## Features

- **Yellow/Black Theme** - Matches the scraper page aesthetic
- **Batch Processing** - Enrich multiple artists at once
- **Search & Filter** - Find specific artists quickly
- **Sorting** - Sort by name, popularity, followers
- **Status Tracking** - See which artists are enriched
- **Direct Spotify Links** - Open artist pages on Spotify

## Statistics Shown

- Total Artists
- Enriched Count
- Artists with Spotify IDs
- Artists with Genres

## Troubleshooting

If enrichment fails:
1. Check that Spotify credentials are in `.env.local`
2. Ensure the database columns exist (run the SQL)
3. Check browser console for errors

The API will gracefully handle missing columns and still return enrichment data even if database updates fail.
