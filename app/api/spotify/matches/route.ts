import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';

interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  followers: {
    total: number;
  };
  images: Array<{
    url: string;
    height: number;
    width: number;
  }>;
  external_urls: {
    spotify: string;
  };
}

interface MatchedArtist {
  id: number;
  ade_id: number;
  title: string;
  subtitle: string | null;
  country_label: string | null;
  image_url: string | null;
  spotify_id: string | null;
  spotify_url: string | null;
  matchReason: 'liked' | 'followed' | 'top_artist' | 'recently_played';
  spotifyData?: SpotifyArtist;
  events: any[];
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('spotify_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user's Spotify data
    const [likedArtists, followedArtists, topArtists, recentlyPlayedArtists] = await Promise.all([
      getUserLikedArtists(accessToken),
      getUserFollowedArtists(accessToken),
      getUserTopArtists(accessToken),
      getUserRecentlyPlayedArtists(accessToken)
    ]);

    // Combine all artist IDs
    const allSpotifyIds = new Set([
      ...likedArtists.map(a => a.id),
      ...followedArtists.map(a => a.id),
      ...topArtists.map(a => a.id),
      ...recentlyPlayedArtists.map(a => a.id)
    ]);

    console.log(`Found ${allSpotifyIds.size} unique Spotify artist IDs to match`);

    // Prepare source (Spotify collected) counts and thumbnails
    const sourceCounts = {
      liked: likedArtists.length,
      followed: followedArtists.length,
      top: topArtists.length,
      recent: recentlyPlayedArtists.length,
      unique: allSpotifyIds.size,
    };

    // Collect Spotify thumbnails (dedup by artist id), prefer medium image
    const spotifyThumbs: string[] = [];
    const seenSpotifyIds = new Set<string>();
    const pushThumbs = (arr: SpotifyArtist[]) => {
      for (const a of arr) {
        if (seenSpotifyIds.has(a.id)) continue;
        seenSpotifyIds.add(a.id);
        const pick = (a.images || []).sort((x, y) => Math.abs((x.width || 0) - 128) - Math.abs((y.width || 0) - 128))[0];
        if (pick?.url) spotifyThumbs.push(pick.url);
      }
    };
    // Prioritize liked -> followed -> top -> recent
    pushThumbs(likedArtists);
    pushThumbs(followedArtists);
    pushThumbs(topArtists);
    pushThumbs(recentlyPlayedArtists);

    if (allSpotifyIds.size === 0) {
      return NextResponse.json({
        matches: [],
        stats: {
          totalMatches: 0,
          likedMatches: 0,
          followedMatches: 0,
          topArtistMatches: 0,
          recentlyPlayedMatches: 0,
        },
        sourceCounts,
        spotifyThumbs,
      });
    }

    // Find matching artists in our database in batches to avoid URL length limits
    const spotifyIdArray = Array.from(allSpotifyIds);
    const batchSize = 100; // Smaller batches to avoid URL length limits
    const allDbArtists: any[] = [];
    
    console.log(`Querying database in batches of ${batchSize} for ${spotifyIdArray.length} Spotify IDs...`);
    
    for (let i = 0; i < spotifyIdArray.length; i += batchSize) {
      const batch = spotifyIdArray.slice(i, i + batchSize);
      
      const { data: batchArtists, error: batchError } = await supabase
        .from('artists')
        .select(`
          id,
          ade_id,
          title,
          subtitle,
          country_label,
          image_url,
          spotify_id,
          spotify_url
        `)
        .in('spotify_id', batch)
        .not('spotify_id', 'is', null);

      if (batchError) {
        console.error(`Database error in batch ${Math.floor(i/batchSize) + 1}:`, batchError);
        continue; // Continue with other batches even if one fails
      }

      if (batchArtists) {
        allDbArtists.push(...batchArtists);
        console.log(`Batch ${Math.floor(i/batchSize) + 1}: Found ${batchArtists.length} matches`);
      }
    }

    const dbArtists = allDbArtists;
    console.log(`Found ${dbArtists?.length || 0} total matching artists in database`);

    // Get events for matched artists
    const artistIds = dbArtists?.map(a => a.id) || [];
    let events: any[] = [];
    
    if (artistIds.length > 0) {
      const { data: artistEvents } = await supabase
        .from('artist_events')
        .select(`
          artist_id,
          event_id,
          events (
            id,
            ade_id,
            title,
            subtitle,
            start_date,
            end_date,
            venue_name,
            venue_address,
            event_type,
            categories,
            sold_out
          )
        `)
        .in('artist_id', artistIds);

      events = artistEvents || [];
    }

    // Create matches with reason
    const matches: MatchedArtist[] = [];
    const stats = {
      totalMatches: 0,
      likedMatches: 0,
      followedMatches: 0,
      topArtistMatches: 0,
      recentlyPlayedMatches: 0
    };

    const likedIds = new Set(likedArtists.map(a => a.id));
    const followedIds = new Set(followedArtists.map(a => a.id));
    const topIds = new Set(topArtists.map(a => a.id));
    const recentIds = new Set(recentlyPlayedArtists.map(a => a.id));

    for (const artist of dbArtists || []) {
      if (!artist.spotify_id) continue;

      let matchReason: 'liked' | 'followed' | 'top_artist' | 'recently_played' = 'recently_played';
      
      if (likedIds.has(artist.spotify_id)) {
        matchReason = 'liked';
        stats.likedMatches++;
      } else if (followedIds.has(artist.spotify_id)) {
        matchReason = 'followed';
        stats.followedMatches++;
      } else if (topIds.has(artist.spotify_id)) {
        matchReason = 'top_artist';
        stats.topArtistMatches++;
      } else if (recentIds.has(artist.spotify_id)) {
        matchReason = 'recently_played';
        stats.recentlyPlayedMatches++;
      }

      // Get artist's events
      const artistEvents = events
        .filter(ae => ae.artist_id === artist.id)
        .map(ae => ae.events)
        .filter(Boolean);

      // Find Spotify data for this artist
      const spotifyData = [
        ...likedArtists,
        ...followedArtists,
        ...topArtists,
        ...recentlyPlayedArtists
      ].find(a => a.id === artist.spotify_id);

      matches.push({
        ...artist,
        matchReason,
        spotifyData,
        events: artistEvents
      });

      stats.totalMatches++;
    }

    // Sort by match priority (liked > followed > top > recent)
    matches.sort((a, b) => {
      const priority = { liked: 4, followed: 3, top_artist: 2, recently_played: 1 };
      return priority[b.matchReason] - priority[a.matchReason];
    });

    // Prepare match thumbnails from our DB (image_url)
    const matchThumbs = matches.map(m => m.image_url).filter(Boolean);

    return NextResponse.json({ matches, stats, sourceCounts, spotifyThumbs, matchThumbs });

  } catch (error) {
    console.error('Error fetching matches:', error);
    return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
  }
}

async function getUserLikedArtists(accessToken: string): Promise<SpotifyArtist[]> {
  try {
    const artists = new Set<string>();
    let offset = 0;
    const limit = 50; // Spotify's max per request
    let totalProcessed = 0;
    const maxTracks = 10000; // Increase from ~2500 to 10000 tracks

    console.log('Fetching liked songs...');

    // Get liked tracks and extract artists
    while (totalProcessed < maxTracks) {
      const response = await fetch(
        `https://api.spotify.com/v1/me/tracks?limit=${limit}&offset=${offset}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (!response.ok) {
        console.log(`Liked tracks API error: ${response.status}`);
        break;
      }

      const data = await response.json();
      if (!data.items || data.items.length === 0) break;

      for (const item of data.items) {
        for (const artist of item.track.artists) {
          artists.add(artist.id);
        }
      }

      totalProcessed += data.items.length;
      offset += limit;
      
      console.log(`Processed ${totalProcessed} liked tracks, found ${artists.size} unique artists`);
      
      if (data.items.length < limit) break;
    }

    console.log(`Total unique artists from liked songs: ${artists.size}`);

    // Get artist details in batches (Spotify allows max 50 per request)
    const artistIds = Array.from(artists);
    const allArtists: SpotifyArtist[] = [];
    const batchSize = 50;

    for (let i = 0; i < artistIds.length; i += batchSize) {
      const batch = artistIds.slice(i, i + batchSize);
      
      const response = await fetch(
        `https://api.spotify.com/v1/artists?ids=${batch.join(',')}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.artists) {
          allArtists.push(...data.artists.filter((artist: any) => artist !== null));
        }
      }
      
      // Small delay to avoid rate limiting
      if (i + batchSize < artistIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`Retrieved details for ${allArtists.length} liked artists`);
    return allArtists;
  } catch (error) {
    console.error('Error fetching liked artists:', error);
    return [];
  }
}

async function getUserFollowedArtists(accessToken: string): Promise<SpotifyArtist[]> {
  try {
    const artists: SpotifyArtist[] = [];
    let url = 'https://api.spotify.com/v1/me/following?type=artist&limit=50';

    console.log('Fetching followed artists...');

    while (url) {
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (!response.ok) {
        console.log(`Followed artists API error: ${response.status}`);
        break;
      }

      const data = await response.json();
      if (!data.artists || data.artists.items.length === 0) break;

      artists.push(...data.artists.items);
      url = data.artists.next;
      
      console.log(`Found ${artists.length} followed artists so far`);
    }

    console.log(`Total followed artists: ${artists.length}`);
    return artists;
  } catch (error) {
    console.error('Error fetching followed artists:', error);
    return [];
  }
}

async function getUserTopArtists(accessToken: string): Promise<SpotifyArtist[]> {
  try {
    console.log('Fetching top artists...');
    
    // Get top artists for different time ranges
    const timeRanges = ['short_term', 'medium_term', 'long_term'];
    const allArtists: SpotifyArtist[] = [];
    const seenIds = new Set<string>();

    for (const timeRange of timeRanges) {
      const response = await fetch(
        `https://api.spotify.com/v1/me/top/artists?time_range=${timeRange}&limit=50`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.items) {
          for (const artist of data.items) {
            if (!seenIds.has(artist.id)) {
              seenIds.add(artist.id);
              allArtists.push(artist);
            }
          }
        }
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Total unique top artists: ${allArtists.length}`);
    return allArtists;
  } catch (error) {
    console.error('Error fetching top artists:', error);
    return [];
  }
}

async function getUserRecentlyPlayedArtists(accessToken: string): Promise<SpotifyArtist[]> {
  try {
    const artists = new Set<string>();
    let url = 'https://api.spotify.com/v1/me/player/recently-played?limit=50';
    let totalProcessed = 0;
    const maxTracks = 2000; // Increase from 50 to 2000 tracks

    console.log('Fetching recently played tracks...');

    // Get recently played tracks (paginated)
    while (url && totalProcessed < maxTracks) {
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (!response.ok) {
        console.log(`Recently played API error: ${response.status}`);
        break;
      }

      const data = await response.json();
      if (!data.items || data.items.length === 0) break;

      for (const item of data.items) {
        for (const artist of item.track.artists) {
          artists.add(artist.id);
        }
      }

      totalProcessed += data.items.length;
      url = data.next; // Use the next URL from Spotify
      
      console.log(`Processed ${totalProcessed} recently played tracks, found ${artists.size} unique artists`);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Total unique artists from recently played: ${artists.size}`);

    // Get artist details in batches
    const artistIds = Array.from(artists);
    const allArtists: SpotifyArtist[] = [];
    const batchSize = 50;

    for (let i = 0; i < artistIds.length; i += batchSize) {
      const batch = artistIds.slice(i, i + batchSize);
      
      const response = await fetch(
        `https://api.spotify.com/v1/artists?ids=${batch.join(',')}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.artists) {
          allArtists.push(...data.artists.filter((artist: any) => artist !== null));
        }
      }
      
      // Small delay to avoid rate limiting
      if (i + batchSize < artistIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`Retrieved details for ${allArtists.length} recently played artists`);
    return allArtists;
  } catch (error) {
    console.error('Error fetching recently played artists:', error);
    return [];
  }
}
