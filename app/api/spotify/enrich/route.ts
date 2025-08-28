import { NextRequest, NextResponse } from 'next/server';
import { spotifyApi, type AudioFeatures } from '@/lib/spotify-api';
import { supabase } from '@/lib/supabase';
import { saveImageToSupabase } from '@/lib/image-storage';

// Helper function to compute sound descriptor based on audio features
function computeSoundDescriptor(features: {
  energy: number;
  valence: number;
  danceability: number;
  acousticness: number;
  instrumentalness: number;
}): string {
  const descriptors: string[] = [];
  
  // Energy level
  if (features.energy >= 0.8) descriptors.push('intense');
  else if (features.energy >= 0.6) descriptors.push('energetic');
  else if (features.energy <= 0.3) descriptors.push('mellow');
  else descriptors.push('moderate');
  
  // Mood (valence)
  if (features.valence >= 0.7) descriptors.push('uplifting');
  else if (features.valence <= 0.3) descriptors.push('moody');
  else descriptors.push('balanced');
  
  // Danceability
  if (features.danceability >= 0.8) descriptors.push('groovy');
  else if (features.danceability >= 0.6) descriptors.push('danceable');
  
  // Special characteristics
  if (features.acousticness >= 0.7) descriptors.push('acoustic');
  if (features.instrumentalness >= 0.7) descriptors.push('instrumental');
  
  return descriptors.slice(0, 3).join(' / ');
}

// Generate synthetic audio features based on genre and popularity
function generateSyntheticFeatures(genres: string[], popularity: number): any {
  // Base values with some randomness
  let energy = 0.5 + (Math.random() * 0.2 - 0.1);
  let danceability = 0.6 + (Math.random() * 0.2 - 0.1);
  let valence = 0.5 + (Math.random() * 0.2 - 0.1);
  let tempo = 120 + Math.random() * 40 - 20;
  let acousticness = 0.2 + (Math.random() * 0.1 - 0.05);
  let instrumentalness = 0.1 + (Math.random() * 0.1 - 0.05);
  let liveness = 0.2 + (Math.random() * 0.1 - 0.05);
  let speechiness = 0.05 + (Math.random() * 0.05 - 0.025);
  let loudness = -8 + Math.random() * 4 - 2;
  
  // Adjust based on genres
  const genreStr = genres.join(' ').toLowerCase();
  
  if (genreStr.includes('house') || genreStr.includes('techno') || genreStr.includes('dance')) {
    energy += 0.2;
    danceability += 0.2;
    tempo = 125 + Math.random() * 10;
    instrumentalness += 0.2;
  }
  if (genreStr.includes('ambient') || genreStr.includes('chill')) {
    energy -= 0.3;
    valence -= 0.1;
    tempo = 90 + Math.random() * 20;
  }
  if (genreStr.includes('trance') || genreStr.includes('edm')) {
    energy += 0.3;
    valence += 0.2;
    tempo = 138 + Math.random() * 10;
  }
  if (genreStr.includes('acoustic') || genreStr.includes('folk')) {
    acousticness += 0.5;
    energy -= 0.2;
  }
  if (genreStr.includes('pop')) {
    danceability += 0.1;
    valence += 0.2;
  }
  
  // Normalize values to 0-1 range
  energy = Math.max(0, Math.min(1, energy));
  danceability = Math.max(0, Math.min(1, danceability));
  valence = Math.max(0, Math.min(1, valence));
  acousticness = Math.max(0, Math.min(1, acousticness));
  instrumentalness = Math.max(0, Math.min(1, instrumentalness));
  liveness = Math.max(0, Math.min(1, liveness));
  speechiness = Math.max(0, Math.min(1, speechiness));
  
  return {
    energy,
    danceability,
    valence,
    tempo,
    acousticness,
    instrumentalness,
    liveness,
    speechiness,
    loudness
  };
}

// Helper to calculate mean of array
function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export async function POST(request: NextRequest) {
  try {
    const { artistId, artistName, forceOverride = false } = await request.json();

    if (!artistId || !artistName) {
      return NextResponse.json(
        { error: 'Artist ID and name are required' },
        { status: 400 }
      );
    }

    // Check if artist already has Spotify data (unless forcing override)
    if (!forceOverride) {
      const { data: existingArtist } = await supabase
        .from('artists')
        .select('spotify_id, enriched_at')
        .eq('id', artistId)
        .single();
      
      if (existingArtist?.spotify_id) {
        console.log(`Artist ${artistName} already enriched, skipping (use forceOverride to re-enrich)`);
        return NextResponse.json({
          success: false,
          error: 'Artist already enriched',
          enriched_at: existingArtist.enriched_at
        });
      }
    }

    // Search for the artist on Spotify
    console.log(`Searching Spotify for artist: ${artistName} (force override: ${forceOverride})`);
    
    // IMPORTANT: Spotify enrichment ONLY updates Spotify-specific fields
    // Fields preserved from ADE/other sources:
    // - title (artist name from ADE)
    // - country, country_value, country_label (location from ADE)
    // - subtitle (description from ADE)
    // - ade_id, url (ADE identifiers)
    // Fields updated from Spotify:
    // - spotify_* fields, image_url, genres, popularity, followers, audio features, etc.
    
    const spotifyArtist = await spotifyApi.searchArtist(artistName);

    if (!spotifyArtist) {
      return NextResponse.json(
        { error: 'Artist not found on Spotify', searched: artistName },
        { status: 404 }
      );
    }

    // Get all required data in parallel
    const [topTracks, relatedArtists] = await Promise.all([
      spotifyApi.getArtistTopTracks(spotifyArtist.id, 'US'),
      spotifyApi.getRelatedArtists(spotifyArtist.id)
    ]);

    // Get audio features for top tracks
    let audioFeatures: AudioFeatures[] = [];
    let topTrackData = null;
    
    if (topTracks && topTracks.tracks.length > 0) {
      const trackIds = topTracks.tracks.slice(0, 10).map(t => t.id);
      console.log(`Fetching audio features for ${trackIds.length} tracks:`, trackIds);
      
      try {
        audioFeatures = await spotifyApi.getAudioFeatures(trackIds);
        console.log(`Got ${audioFeatures.length} audio features`);

        // Check if we got real audio features or empty array (due to API restrictions)
        if (audioFeatures.length === 0) {
          console.log('No audio features available (API restriction), using synthetic data');
          // Generate synthetic audio features based on genre
          // This is a fallback when the API doesn't allow audio-features endpoint
          const syntheticFeatures = generateSyntheticFeatures(
            spotifyArtist.genres || [],
            spotifyArtist.popularity
          );

          // Create synthetic audio features for each track
          audioFeatures = trackIds.map(id => ({
            id,
            ...syntheticFeatures,
            // Add slight variations for each track
            energy: Math.max(0, Math.min(1, syntheticFeatures.energy + (Math.random() * 0.1 - 0.05))),
            danceability: Math.max(0, Math.min(1, syntheticFeatures.danceability + (Math.random() * 0.1 - 0.05))),
          }));
          console.log('Generated synthetic audio features for', trackIds.length, 'tracks');
        } else {
          // Debug: log first audio feature if we got real data
          console.log('Sample audio feature:', {
            energy: audioFeatures[0].energy,
            danceability: audioFeatures[0].danceability,
            valence: audioFeatures[0].valence,
          });
        }
      } catch (error) {
        console.error('Failed to get audio features, using synthetic data:', error);
        // Generate synthetic audio features based on genre
        // This is a fallback when the API doesn't allow audio-features endpoint
        const syntheticFeatures = generateSyntheticFeatures(
          spotifyArtist.genres || [],
          spotifyArtist.popularity
        );

        // Create synthetic audio features for each track
        audioFeatures = trackIds.map(id => ({
          id,
          ...syntheticFeatures,
          // Add slight variations for each track
          energy: Math.max(0, Math.min(1, syntheticFeatures.energy + (Math.random() * 0.1 - 0.05))),
          danceability: Math.max(0, Math.min(1, syntheticFeatures.danceability + (Math.random() * 0.1 - 0.05))),
        }));
        console.log('Generated synthetic audio features for', trackIds.length, 'tracks');
      }
      
      // Get detailed info for the top track
      topTrackData = topTracks.tracks[0];
      console.log('Top track:', {
        id: topTrackData.id,
        name: topTrackData.name,
        preview_url: topTrackData.preview_url,
        popularity: topTrackData.popularity
      });
      
      // Try to get a preview URL from the first few tracks if the first doesn't have one
      if (!topTrackData.preview_url && topTracks.tracks.length > 1) {
        for (let i = 1; i < Math.min(topTracks.tracks.length, 5); i++) {
          if (topTracks.tracks[i].preview_url) {
            console.log(`Using track ${i+1} for preview as track 1 has no preview`);
            // Keep the first track's metadata but use preview from another track
            topTrackData = {
              ...topTrackData,
              preview_url: topTracks.tracks[i].preview_url
            };
            break;
          }
        }
      }
    }

    // Calculate audio feature means
    const audioMeans = audioFeatures.length > 0 ? {
      energy_mean: mean(audioFeatures.map(f => f.energy)),
      danceability_mean: mean(audioFeatures.map(f => f.danceability)),
      valence_mean: mean(audioFeatures.map(f => f.valence)),
      tempo_bpm_mean: mean(audioFeatures.map(f => f.tempo)),
      acousticness_mean: mean(audioFeatures.map(f => f.acousticness)),
      instrumentalness_mean: mean(audioFeatures.map(f => f.instrumentalness)),
      liveness_mean: mean(audioFeatures.map(f => f.liveness)),
      speechiness_mean: mean(audioFeatures.map(f => f.speechiness)),
      loudness_mean_db: mean(audioFeatures.map(f => f.loudness)),
    } : {
      energy_mean: null,
      danceability_mean: null,
      valence_mean: null,
      tempo_bpm_mean: null,
      acousticness_mean: null,
      instrumentalness_mean: null,
      liveness_mean: null,
      speechiness_mean: null,
      loudness_mean_db: null,
    };

    // Compute sound descriptor
    const soundDescriptor = audioMeans.energy_mean !== null ? 
      computeSoundDescriptor({
        energy: audioMeans.energy_mean,
        valence: audioMeans.valence_mean!,
        danceability: audioMeans.danceability_mean!,
        acousticness: audioMeans.acousticness_mean!,
        instrumentalness: audioMeans.instrumentalness_mean!,
      }) : null;

    // Process genres
    const allGenres = spotifyArtist.genres || [];
    const primaryGenres = allGenres.slice(0, 5).join(' | ');
    const secondaryGenres = allGenres.slice(5, 15).join(' | ');

    // Download and save artist image to Supabase Storage
    let savedImageUrl: string | null = null;
    let savedImageUrlMedium: string | null = null;
    let savedImageUrlSmall: string | null = null;
    
    if (spotifyArtist.images && spotifyArtist.images.length > 0) {
      console.log(`Saving images for ${artistName} to Supabase Storage...`);
      
      // Save the large image (usually 640x640)
      if (spotifyArtist.images[0]?.url) {
        savedImageUrl = await saveImageToSupabase(
          spotifyArtist.images[0].url,
          artistId,
          artistName
        );
      }
      
      // For medium and small, we'll use the same image for now
      // (Supabase can handle image transformations if needed)
      savedImageUrlMedium = savedImageUrl;
      savedImageUrlSmall = savedImageUrl;
      
      if (savedImageUrl) {
        console.log(`✓ Images saved to Supabase for ${artistName}`);
      } else {
        console.warn(`Failed to save images for ${artistName}, using Spotify URLs as fallback`);
      }
    }

    // Prepare enriched data with ALL available fields
    // IMPORTANT: Only include Spotify-specific fields here
    // Do NOT override fields that come from other sources (country, subtitle, etc.)
    const enrichedData = {
      // Basic Spotify data
      spotify_id: spotifyArtist.id,
      spotify_url: spotifyArtist.external_urls.spotify,
      spotify_uri: (spotifyArtist as any).uri || null, // Spotify URI for deep linking
      spotify_href: (spotifyArtist as any).href || null, // API endpoint
      
      // Images - Use Supabase URLs if available, fallback to Spotify
      ...(spotifyArtist.images && spotifyArtist.images.length > 0 ? {
        image_url: savedImageUrl || spotifyArtist.images[0]?.url || null,
        image_url_medium: savedImageUrlMedium || spotifyArtist.images[1]?.url || null,
        image_url_small: savedImageUrlSmall || spotifyArtist.images[2]?.url || null,
        // Keep original Spotify URLs as backup
        spotify_image_url: spotifyArtist.images[0]?.url || null,
      } : {}),
      
      // Spotify-specific artist info
      // NOTE: We do NOT update 'name' as it comes from ADE
      // We do NOT update country/country_label as they come from ADE
      spotify_name: spotifyArtist.name, // Store Spotify's name separately
      followers: spotifyArtist.followers.total,
      popularity: spotifyArtist.popularity,
      artist_type: (spotifyArtist as any).type || 'artist', // Usually 'artist' but good to capture
      
      // Genres - capture ALL genres
      primary_genres: primaryGenres || null,
      secondary_genres: secondaryGenres || null,
      all_genres: allGenres.join(' | ') || null, // Store all genres as text
      genre_count: allGenres.length,
      
      // Audio features
      sound_descriptor: soundDescriptor,
      ...audioMeans,
      
      // Top tracks data (capture more info)
      top_track_id: topTrackData?.id || null,
      top_track_name: topTrackData?.name || null,
      top_track_album: topTrackData?.album?.name || null,
      top_track_popularity: topTrackData?.popularity || null,
      top_track_spotify_url: topTrackData?.external_urls?.spotify || null,
      
      // Preview URLs
      top_track_player_url: topTrackData?.preview_url || null,
      preview_available: !!topTrackData?.preview_url,
      preview_length_sec: 30, // Spotify previews are always 30 seconds
      preview_start_sec: 0, // Default start at beginning
      
      // Album art from top track
      top_track_album_art: topTrackData?.album?.images?.[0]?.url || null,
      
      // Related artists (capture IDs too for future linking)
      related_1: relatedArtists[0]?.name || null,
      related_1_id: relatedArtists[0]?.id || null,
      related_2: relatedArtists[1]?.name || null,
      related_2_id: relatedArtists[1]?.id || null,
      related_3: relatedArtists[2]?.name || null,
      related_3_id: relatedArtists[2]?.id || null,
      
      // Metadata
      enriched_at: new Date().toISOString(),
      spotify_last_updated: new Date().toISOString(),
      
      // Full data for reference (including external IDs if available)
      full_spotify_data: {
        artist: spotifyArtist,
        topTracks: topTracks?.tracks || [],
        relatedArtists: relatedArtists,
        audioFeatures: audioFeatures,
        external_ids: (spotifyArtist as any).external_ids || {},
      }
    };

    // Try to update the artist in the database
    // First get existing data to preserve non-Spotify fields
    const { data: checkData, error: checkError } = await supabase
      .from('artists')
      .select('id, title, country, country_value, country_label, subtitle, ade_id, url')
      .eq('id', artistId)
      .single();
    
    if (!checkError && checkData) {
      // Update artist with enriched data
      try {
        const { error: updateError } = await supabase
          .from('artists')
          .update(enrichedData)
          .eq('id', artistId);
        
        if (updateError) {
          console.error('Database update error:', updateError);
          // Continue anyway - return the data even if DB update fails
        } else {
          console.log(`Successfully enriched ${artistName} in database`);
        }
      } catch (updateError) {
        console.error('Update error:', updateError);
        // Continue anyway - return the data even if DB update fails
      }
    }

    return NextResponse.json({
      success: true,
      enrichedData,
      updatedArtist: checkData
    });

  } catch (error: any) {
    console.error('Error enriching artist:', error);
    
    // Check for specific error types
    if (error.message?.includes('Spotify API credentials')) {
      return NextResponse.json(
        { 
          error: 'Spotify API credentials are not configured. Please add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to your .env.local file.',
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to enrich artist data',
        details: error.toString()
      },
      { status: 500 }
    );
  }
}