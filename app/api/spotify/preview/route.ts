import { NextRequest, NextResponse } from 'next/server';
import { spotifyApi } from '@/lib/spotify-api';

// Cached preview URLs to avoid hitting rate limits
const previewCache = new Map<string, { url: string | null; expires: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const artistName = searchParams.get('artist');
    const trackId = searchParams.get('trackId');
    
    if (!artistName && !trackId) {
      return NextResponse.json(
        { error: 'Either artist name or track ID is required' },
        { status: 400 }
      );
    }
    
    // Check cache first
    const cacheKey = trackId || artistName || '';
    const cached = previewCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      console.log('Returning cached preview URL for:', cacheKey);
      return NextResponse.json({
        success: true,
        cached: true,
        previewUrl: cached.url,
      });
    }
    
    let previewUrl: string | null = null;
    let trackData: any = null;
    
    try {
      if (trackId) {
        // Get specific track
        const track = await spotifyApi.getTrack(trackId);
        if (track) {
          previewUrl = track.preview_url;
          trackData = {
            id: track.id,
            name: track.name,
            popularity: track.popularity,
            previewUrl: track.preview_url,
          };
        }
      } else if (artistName) {
        // Search for artist and get top track
        const artist = await spotifyApi.searchArtist(artistName);
        if (artist) {
          const topTracks = await spotifyApi.getArtistTopTracks(artist.id, 'US');
          
          // Find first track with a preview URL
          if (topTracks && topTracks.tracks) {
            for (const track of topTracks.tracks) {
              if (track.preview_url) {
                previewUrl = track.preview_url;
                trackData = {
                  id: track.id,
                  name: track.name,
                  popularity: track.popularity,
                  previewUrl: track.preview_url,
                };
                break;
              }
            }
          }
        }
      }
      
      // Cache the result
      previewCache.set(cacheKey, {
        url: previewUrl,
        expires: Date.now() + CACHE_DURATION,
      });
      
      // Clean old cache entries
      if (previewCache.size > 1000) {
        const now = Date.now();
        Array.from(previewCache.entries()).forEach(([key, value]) => {
          if (value.expires < now) {
            previewCache.delete(key);
          }
        });
      }
      
      return NextResponse.json({
        success: true,
        cached: false,
        previewUrl,
        trackData,
      });
      
    } catch (apiError: any) {
      console.error('Spotify API error:', apiError);
      
      // If we get rate limited, return cached data even if expired
      if (apiError.message?.includes('429') || apiError.message?.includes('rate')) {
        const expiredCache = previewCache.get(cacheKey);
        if (expiredCache) {
          console.log('Rate limited - returning expired cache for:', cacheKey);
          return NextResponse.json({
            success: true,
            cached: true,
            rateLimited: true,
            previewUrl: expiredCache.url,
          });
        }
      }
      
      throw apiError;
    }
    
  } catch (error: any) {
    console.error('Error getting preview URL:', error);
    
    // Return a graceful error response
    return NextResponse.json(
      { 
        error: error.message || 'Failed to get preview URL',
        rateLimited: error.message?.includes('429') || error.message?.includes('rate'),
      },
      { status: error.message?.includes('429') ? 429 : 500 }
    );
  }
}

// POST endpoint to pre-cache multiple preview URLs
export async function POST(request: NextRequest) {
  try {
    const { artistNames } = await request.json();
    
    if (!artistNames || !Array.isArray(artistNames)) {
      return NextResponse.json(
        { error: 'Artist names array is required' },
        { status: 400 }
      );
    }
    
    const results = [];
    const batchSize = 5; // Process 5 at a time to avoid rate limits
    
    for (let i = 0; i < artistNames.length; i += batchSize) {
      const batch = artistNames.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (artistName: string) => {
        try {
          // Check if already cached
          const cached = previewCache.get(artistName);
          if (cached && cached.expires > Date.now()) {
            return { artist: artistName, cached: true, previewUrl: cached.url };
          }
          
          // Fetch from API
          const artist = await spotifyApi.searchArtist(artistName);
          if (!artist) {
            return { artist: artistName, error: 'Artist not found' };
          }
          
          const topTracks = await spotifyApi.getArtistTopTracks(artist.id, 'US');
          let previewUrl = null;
          
          if (topTracks && topTracks.tracks) {
            for (const track of topTracks.tracks) {
              if (track.preview_url) {
                previewUrl = track.preview_url;
                break;
              }
            }
          }
          
          // Cache the result
          previewCache.set(artistName, {
            url: previewUrl,
            expires: Date.now() + CACHE_DURATION,
          });
          
          return { artist: artistName, cached: false, previewUrl };
        } catch (error: any) {
          return { artist: artistName, error: error.message };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Add delay between batches to avoid rate limits
      if (i + batchSize < artistNames.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return NextResponse.json({
      success: true,
      results,
      cached: results.filter(r => r.cached).length,
      fetched: results.filter(r => !r.cached && !r.error).length,
      errors: results.filter(r => r.error).length,
    });
    
  } catch (error: any) {
    console.error('Error pre-caching preview URLs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to pre-cache preview URLs' },
      { status: 500 }
    );
  }
}
