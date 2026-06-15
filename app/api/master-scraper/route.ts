import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { adeApi } from '@/lib/ade-api';
import { eventParser, type LineupArtist } from '@/lib/event-parser';
import { artistEventMatcher } from '@/lib/artist-event-matcher';
import { ArtistPageScraper } from '@/lib/artist-page-scraper';
import { spotifyApi } from '@/lib/spotify-api';

// Store master scraper progress
export const masterScraperProgress = new Map<string, any>();

// Helper function to enrich artist with Spotify data
async function enrichArtistWithSpotifyData(artistId: number, spotifyArtist: any, supabase: any) {
  const startTime = Date.now();
  
  try {
    // Get top tracks and related artists
    const [topTracks, relatedArtists] = await Promise.all([
      spotifyApi.getArtistTopTracks(spotifyArtist.id, 'US'),
      spotifyApi.getRelatedArtists(spotifyArtist.id)
    ]);

    // Get audio features for top tracks
    let audioFeatures: any[] = [];
    let topTrackData = null;
    
    if (topTracks?.tracks && topTracks.tracks.length > 0) {
      const trackIds = topTracks.tracks.slice(0, 5).map((track: any) => track.id);
      audioFeatures = await spotifyApi.getAudioFeatures(trackIds) || [];
      
      // Get top track data
      const topTrack = topTracks.tracks[0];
      topTrackData = {
        id: topTrack.id,
        name: topTrack.name,
        popularity: topTrack.popularity,
        album: topTrack.album.name,
        album_art: topTrack.album.images[0]?.url,
        spotify_url: topTrack.external_urls.spotify,
        preview_url: topTrack.preview_url
      };
    }

    // Calculate audio feature means
    const audioFeatureMeans = audioFeatures.length > 0 ? {
      energy_mean: audioFeatures.reduce((sum, f) => sum + f.energy, 0) / audioFeatures.length,
      danceability_mean: audioFeatures.reduce((sum, f) => sum + f.danceability, 0) / audioFeatures.length,
      valence_mean: audioFeatures.reduce((sum, f) => sum + f.valence, 0) / audioFeatures.length,
      tempo_bpm_mean: audioFeatures.reduce((sum, f) => sum + f.tempo, 0) / audioFeatures.length,
      acousticness_mean: audioFeatures.reduce((sum, f) => sum + f.acousticness, 0) / audioFeatures.length,
      instrumentalness_mean: audioFeatures.reduce((sum, f) => sum + f.instrumentalness, 0) / audioFeatures.length,
      liveness_mean: audioFeatures.reduce((sum, f) => sum + f.liveness, 0) / audioFeatures.length,
      speechiness_mean: audioFeatures.reduce((sum, f) => sum + f.speechiness, 0) / audioFeatures.length,
      loudness_mean_db: audioFeatures.reduce((sum, f) => sum + f.loudness, 0) / audioFeatures.length,
    } : {};

    // Prepare genres
    const primaryGenres = spotifyArtist.genres.slice(0, 3).join('|');
    const secondaryGenres = spotifyArtist.genres.slice(3, 6).join('|');

    // Prepare related artists
    const relatedArtistsData = relatedArtists?.artists?.slice(0, 3).map((artist: any, index: number) => ({
      [`related_${index + 1}`]: artist.name,
      [`related_${index + 1}_id`]: artist.id
    })).reduce((acc, curr) => ({ ...acc, ...curr }), {}) || {};

    // Update artist with Spotify data
    const { error } = await supabase
      .from('artists')
      .update({
        spotify_id: spotifyArtist.id,
        spotify_url: spotifyArtist.external_urls.spotify,
        spotify_name: spotifyArtist.name,
        spotify_image_url: spotifyArtist.images[0]?.url,
        image_url_medium: spotifyArtist.images[1]?.url,
        image_url_small: spotifyArtist.images[2]?.url,
        followers: spotifyArtist.followers.total,
        popularity: spotifyArtist.popularity,
        primary_genres: primaryGenres,
        secondary_genres: secondaryGenres,
        ...audioFeatureMeans,
        ...topTrackData,
        ...relatedArtistsData,
        enriched_at: new Date().toISOString(),
        spotify_last_updated: new Date().toISOString(),
        full_spotify_data: {
          artist: spotifyArtist,
          top_tracks: topTracks?.tracks || [],
          related_artists: relatedArtists?.artists || [],
          audio_features: audioFeatures
        }
      })
      .eq('id', artistId);

    if (error) {
      return { success: false, error: error.message, duration: Date.now() - startTime };
    }

    return { success: true, duration: Date.now() - startTime };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error), 
      duration: Date.now() - startTime 
    };
  }
}

interface MasterScraperOptions {
  // Data Sources
  syncArtists?: boolean;
  syncEvents?: boolean;
  
  // Processing
  parseLineups?: boolean;
  linkArtists?: boolean;
  scrapeArtistPages?: boolean;
  enrichArtists?: boolean;
  
  // Analysis
  checkMissing?: boolean;
  generateStats?: boolean;
  
  // Advanced
  forceRefresh?: boolean;
  batchSize?: number;
  rateLimit?: number;
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { 
      sessionId,
      options = {
        syncArtists: true,
        syncEvents: true,
        parseLineups: true,
        linkArtists: true,
        enrichArtists: true,
        checkMissing: true,
        generateStats: true,
        forceRefresh: false,
        batchSize: 10,
        rateLimit: 100
      }
    }: { sessionId: string; options?: MasterScraperOptions } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Initialize progress
    masterScraperProgress.set(sessionId, {
      phase: 'Initializing',
      progress: 0,
      message: 'Starting Master Scraper...',
      completed: false,
      stats: {
        artistsAdded: 0,
        artistsUpdated: 0,
        eventsAdded: 0,
        eventsUpdated: 0,
        lineupsParsed: 0,
        artistsFound: 0,
        linksCreated: 0,
        artistsEnriched: 0,
        enrichmentErrors: 0,
        missingEvents: [],
        missingArtists: [],
        totalProcessed: 0,
        errors: 0
      },
      currentItem: '',
      logs: [],
      startTime: new Date().toISOString(),
      estimatedTimeRemaining: 'Calculating...'
    });

    // Start master scraper in background
    performMasterScraper(sessionId, options).catch(error => {
      console.error('Master scraper error:', error);
      masterScraperProgress.set(sessionId, {
        ...masterScraperProgress.get(sessionId),
        completed: true,
        error: error.message,
        phase: 'Error',
        message: `Error: ${error.message}`
      });
    });

    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Master Scraper started',
      options
    });

  } catch (error) {
    console.error('Error starting master scraper:', error);
    return NextResponse.json({ 
      error: String(error),
      message: 'Failed to start master scraper'
    }, { status: 500 });
  }
}

async function performMasterScraper(sessionId: string, options: MasterScraperOptions) {
  const stats = {
    artistsAdded: 0,
    artistsUpdated: 0,
    eventsAdded: 0,
    eventsUpdated: 0,
    lineupsParsed: 0,
    artistsFound: 0,
    linksCreated: 0,
    artistsEnriched: 0,
    enrichmentErrors: 0,
    missingEvents: [] as any[],
    missingArtists: [] as any[],
    totalProcessed: 0,
    errors: 0
  };

  const logs: string[] = [];
  const startTime = Date.now();
  
  const addLog = (
    message: string, 
    type: 'info' | 'success' | 'warning' | 'error' | 'debug' = 'info',
    category: 'sync' | 'parse' | 'enrich' | 'link' | 'analysis' | 'system' = 'system',
    visualData?: {
      type: 'artists' | 'events' | 'lineups' | 'connections' | 'social' | 'music' | 'stats';
      items: Array<{
        id: string;
        name: string;
        image?: string;
        subtitle?: string;
        metadata?: any;
      }>;
      count: number;
      total?: number;
    },
    metadata?: any
  ) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${logs.length}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp,
      level: type,
      category,
      message,
      visualData,
      metadata,
      duration: metadata?.duration,
      progress: metadata?.progress
    };
    
    logs.push(logEntry);
    if (logs.length > 500) logs.shift(); // Keep last 500 logs
    console.log(`[Master Scraper - ${type}] ${message}`);
  };

  const updateProgress = (phase: string, progress: number, message: string, currentItem?: string) => {
    const elapsed = Date.now() - startTime;
    const estimatedTotal = progress > 0 ? (elapsed / progress) * 100 : 0;
    const remaining = Math.max(0, estimatedTotal - elapsed);
    const estimatedTimeRemaining = remaining > 0 ? 
      `${Math.round(remaining / 1000)}s remaining` : 
      'Almost done...';

    masterScraperProgress.set(sessionId, {
      phase,
      progress: Math.min(100, Math.max(0, progress)),
      message,
      currentItem: currentItem || '',
      completed: false,
      stats,
      logs,
      startTime: new Date(startTime).toISOString(),
      estimatedTimeRemaining
    });
  };

  const broadcastProgress = (partial: Record<string, any> = {}) => {
    const current = masterScraperProgress.get(sessionId);
    if (!current) return;

    masterScraperProgress.set(sessionId, {
      ...current,
      ...partial,
      stats,
      logs,
    });
  };

  try {
    addLog('🚀 Master Scraper started - Featured Festival Data Pipeline', 'info', 'system', {
      options,
      sessionId,
      startTime: new Date(startTime).toISOString()
    });
    addLog(`Configuration loaded: ${Object.keys(options).filter(k => options[k as keyof MasterScraperOptions]).join(', ')}`, 'info', 'system', options);

    // Phase 1: Sync Artists from the featured festival source API
    if (options.syncArtists) {
      updateProgress('Syncing Artists', 5, 'Fetching all artists from featured festival source API...');
      addLog('📥 Phase 1: Syncing Artists from featured festival source API', 'info', 'sync', {
        phase: 'artist_sync',
        startTime: Date.now()
      });
      
      const allArtists = await adeApi.fetchAllArtists((page, artists) => {
        updateProgress('Syncing Artists', 5 + (page * 0.5), `Fetched page ${page} (${artists.length} artists)`);
        addLog(`Fetched page ${page}: ${artists.length} artists`, 'info', 'sync', {
          type: 'artists',
          items: artists.slice(0, 5).map(artist => ({
            id: artist.id.toString(),
            name: artist.title,
            image: artist.image?.url,
            subtitle: artist.country?.label,
            isNew: true, // Will be updated when we actually process them
            status: 'discovered',
            timestamp: new Date().toISOString(),
            metadata: { 
              country: artist.country?.value,
              genres: artist.genres || [],
              spotifyId: null,
              popularity: null,
              audioFeatures: null,
              socialPlatforms: [],
              eventsCount: 0
            }
          })),
          count: artists.length
        }, {
          page,
          artistCount: artists.length,
          progress: (page / 10) * 100
        });
      });

      addLog(`📊 Total artists fetched: ${allArtists.length}`, 'success', 'sync', {
        type: 'artists',
        items: allArtists.slice(0, 8).map(artist => ({
          id: artist.id.toString(),
          name: artist.title,
          image: artist.image?.url,
          subtitle: artist.country?.label,
          metadata: { country: artist.country?.value }
        })),
        count: allArtists.length
      }, {
        totalArtists: allArtists.length,
        duration: Date.now() - startTime
      });
      
      // Process artists in batches
      const batchSize = options.batchSize || 10;
      for (let i = 0; i < allArtists.length; i += batchSize) {
        const batch = allArtists.slice(i, Math.min(i + batchSize, allArtists.length));
        const progress = 10 + (i / allArtists.length * 10);
        updateProgress('Syncing Artists', progress, `Processing artists ${i + 1}-${Math.min(i + batchSize, allArtists.length)}/${allArtists.length}`);

          await Promise.all(batch.map(async (artist, batchIndex) => {
            const artistStartTime = Date.now();
            let currentItemTitle = artist.title;
            try {
              const cleanedArtist = adeApi.cleanArtistData(artist);
              currentItemTitle = cleanedArtist.title;
              broadcastProgress({ currentItem: currentItemTitle });
              
              // Check if artist exists
              const { data: existing } = await supabase
                .from('artists')
                .select('id')
                .eq('ade_id', cleanedArtist.ade_id)
                .single();

            if (!existing) {
              // Insert new artist
              const { error } = await supabase
                .from('artists')
                .insert({
                  ...cleanedArtist,
                  first_seen_at: new Date().toISOString(),
                  last_updated_at: new Date().toISOString()
                });

              if (!error) {
                stats.artistsAdded++;
                broadcastProgress();
                addLog(`✅ Added new artist: ${cleanedArtist.title}`, 'success', 'sync', {
                  type: 'artists',
                  items: [{
                    id: cleanedArtist.ade_id.toString(),
                    name: cleanedArtist.title,
                    image: cleanedArtist.image_url,
                    subtitle: cleanedArtist.country_label,
                    isNew: true,
                    status: 'new',
                    timestamp: new Date().toISOString(),
                    metadata: { 
                      country: cleanedArtist.country,
                      genres: cleanedArtist.genres || [],
                      spotifyId: null,
                      popularity: null,
                      audioFeatures: null,
                      socialPlatforms: [],
                      eventsCount: 0
                    }
                  }],
                  count: 1
                }, {
                  artistId: cleanedArtist.ade_id,
                  duration: Date.now() - artistStartTime
                });
              } else {
                stats.errors++;
                addLog(`❌ Failed to add artist ${cleanedArtist.title}: ${error.message}`, 'error', 'sync', {
                  artistId: cleanedArtist.ade_id,
                  artistName: cleanedArtist.title,
                  error: error.message,
                  errorCode: error.code
                }, {
                  artistId: cleanedArtist.ade_id,
                  errorCode: error.code
                });
              }
            } else {
              // Update existing artist
              const { error } = await supabase
                .from('artists')
                .update({
                  ...cleanedArtist,
                  last_updated_at: new Date().toISOString()
                })
                .eq('ade_id', cleanedArtist.ade_id);

              if (!error) {
                stats.artistsUpdated++;
                broadcastProgress();
                addLog(`🔄 Updated artist: ${cleanedArtist.title}`, 'info', 'sync', {
                  type: 'artists',
                  items: [{
                    id: cleanedArtist.ade_id.toString(),
                    name: cleanedArtist.title,
                    image: cleanedArtist.image_url,
                    subtitle: cleanedArtist.country_label,
                    isNew: false,
                    status: existing.enriched_at ? 'enriched' : 'discovered',
                    timestamp: new Date().toISOString(),
                    metadata: { 
                      country: cleanedArtist.country,
                      genres: cleanedArtist.genres || [],
                      spotifyId: existing.spotify_id || null,
                      popularity: null,
                      audioFeatures: null,
                      socialPlatforms: [],
                      eventsCount: 0
                    }
                  }],
                  count: 1
                }, {
                  artistId: cleanedArtist.ade_id,
                  duration: Date.now() - artistStartTime
                });
              } else {
                stats.errors++;
                addLog(`❌ Failed to update artist ${cleanedArtist.title}: ${error.message}`, 'error', 'sync', {
                  artistId: cleanedArtist.ade_id,
                  artistName: cleanedArtist.title,
                  error: error.message,
                  errorCode: error.code
                }, {
                  artistId: cleanedArtist.ade_id,
                  errorCode: error.code
                });
              }
            }
          } catch (error) {
            stats.errors++;
            addLog(`❌ Error processing artist: ${error}`, 'error', 'sync', {
              artistId: artist.ade_id,
              artistName: artist.title,
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined
            }, {
              artistId: artist.ade_id,
              errorCode: 'PROCESSING_ERROR'
            });
            broadcastProgress({ currentItem: currentItemTitle });
          } finally {
            stats.totalProcessed++;
            broadcastProgress({ currentItem: currentItemTitle });
          }
        }));

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, options.rateLimit || 100));
      }
      
      addLog(`✅ Artists sync complete: ${stats.artistsAdded} added, ${stats.artistsUpdated} updated`, 'success', 'sync', {
        type: 'artists',
        items: [],
        count: allArtists.length,
        total: allArtists.length
      });
    }

    // Phase 2: Sync Events from the featured festival source API
    if (options.syncEvents) {
      updateProgress('Syncing Events', 20, 'Fetching all events from featured festival source API...');
      addLog('📅 Phase 2: Syncing Events from featured festival source API', 'info');
      
      const allEvents = await adeApi.fetchAllEvents((page, events) => {
        updateProgress('Syncing Events', 20 + (page * 0.5), `Fetched page ${page} (${events.length} events)`);
        addLog(`Fetched page ${page}: ${events.length} events`, 'info');
      });

      addLog(`📊 Total events fetched: ${allEvents.length}`, 'success');
      
      // Process events in batches
      const batchSize = options.batchSize || 10;
      for (let i = 0; i < allEvents.length; i += batchSize) {
        const batch = allEvents.slice(i, Math.min(i + batchSize, allEvents.length));
        const progress = 25 + (i / allEvents.length * 10);
        updateProgress('Syncing Events', progress, `Processing events ${i + 1}-${Math.min(i + batchSize, allEvents.length)}/${allEvents.length}`);

          await Promise.all(batch.map(async (event) => {
            let currentEventTitle = event.title;
            try {
              const cleanedEvent = adeApi.cleanEventData(event);
              currentEventTitle = cleanedEvent.title;
              broadcastProgress({ currentItem: currentEventTitle });
              
              // Check if event exists
              const { data: existing } = await supabase
                .from('events')
                .select('id')
                .eq('ade_id', cleanedEvent.ade_id)
                .single();

            if (!existing) {
              // Insert new event
              const { error } = await supabase
                .from('events')
                .insert({
                  ...cleanedEvent,
                  first_seen_at: new Date().toISOString(),
                  last_updated_at: new Date().toISOString()
                });

              if (!error) {
                stats.eventsAdded++;
                broadcastProgress();
                addLog(`✅ Added event: ${cleanedEvent.title}`, 'success');
              } else {
                stats.errors++;
                addLog(`❌ Failed to add event ${cleanedEvent.title}: ${error.message}`, 'error');
              }
            } else {
              // Update existing event
              const { error } = await supabase
                .from('events')
                .update({
                  ...cleanedEvent,
                  last_updated_at: new Date().toISOString()
                })
                .eq('ade_id', cleanedEvent.ade_id);

              if (!error) {
                stats.eventsUpdated++;
                broadcastProgress();
                addLog(`🔄 Updated event: ${cleanedEvent.title}`, 'info');
              } else {
                stats.errors++;
                addLog(`❌ Failed to update event ${cleanedEvent.title}: ${error.message}`, 'error');
              }
            }
          } catch (error) {
            stats.errors++;
            addLog(`❌ Error processing event: ${error}`, 'error');
            broadcastProgress({ currentItem: currentEventTitle });
          } finally {
            stats.totalProcessed++;
            broadcastProgress({ currentItem: currentEventTitle });
          }
        }));

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, options.rateLimit || 100));
      }
      
      addLog(`✅ Events sync complete: ${stats.eventsAdded} added, ${stats.eventsUpdated} updated`, 'success');
    }

    // Phase 3: Parse Event Lineups
    if (options.parseLineups) {
      updateProgress('Parsing Lineups', 35, 'Fetching events to parse lineups...');
      addLog('🔍 Phase 3: Parsing Event Lineups', 'info');
      
      // Get all events with URLs
      const { data: events, error } = await supabase
        .from('events')
        .select('id, ade_id, title, url, raw_data')
        .not('url', 'is', null)
        .order('id');

      if (error || !events) {
        throw new Error('Failed to fetch events for parsing');
      }

      addLog(`📊 Found ${events.length} events to parse`, 'info');

      // Parse events in batches
      const batchSize = options.batchSize || 10;
      for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, Math.min(i + batchSize, events.length));
        const progress = 35 + (i / events.length * 20);
        updateProgress('Parsing Lineups', progress, `Parsing events ${i + 1}-${Math.min(i + batchSize, events.length)}/${events.length}`);

        await Promise.all(batch.map(async (event) => {
          try {
            const { lineup } = await eventParser.fetchAndParseEventPage(event.url);
            
            if (lineup.length > 0) {
              stats.lineupsParsed++;
              stats.artistsFound += lineup.length;
              broadcastProgress({ currentItem: event.title });

              // Preserve existing raw_data payload when appending parsed details
              const existingRawData =
                event.raw_data && typeof event.raw_data === 'object'
                  ? event.raw_data
                  : {};

              await supabase
                .from('events')
                .update({
                  raw_data: {
                    ...existingRawData,
                    parsed_lineup: lineup,
                    parsed_at: new Date().toISOString()
                  }
                })
                .eq('id', event.id);

              addLog(`✅ Parsed lineup for ${event.title}: ${lineup.length} artists`, 'success');
            } else {
              addLog(`⚠️ No lineup found for ${event.title}`, 'warning');
            }
          } catch (error) {
            stats.errors++;
            addLog(`❌ Failed to parse ${event.title}: ${error}`, 'error');
          } finally {
            broadcastProgress({ currentItem: event.title });
          }
        }));

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, options.rateLimit || 200));
      }
      
      addLog(`✅ Lineup parsing complete: ${stats.lineupsParsed} events parsed, ${stats.artistsFound} artists found`, 'success');
    }

    // Phase 4: Link Artists to Events
    if (options.linkArtists) {
      updateProgress('Linking Artists', 55, 'Creating artist-event connections...');
      addLog('🔗 Phase 4: Linking Artists to Events', 'info');
      
      // Get all events with parsed lineups
      const { data: events } = await supabase
        .from('events')
        .select('id, ade_id, title, raw_data')
        .not('raw_data->parsed_lineup', 'is', null);

      if (events) {
        addLog(`📊 Found ${events.length} events with lineups to link`, 'info');
        const nameLookupCache = new Map<string, number | null>();

        const batchSize = options.batchSize || 10;
        for (let i = 0; i < events.length; i += batchSize) {
          const batch = events.slice(i, Math.min(i + batchSize, events.length));
          const progress = 55 + (i / events.length * 15);
          updateProgress('Linking Artists', progress, `Linking events ${i + 1}-${Math.min(i + batchSize, events.length)}/${events.length}`);

          await Promise.all(batch.map(async (event) => {
            try {
              const lineup: LineupArtist[] = Array.isArray(event.raw_data?.parsed_lineup)
                ? event.raw_data.parsed_lineup
                : [];

              if (lineup.length === 0) {
                broadcastProgress({ currentItem: event.title });
                return;
              }

              const adeIdLookup = new Map<number, { id: number; title: string }>();
              const adeIdCandidates = Array.from(
                new Set(
                  lineup
                    .map(artist => artist.adeId)
                    .filter((adeId): adeId is number => typeof adeId === 'number' && !Number.isNaN(adeId))
                )
              );

              if (adeIdCandidates.length > 0) {
                const { data: matchedByAdeId } = await supabase
                  .from('artists')
                  .select('id, ade_id, title')
                  .in('ade_id', adeIdCandidates);

                matchedByAdeId?.forEach(match => {
                  adeIdLookup.set(match.ade_id, { id: match.id, title: match.title });
                });
              }

              const existingLinks = new Set<number>();
              const { data: existingArtistLinks } = await supabase
                .from('artist_events')
                .select('artist_id')
                .eq('event_id', event.id);

              existingArtistLinks?.forEach(link => {
                if (link?.artist_id) {
                  existingLinks.add(link.artist_id);
                }
              });

              for (const lineupArtist of lineup) {
                const normalizedName = (lineupArtist.name || '').trim().toLowerCase();
                let matchedArtistId: number | null = null;

                if (
                  typeof lineupArtist.adeId === 'number' &&
                  adeIdLookup.has(lineupArtist.adeId)
                ) {
                  matchedArtistId = adeIdLookup.get(lineupArtist.adeId)!.id;
                }

                if (!matchedArtistId && normalizedName) {
                  if (nameLookupCache.has(normalizedName)) {
                    matchedArtistId = nameLookupCache.get(normalizedName) ?? null;
                  } else {
                    const { data: artistByName } = await supabase
                      .from('artists')
                      .select('id')
                      .ilike('title', lineupArtist.name)
                      .single();

                    matchedArtistId = artistByName?.id ?? null;
                    nameLookupCache.set(normalizedName, matchedArtistId);
                  }
                }

                if (!matchedArtistId) {
                  stats.missingArtists.push({
                    name: lineupArtist.name,
                    adeId: lineupArtist.adeId,
                    event: event.title
                  });
                  addLog(`⚠️ Artist not found: ${lineupArtist.name}`, 'warning');
                  broadcastProgress({ currentItem: event.title });
                  continue;
                }

                const alreadyLinked = existingLinks.has(matchedArtistId);

                if (alreadyLinked && !options.forceRefresh) {
                  continue;
                }

                if (alreadyLinked && options.forceRefresh) {
                  await supabase
                    .from('artist_events')
                    .delete()
                    .eq('artist_id', matchedArtistId)
                    .eq('event_id', event.id);
                  existingLinks.delete(matchedArtistId);
                }

                const { error } = await supabase
                  .from('artist_events')
                  .insert({
                    artist_id: matchedArtistId,
                    event_id: event.id,
                    confidence: 1.0,
                    source: 'master_scraper',
                    match_details: {
                      artist_name: lineupArtist.name,
                      artist_ade_id: lineupArtist.adeId
                    }
                  });

                if (!error) {
                  stats.linksCreated++;
                  existingLinks.add(matchedArtistId);
                  addLog(`✅ Linked ${lineupArtist.name} to ${event.title}`, 'success');
                  broadcastProgress({ currentItem: event.title });
                } else {
                  stats.errors++;
                  addLog(`❌ Failed to link ${lineupArtist.name} to ${event.title}: ${error.message}`, 'error');
                }
              }
            } catch (error) {
              stats.errors++;
              addLog(`❌ Error linking event ${event.title}: ${error}`, 'error');
            } finally {
              broadcastProgress({ currentItem: event.title });
            }
          }));

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, options.rateLimit || 50));
        }
      }
      
      addLog(`✅ Artist linking complete: ${stats.linksCreated} links created, ${stats.missingArtists.length} artists not found`, 'success');
    }

  // Phase 5: Scrape Artist Pages for Spotify URLs
  if (options.scrapeArtistPages) {
    updateProgress('Scraping Artist Pages', 70, 'Scraping artist pages for Spotify URLs...');
    addLog('🔍 Phase 5: Scraping Artist Pages for Spotify URLs', 'info', 'parse', {
      phase: 'artist_page_scraping',
      startTime: Date.now()
    });
    
    const artistPageScraper = new ArtistPageScraper();
    
    // Determine how many artists still need Spotify URLs
    const { count: artistsNeedingSpotify } = await supabase
      .from('artists')
      .select('id', { count: 'exact', head: true })
      .or('spotify_url.is.null,spotify_url.eq.');

    const totalArtistsToScrape = artistsNeedingSpotify ?? 0;

    if (totalArtistsToScrape > 0) {
      addLog(`📊 Found ${totalArtistsToScrape} artists without Spotify URLs`, 'info', 'parse', {
        artistCount: totalArtistsToScrape
      });

      const fetchPageSize = 200;
      const batchSize = options.batchSize || 5;
      const allBatchResults = [];
      let offset = 0;
      let processedCount = 0;

      while (true) {
        const { data: artistsPage } = await supabase
          .from('artists')
          .select('id, ade_id, title, url')
          .or('spotify_url.is.null,spotify_url.eq.')
          .order('id')
          .range(offset, offset + fetchPageSize - 1);

        if (!artistsPage || artistsPage.length === 0) {
          break;
        }

        const targets = artistsPage.map(artist => {
          let resolvedUrl: string | null = null;

          if (artist.url) {
            resolvedUrl = artist.url.startsWith('http')
              ? artist.url
              : `https://www.amsterdam-dance-event.nl${artist.url}`;
          }

          if (!resolvedUrl) {
            const slug = (artist.title || '')
              .normalize('NFKD')
              .replace(/[\u0300-\u036f]/g, '')
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '');

            resolvedUrl = slug
              ? `https://www.amsterdam-dance-event.nl/en/artists-speakers/${slug}/${artist.ade_id}/`
              : null;
          }

          return {
            ...artist,
            targetUrl: resolvedUrl
          };
        });

        const missingUrlTargets = targets.filter(t => !t.targetUrl);
        if (missingUrlTargets.length > 0) {
          for (const missing of missingUrlTargets) {
            addLog(`⚠️ Unable to determine source URL for ${missing.title}`, 'warning', 'parse', {
              artistId: missing.ade_id,
              artistName: missing.title
            }, {
              artistId: missing.ade_id
            });
          }
        }

        const scrapeTargets = targets.filter(t => t.targetUrl) as Array<{
          id: number;
          ade_id: number;
          title: string;
          targetUrl: string;
        }>;

        for (let i = 0; i < scrapeTargets.length; i += batchSize) {
          const batch = scrapeTargets.slice(i, i + batchSize);
          const batchRangeStart = processedCount + 1;
          const batchRangeEnd = processedCount + batch.length;
          const completion = totalArtistsToScrape > 0
            ? Math.min(batchRangeEnd, totalArtistsToScrape) / totalArtistsToScrape
            : 0;

          updateProgress(
            'Scraping Artist Pages',
            70 + completion * 10,
            `Scraping artist pages ${batchRangeStart}-${Math.min(batchRangeEnd, totalArtistsToScrape)} / ${totalArtistsToScrape}`
          );

          const batchResults = await artistPageScraper.scrapeMultipleArtists(
            batch.map(b => b.targetUrl),
            3
          );

          allBatchResults.push(...batchResults);

          for (const result of batchResults) {
            if (result.spotifyUrl && result.spotifyId) {
              const { error } = await supabase
                .from('artists')
                .update({
                  spotify_url: result.spotifyUrl,
                  spotify_id: result.spotifyId,
                  last_updated_at: new Date().toISOString()
                })
                .eq('ade_id', result.adeId);

              if (!error) {
                addLog(`✅ Found Spotify URL for ${result.title}: ${result.spotifyId}`, 'success', 'parse', {
                  artistId: result.adeId,
                  artistName: result.title,
                  spotifyId: result.spotifyId,
                  spotifyUrl: result.spotifyUrl
                }, {
                  artistId: result.adeId,
                  spotifyId: result.spotifyId
                });
              } else {
                addLog(`❌ Failed to update Spotify URL for ${result.title}: ${error.message}`, 'error', 'parse', {
                  artistId: result.adeId,
                  artistName: result.title,
                  error: error.message
                }, {
                  artistId: result.adeId,
                  errorCode: error.code
                });
              }
            } else {
              addLog(`⚠️ No Spotify URL found for ${result.title}`, 'warning', 'parse', {
                artistId: result.adeId,
                artistName: result.title
              }, {
                artistId: result.adeId
              });
            }
          }

          processedCount += batch.length;

          // Respect rate limit between batches
          await new Promise(resolve => setTimeout(resolve, options.rateLimit || 1000));
        }

        // Account for artists we couldn't build a URL for in progress tracking
        if (missingUrlTargets.length) {
          processedCount += missingUrlTargets.length;
          const completion = totalArtistsToScrape > 0
            ? Math.min(processedCount, totalArtistsToScrape) / totalArtistsToScrape
            : 0;
          updateProgress(
            'Scraping Artist Pages',
            70 + completion * 10,
            `Processed ${Math.min(processedCount, totalArtistsToScrape)} / ${totalArtistsToScrape} artists`
          );
        }

        offset += fetchPageSize;

        // If we retrieved fewer records than requested we reached the end
        if (artistsPage.length < fetchPageSize) {
          break;
        }
      }

      addLog(`✅ Artist page scraping complete`, 'success', 'parse', {
        pagesScraped: allBatchResults.length,
        duration: Date.now() - startTime
      });
    } else {
      addLog(`ℹ️ All artists already have Spotify URLs`, 'info', 'parse');
    }
  }

  // Phase 6: Spotify Enrichment
  if (options.enrichArtists) {
    updateProgress('Enriching Artists', 80, 'Starting Spotify enrichment...');
    addLog('🎵 Phase 6: Spotify Enrichment', 'info', 'enrich', {
      phase: 'spotify_enrichment',
      startTime: Date.now()
    });
      
      // Get artists that haven't been enriched
      const { data: unenrichedArtists } = await supabase
        .from('artists')
        .select('id, title')
        .is('spotify_id', null)
        .limit(200);
      
      if (unenrichedArtists && unenrichedArtists.length > 0) {
        addLog(`📊 Found ${unenrichedArtists.length} artists to enrich`, 'info');
        
       for (let i = 0; i < unenrichedArtists.length; i++) {
          const artist = unenrichedArtists[i];
          const progress = 70 + (i / unenrichedArtists.length * 15);
          updateProgress('Enriching Artists', progress, `Enriching: ${artist.title}`, artist.title);
          broadcastProgress({ currentItem: artist.title });
          
          try {
            // Call the Spotify enrichment API
        // Prefer explicit public app URL; fall back to Vercel-provided hostname in prod; finally localhost for dev
        const base =
          process.env.NEXT_PUBLIC_APP_URL ||
          (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
        const response = await fetch(`${base}/api/spotify/enrich`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            artistId: artist.id,
            artistName: artist.title,
            forceOverride: !!options.forceRefresh
          })
        });
            
            if (response.ok) {
              const data = await response.json();
              if (data.success) {
                stats.artistsEnriched++;
                broadcastProgress({ currentItem: artist.title });
                addLog(`✅ Enriched: ${artist.title}`, 'success');
              } else {
                stats.enrichmentErrors++;
                broadcastProgress({ currentItem: artist.title });
                addLog(`⚠️ Failed to enrich ${artist.title}: ${data.error}`, 'warning');
              }
            } else {
              stats.enrichmentErrors++;
              broadcastProgress({ currentItem: artist.title });
              addLog(`❌ Error enriching ${artist.title}: ${response.statusText}`, 'error');
            }
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, options.rateLimit || 100));
            
          } catch (error) {
            stats.enrichmentErrors++;
            addLog(`❌ Exception enriching ${artist.title}: ${error}`, 'error');
            broadcastProgress({ currentItem: artist.title });
          }
        }
        
        addLog(`✅ Enrichment complete: ${stats.artistsEnriched} successful, ${stats.enrichmentErrors} errors`, 'success');
      } else {
        addLog('ℹ️ All artists already enriched or no artists found', 'info');
      }
    }

    // Phase 6: Analysis and Missing Data Check
    if (options.checkMissing) {
      updateProgress('Analyzing Data', 85, 'Finding missing connections and analyzing data...');
      addLog('🔍 Phase 6: Data Analysis', 'info');
      
      // Find artists with no events
      const { data: artistsWithoutEvents } = await supabase
        .from('artists')
        .select('id, title, ade_id')
        .eq('artist_events.count', 0);

      if (artistsWithoutEvents) {
        addLog(`📊 Found ${artistsWithoutEvents.length} artists without events`, 'info');
        
        for (const artist of artistsWithoutEvents) {
          // Try subtitle matching
          const { data: potentialEvents } = await supabase
            .from('events')
            .select('id, title, subtitle')
            .or(`subtitle.ilike.%${artist.title}%,title.ilike.%${artist.title}%`);

          if (potentialEvents && potentialEvents.length > 0) {
            stats.missingEvents.push({
              artist: artist.title,
              potentialEvents: potentialEvents.map(e => e.title)
            });
            addLog(`🔍 Found potential matches for ${artist.title}: ${potentialEvents.length} events`, 'info');
          }
        }
      }
      
      addLog(`✅ Analysis complete: ${stats.missingEvents.length} artists with potential matches found`, 'success');
    }

    // Phase 7: Generate Statistics
    if (options.generateStats) {
      updateProgress('Generating Stats', 95, 'Calculating final statistics...');
      addLog('📊 Phase 7: Generating Statistics', 'info');
      
      // Get final counts
      const { data: artistCount } = await supabase
        .from('artists')
        .select('id', { count: 'exact' });
      
      const { data: eventCount } = await supabase
        .from('events')
        .select('id', { count: 'exact' });
      
      const { data: linkCount } = await supabase
        .from('artist_events')
        .select('id', { count: 'exact' });
      
      addLog(`📈 Final Statistics:`, 'info');
      addLog(`   - Total Artists: ${artistCount?.length || 0}`, 'info');
      addLog(`   - Total Events: ${eventCount?.length || 0}`, 'info');
      addLog(`   - Total Links: ${linkCount?.length || 0}`, 'info');
      addLog(`   - Artists Enriched: ${stats.artistsEnriched}`, 'info');
      addLog(`   - Processing Errors: ${stats.errors}`, 'info');
    }

    // Complete
    const totalTime = Date.now() - startTime;
    addLog('🎉 Master Scraper completed successfully!', 'success');
    addLog(`⏱️ Total time: ${Math.round(totalTime / 1000)}s`, 'info');
    addLog(`📊 Total processed: ${stats.totalProcessed} items`, 'info');
    addLog(`✅ Success rate: ${Math.round(((stats.totalProcessed - stats.errors) / stats.totalProcessed) * 100)}%`, 'success');
    
    updateProgress('Complete', 100, 'Master Scraper completed successfully! 🎉');
    masterScraperProgress.set(sessionId, {
      phase: 'Complete',
      progress: 100,
      message: 'Master Scraper completed successfully!',
      currentItem: '',
      completed: true,
      stats,
      logs,
      startTime: new Date(startTime).toISOString(),
      estimatedTimeRemaining: 'Complete',
      totalTime: Math.round(totalTime / 1000),
      successRate: Math.round(((stats.totalProcessed - stats.errors) / stats.totalProcessed) * 100)
    });

    // Clean up after 30 minutes
    setTimeout(() => {
      masterScraperProgress.delete(sessionId);
    }, 30 * 60 * 1000);

  } catch (error) {
    addLog(`💥 Master Scraper failed: ${error}`, 'error');
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
  }

  const progress = masterScraperProgress.get(sessionId);
  
  if (!progress) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  return NextResponse.json(progress);
}
// @ts-nocheck
