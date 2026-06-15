import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';

type SpotifyArtist = {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  followers: { total: number };
  images: Array<{ url: string; height: number; width: number }>;
  external_urls: { spotify: string };
};

function pickImage(artist?: SpotifyArtist | null): string | null {
  if (!artist || !Array.isArray(artist.images) || artist.images.length === 0) return null;
  const sorted = [...artist.images].sort((a, b) => Math.abs((a.width || 0) - 128) - Math.abs((b.width || 0) - 128));
  return sorted[0]?.url || artist.images[0]?.url || null;
}

export async function GET(_req: NextRequest) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('spotify_access_token')?.value;
  if (!accessToken) {
    return new Response('Not authenticated', { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start: async (controller) => {
      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      const ping = () => controller.enqueue(encoder.encode(`:\n\n`));

      try {
        // Aggregation containers
        const likedIds = new Set<string>();
        const followedIds = new Set<string>();
        const topIds = new Set<string>();
        const recentIds = new Set<string>();
        const uniqueIds = new Set<string>();
        const spotifyThumbs: string[] = [];
        const seenForThumbs = new Set<string>();

        // Helper: fetch JSON with auth
        const fetchJson = async (url: string) => {
          const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
          if (!res.ok) throw new Error(`Spotify ${url} -> ${res.status}`);
          return res.json();
        };

        // Helper: fetch artists info to get images for a batch of IDs
        const fetchArtistsInfo = async (ids: string[]) => {
          if (ids.length === 0) return [] as SpotifyArtist[];
          const res = await fetch(`https://api.spotify.com/v1/artists?ids=${ids.join(',')}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!res.ok) return [] as SpotifyArtist[];
          const data = await res.json();
          return (data?.artists || []).filter((a: any) => a);
        };

        // Emit collected counts helper
        const emitCollected = () => {
          send('collected', {
            counts: {
              liked: likedIds.size,
              followed: followedIds.size,
              top: topIds.size,
              recent: recentIds.size,
              unique: uniqueIds.size,
            },
            spotifyThumbs,
          });
        };

        // 1) Liked tracks -> collect artists
        let likedOffset = 0;
        const likedLimit = 50;
        const likedMax = 5000; // number of tracks to scan at most
        while (likedOffset < likedMax) {
          const data = await fetchJson(`https://api.spotify.com/v1/me/tracks?limit=${likedLimit}&offset=${likedOffset}`);
          const items = data?.items || [];
          if (items.length === 0) break;
          const newIds: string[] = [];
          for (const item of items) {
            for (const a of item?.track?.artists || []) {
              if (!likedIds.has(a.id)) newIds.push(a.id);
              likedIds.add(a.id);
              uniqueIds.add(a.id);
            }
          }
          // fetch images for new ids (batch by 50)
          for (let i = 0; i < newIds.length; i += 50) {
            const batch = newIds.slice(i, i + 50).filter((id) => !seenForThumbs.has(id));
            if (batch.length > 0) {
              const artists = await fetchArtistsInfo(batch);
              for (const art of artists) {
                seenForThumbs.add(art.id);
                const img = pickImage(art);
                if (img) spotifyThumbs.push(img);
              }
            }
          }
          emitCollected();
          likedOffset += likedLimit;
          if (items.length < likedLimit) break;
          ping();
        }

        // 2) Followed artists (paginated via next URL)
        let url: string | null = 'https://api.spotify.com/v1/me/following?type=artist&limit=50';
        while (url) {
          const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
          if (!res.ok) break;
          const data = await res.json();
          const items: SpotifyArtist[] = data?.artists?.items || [];
          for (const a of items) {
            followedIds.add(a.id);
            uniqueIds.add(a.id);
            if (!seenForThumbs.has(a.id)) {
              seenForThumbs.add(a.id);
              const img = pickImage(a);
              if (img) spotifyThumbs.push(img);
            }
          }
          emitCollected();
          url = data?.artists?.next || null;
          ping();
        }

        // 3) Top artists for 3 time ranges
        for (const tr of ['short_term', 'medium_term', 'long_term']) {
          const data = await fetchJson(`https://api.spotify.com/v1/me/top/artists?time_range=${tr}&limit=50`);
          const items: SpotifyArtist[] = data?.items || [];
          for (const a of items) {
            topIds.add(a.id);
            uniqueIds.add(a.id);
            if (!seenForThumbs.has(a.id)) {
              seenForThumbs.add(a.id);
              const img = pickImage(a);
              if (img) spotifyThumbs.push(img);
            }
          }
          emitCollected();
          ping();
        }

        // 4) Recently played
        let recentUrl: string | null = 'https://api.spotify.com/v1/me/player/recently-played?limit=50';
        while (recentUrl) {
          const res = await fetch(recentUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
          if (!res.ok) break;
          const data = await res.json();
          const items = data?.items || [];
          for (const item of items) {
            for (const a of item?.track?.artists || []) {
              recentIds.add(a.id);
              uniqueIds.add(a.id);
            }
          }
          emitCollected();
          recentUrl = data?.next || null;
          ping();
        }

        // Send a completion for collected phase
        send('collected-complete', {
          counts: {
            liked: likedIds.size,
            followed: followedIds.size,
            top: topIds.size,
            recent: recentIds.size,
            unique: uniqueIds.size,
          },
          spotifyThumbs,
        });

        // Start matching against DB
        send('status', { message: 'Matching with featured festival artists...' });
        const spotifyIdArray = Array.from(uniqueIds);
        const batchSize = 200;
        const matchThumbs: string[] = [];
        const matches: any[] = [];
        const stats = { totalMatches: 0, likedMatches: 0, followedMatches: 0, topArtistMatches: 0, recentlyPlayedMatches: 0 };

        for (let i = 0; i < spotifyIdArray.length; i += batchSize) {
          const batch = spotifyIdArray.slice(i, i + batchSize);
          const { data: dbArtists } = await supabase
            .from('artists')
            .select('id, ade_id, title, subtitle, country_label, image_url, spotify_id, spotify_url')
            .in('spotify_id', batch)
            .not('spotify_id', 'is', null);

          for (const artist of dbArtists || []) {
            if (!artist.spotify_id) continue;
            let reason: 'liked' | 'followed' | 'top_artist' | 'recently_played' = 'recently_played';
            if (likedIds.has(artist.spotify_id)) { reason = 'liked'; stats.likedMatches++; }
            else if (followedIds.has(artist.spotify_id)) { reason = 'followed'; stats.followedMatches++; }
            else if (topIds.has(artist.spotify_id)) { reason = 'top_artist'; stats.topArtistMatches++; }
            else if (recentIds.has(artist.spotify_id)) { reason = 'recently_played'; stats.recentlyPlayedMatches++; }

            matches.push({ ...artist, matchReason: reason });
            stats.totalMatches++;
            if (artist.image_url) matchThumbs.push(artist.image_url);
          }

          send('matches-progress', {
            stats,
            soFar: matches.length,
            total: spotifyIdArray.length,
            matchThumbs,
          });
          ping();
        }

        // Sort final matches by priority
        const priority: Record<string, number> = { liked: 4, followed: 3, top_artist: 2, recently_played: 1 };
        matches.sort((a, b) => priority[b.matchReason] - priority[a.matchReason]);

        send('done', {
          matches,
          stats,
          sourceCounts: { liked: likedIds.size, followed: followedIds.size, top: topIds.size, recent: recentIds.size, unique: uniqueIds.size },
          spotifyThumbs,
          matchThumbs,
        });
        controller.close();
      } catch (err: any) {
        send('error', { message: err?.message || 'Streaming failed' });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
// @ts-nocheck
