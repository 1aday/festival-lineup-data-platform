# 🎵 Comprehensive Spotify Enrichment Guide

## ✅ Database Setup

Run the SQL in `supabase/spotify-full-schema.sql` to add all the comprehensive columns. This SQL:
- Uses `ADD COLUMN IF NOT EXISTS` to safely handle existing columns
- Drops old conflicting columns (`genres`, `spotify_image`, `spotify_data`)
- Creates performance indexes

## 📊 Data Points Collected

### Basic Artist Info
- **image_url** - Artist profile image from Spotify
- **name** - Official Spotify artist name
- **followers** - Total follower count
- **popularity** - Spotify popularity score (0-100)

### Genre Classification
- **primary_genres** - First 3-5 genres joined with `|`
- **secondary_genres** - Next up to 10 genres joined with `|`

### Audio Features (Averaged from Top Tracks)
- **sound_descriptor** - Computed description like "intense / moody / danceable"
- **energy_mean** - Energy level (0.0-1.0)
- **danceability_mean** - How suitable for dancing (0.0-1.0)
- **valence_mean** - Musical positivity (0.0-1.0)
- **tempo_bpm_mean** - Average BPM
- **acousticness_mean** - Acoustic confidence (0.0-1.0)
- **instrumentalness_mean** - Vocal presence (0.0-1.0)
- **liveness_mean** - Live audience presence (0.0-1.0)
- **speechiness_mean** - Spoken words detection (0.0-1.0)
- **loudness_mean_db** - Average loudness in decibels

### Top Track Information
- **top_track_id** - Spotify ID of most popular track
- **top_track_name** - Name of most popular track
- **top_track_popularity** - Popularity score of top track
- **top_track_player_url** - Preview URL or embed link

### Related Artists
- **related_1** - First related artist name
- **related_2** - Second related artist name
- **related_3** - Third related artist name

### Metadata
- **enriched_at** - Timestamp when enriched
- **full_spotify_data** - Complete JSON response for reference

## 🎨 Sound Descriptor Algorithm

The system computes descriptive tags based on audio features:

**Energy Levels:**
- ≥ 0.8: "intense"
- ≥ 0.6: "energetic"  
- ≤ 0.3: "mellow"
- Otherwise: "moderate"

**Mood (Valence):**
- ≥ 0.7: "uplifting"
- ≤ 0.3: "moody"
- Otherwise: "balanced"

**Additional Tags:**
- ≥ 0.8 danceability: "groovy"
- ≥ 0.6 danceability: "danceable"
- ≥ 0.7 acousticness: "acoustic"
- ≥ 0.7 instrumentalness: "instrumental"

## 🖥️ Artist Studio Features

### Table Columns
- Artist image thumbnail
- Name (with Spotify name if different)
- Followers count with formatting
- Popularity with visual bar
- Genres with hover tooltip for full list
- Sound descriptor badge
- Energy, Danceability, Valence percentages
- BPM (tempo)
- Top track with play button
- Related artists with tooltip
- Enrichment status
- Action buttons (Enrich/Spotify link)

### Statistics Cards
- Total Artists
- Enriched Count (with percentage)
- Artists with Spotify IDs
- Artists with Genres
- Artists with Audio Features

### Visual Indicators
- 🟨 Yellow theme throughout
- ✅ Green for enriched artists
- ⚡ Yellow for pending enrichment
- 📊 Progress bars for popularity
- 🎵 Icons for different metrics

## 📝 Column Visibility

Some columns are hidden by default to reduce clutter:
- `subtitle`
- `secondary_genres`
- `acousticness_mean`
- `instrumentalness_mean`  
- `liveness_mean`
- `speechiness_mean`
- `loudness_mean_db`
- `related_2`
- `related_3`

You can toggle column visibility in the table settings.

## 🔄 Usage

1. **Individual Enrichment**: Click "Enrich" button on any artist row
2. **Batch Enrichment**: Select multiple artists with checkboxes, click "Enrich Selected"
3. **View Details**: Hover over genres, related artists for full information
4. **Play Tracks**: Click play button to preview/embed top track
5. **Open in Spotify**: Click external link to view on Spotify

## 🚀 Performance

- Enrichment fetches data from multiple Spotify endpoints:
  - Artist details
  - Top tracks (up to 10)
  - Audio features for tracks
  - Related artists
- All data is fetched in parallel for speed
- Database updates continue even if columns are missing
- 1-second delay between batch enrichments to avoid rate limits

## 🎯 Next Steps

After enriching artists, you can:
- Filter by sound descriptors
- Sort by audio features
- Find similar artists using related artists data
- Analyze genre distributions
- Create playlists based on energy/mood
- Export data for further analysis
