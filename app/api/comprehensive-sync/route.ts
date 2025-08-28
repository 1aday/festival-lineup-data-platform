import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { adeApi } from '@/lib/ade-api';
import { eventParser } from '@/lib/event-parser';
import { artistEventMatcher } from '@/lib/artist-event-matcher';

// Store sync progress
export const syncProgress = new Map<string, any>();

interface SyncOptions {
  syncArtists?: boolean;
  syncEvents?: boolean;
  parseLineups?: boolean;
  linkArtists?: boolean;
  enrichArtists?: boolean;
  checkMissing?: boolean;
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
        checkMissing: true
      }
    }: { sessionId: string; options?: SyncOptions } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Initialize progress
    syncProgress.set(sessionId, {
      phase: 'Starting',
      progress: 0,
      message: 'Initializing comprehensive sync...',
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
        missingArtists: []
      },
      currentItem: '',
      logs: []
    });

    // Start sync in background
    performComprehensiveSync(sessionId, options).catch(error => {
      console.error('Sync error:', error);
      syncProgress.set(sessionId, {
        ...syncProgress.get(sessionId),
        completed: true,
        error: error.message
      });
    });

    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Comprehensive sync started'
    });

  } catch (error) {
    console.error('Error starting sync:', error);
    return NextResponse.json({ 
      error: String(error),
      message: 'Failed to start comprehensive sync'
    }, { status: 500 });
  }
}

async function performComprehensiveSync(sessionId: string, options: SyncOptions) {
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
    missingArtists: [] as any[]
  };

  const logs: string[] = [];
  const addLog = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    logs.push(`[${timestamp}] ${type.toUpperCase()}: ${message}`);
    if (logs.length > 100) logs.shift(); // Keep last 100 logs
    console.log(`[${type}] ${message}`);
  };

  const updateProgress = (phase: string, progress: number, message: string, currentItem?: string) => {
    syncProgress.set(sessionId, {
      phase,
      progress,
      message,
      currentItem: currentItem || '',
      completed: false,
      stats,
      logs
    });
  };

  try {
    // Phase 1: Sync all artists from ADE API
    if (options.syncArtists) {
      updateProgress('Syncing Artists', 5, 'Fetching all artists from ADE API...');
      
      const allArtists = await adeApi.fetchAllArtists((page, artists) => {
        updateProgress('Syncing Artists', 5 + (page * 1), `Fetched artist page ${page} (${artists.length} artists)`);
      });

      console.log(`Fetched ${allArtists.length} artists from ADE API`);
      
      // Sync artists to database
      for (let i = 0; i < allArtists.length; i++) {
        if (i % 50 === 0) {
          updateProgress('Syncing Artists', 10 + (i / allArtists.length * 15), `Syncing artist ${i}/${allArtists.length}`);
        }

        const artist = allArtists[i];
        const cleanedArtist = adeApi.cleanArtistData(artist);
        
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
          }
        }
      }
    }

    // Phase 2: Sync all events from ADE API
    if (options.syncEvents) {
      updateProgress('Syncing Events', 25, 'Fetching all events from ADE API...');
      
      const allEvents = await adeApi.fetchAllEvents((page, events) => {
        updateProgress('Syncing Events', 25 + (page * 1), `Fetched page ${page} (${events.length} events)`);
      });

      console.log(`Fetched ${allEvents.length} events from ADE API`);
      
      // Sync events to database
      for (let i = 0; i < allEvents.length; i++) {
        if (i % 10 === 0) {
          updateProgress('Syncing Events', 30 + (i / allEvents.length * 20), `Syncing event ${i}/${allEvents.length}`);
        }

        const event = allEvents[i];
        const cleanedEvent = adeApi.cleanEventData(event);
        
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
          }
        }
      }
    }

    // Phase 3: Parse event lineups from web pages
    if (options.parseLineups) {
      updateProgress('Parsing Lineups', 50, 'Fetching events to parse...');
      
      // Get all events with URLs
      const { data: events, error } = await supabase
        .from('events')
        .select('id, ade_id, title, url')
        .not('url', 'is', null)
        .order('id');

      if (error || !events) {
        throw new Error('Failed to fetch events for parsing');
      }

      console.log(`Found ${events.length} events to parse`);

      // Parse events in batches
      const batchSize = 10;
      for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, Math.min(i + batchSize, events.length));
        const progress = 50 + (i / events.length * 30);
        updateProgress('Parsing Lineups', progress, `Parsing events ${i}-${i + batch.length}/${events.length}`);

        // Parse batch in parallel
        await Promise.all(batch.map(async (event) => {
          try {
            const { lineup } = await eventParser.fetchAndParseEventPage(event.url);
            
            if (lineup.length > 0) {
              stats.lineupsParsed++;
              stats.artistsFound += lineup.length;

              // Store lineup in event
              await supabase
                .from('events')
                .update({
                  raw_data: {
                    ...event.raw_data,
                    parsed_lineup: lineup,
                    parsed_at: new Date().toISOString()
                  }
                })
                .eq('id', event.id);
            }
          } catch (error) {
            console.error(`Failed to parse event ${event.id}:`, error);
          }
        }));

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Phase 4: Create artist-event links
    if (options.linkArtists) {
      updateProgress('Linking Artists', 80, 'Creating artist-event connections...');
      
      // Get all events with parsed lineups
      const { data: events } = await supabase
        .from('events')
        .select('id, ade_id, title, raw_data')
        .not('raw_data->parsed_lineup', 'is', null);

      if (events) {
        for (let i = 0; i < events.length; i++) {
          if (i % 10 === 0) {
            updateProgress('Linking Artists', 80 + (i / events.length * 15), `Linking event ${i}/${events.length}`);
          }

          const event = events[i];
          const lineup = event.raw_data?.parsed_lineup || [];

          for (const lineupArtist of lineup) {
            // Find artist in database
            const { data: artist } = await supabase
              .from('artists')
              .select('id')
              .or(`ade_id.eq.${lineupArtist.adeId},title.ilike.${lineupArtist.name}`)
              .single();

            if (artist) {
              // Check if link exists
              const { data: existingLink } = await supabase
                .from('artist_events')
                .select('id')
                .eq('artist_id', artist.id)
                .eq('event_id', event.id)
                .single();

              if (!existingLink) {
                // Create link
                const { error } = await supabase
                  .from('artist_events')
                  .insert({
                    artist_id: artist.id,
                    event_id: event.id,
                    confidence: 1.0,
                    source: 'comprehensive_sync',
                    match_details: {
                      artist_name: lineupArtist.name,
                      artist_ade_id: lineupArtist.adeId
                    }
                  });

                if (!error) {
                  stats.linksCreated++;
                }
              }
            } else {
              stats.missingArtists.push({
                name: lineupArtist.name,
                adeId: lineupArtist.adeId,
                event: event.title
              });
            }
          }
        }
      }
    }

    // Phase 5: Spotify Enrichment for Artists
    if (options.enrichArtists) {
      updateProgress('Enriching Artists', 85, 'Starting Spotify enrichment...');
      addLog('🎵 Starting Spotify enrichment phase', 'info');
      
      // Get artists that haven't been enriched
      const { data: unenrichedArtists } = await supabase
        .from('artists')
        .select('id, title')
        .is('spotify_id', null)
        .limit(100);
      
      if (unenrichedArtists && unenrichedArtists.length > 0) {
        addLog(`Found ${unenrichedArtists.length} artists to enrich`, 'info');
        
        for (let i = 0; i < unenrichedArtists.length; i++) {
          const artist = unenrichedArtists[i];
          const progress = 85 + (i / unenrichedArtists.length * 10);
          updateProgress('Enriching Artists', progress, `Enriching: ${artist.title}`, artist.title);
          
          try {
            // Call the Spotify enrichment API
            const response = await fetch('http://localhost:3000/api/spotify/enrich', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                artistId: artist.id,
                artistName: artist.title
              })
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.success) {
                stats.artistsEnriched++;
                addLog(`✅ Enriched: ${artist.title}`, 'success');
              } else {
                stats.enrichmentErrors++;
                addLog(`⚠️ Failed to enrich ${artist.title}: ${data.error}`, 'warning');
              }
            } else {
              stats.enrichmentErrors++;
              addLog(`❌ Error enriching ${artist.title}: ${response.statusText}`, 'error');
            }
            
            // Rate limiting - wait 100ms between requests
            await new Promise(resolve => setTimeout(resolve, 100));
            
          } catch (error) {
            stats.enrichmentErrors++;
            addLog(`❌ Exception enriching ${artist.title}: ${error}`, 'error');
          }
        }
        
        addLog(`Enrichment complete: ${stats.artistsEnriched} successful, ${stats.enrichmentErrors} errors`, 'info');
      } else {
        addLog('All artists already enriched or no artists found', 'info');
      }
    }

    // Phase 6: Check for missing connections
    if (options.checkMissing) {
      updateProgress('Checking Missing', 95, 'Finding artists without events...');
      
      // Find artists with no events
      const { data: artistsWithoutEvents } = await supabase
        .from('artists')
        .select('id, title, ade_id')
        .eq('artist_events.count', 0);

      if (artistsWithoutEvents) {
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
          }
        }
      }
    }

    // Complete
    addLog('🎉 Comprehensive sync completed!', 'success');
    addLog(`Total Artists: ${stats.artistsAdded + stats.artistsUpdated}`, 'info');
    addLog(`Total Events: ${stats.eventsAdded + stats.eventsUpdated}`, 'info');
    addLog(`Lineups Parsed: ${stats.lineupsParsed}`, 'info');
    addLog(`Links Created: ${stats.linksCreated}`, 'info');
    addLog(`Artists Enriched: ${stats.artistsEnriched}`, 'info');
    
    updateProgress('Complete', 100, 'Comprehensive sync completed successfully! 🎉');
    syncProgress.set(sessionId, {
      phase: 'Complete',
      progress: 100,
      message: 'Sync completed successfully',
      currentItem: '',
      completed: true,
      stats,
      logs
    });

    // Clean up after 10 minutes
    setTimeout(() => {
      syncProgress.delete(sessionId);
    }, 10 * 60 * 1000);

  } catch (error) {
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
  }

  const progress = syncProgress.get(sessionId);
  
  if (!progress) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  return NextResponse.json(progress);
}
