import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { eventParser } from '@/lib/event-parser';

// Store parsing progress
export const parsingProgress = new Map<string, any>();

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { eventId, venueFilter, limit = 10, sessionId } = body;

    console.log(`Starting event lineup parsing, session: ${sessionId}`);

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Initialize progress
    parsingProgress.set(sessionId, {
      progress: 0,
      message: 'Fetching events...',
      completed: false,
      eventsParsed: 0,
      artistsFound: 0,
      linksCreated: 0
    });

    // Build query for events to parse
    let query = supabase
      .from('events')
      .select('id, ade_id, title, subtitle, url, venue_name')
      .not('url', 'is', null);

    if (eventId) {
      query = query.eq('id', eventId);
    } else if (venueFilter) {
      query = query.ilike('venue_name', `%${venueFilter}%`);
    }

    query = query.limit(limit);

    const { data: events, error } = await query;

    if (error || !events || events.length === 0) {
      parsingProgress.set(sessionId, {
        progress: 100,
        message: error ? `Error: ${error.message}` : 'No events found',
        completed: true
      });
      return NextResponse.json({ 
        error: error?.message || 'No events found',
        eventsFound: 0
      }, { status: error ? 500 : 404 });
    }

    console.log(`Found ${events.length} events to parse`);

    // Start parsing in background
    parseEventsInBackground(events, sessionId).catch(error => {
      console.error('Background parsing error:', error);
      parsingProgress.set(sessionId, {
        progress: 0,
        message: `Error: ${error.message}`,
        completed: true,
        error: true
      });
    });

    return NextResponse.json({
      success: true,
      sessionId,
      message: `Started parsing ${events.length} events`,
      eventsFound: events.length
    });

  } catch (error) {
    console.error('Error starting event parsing:', error);
    return NextResponse.json({ 
      error: String(error),
      message: 'Failed to start event parsing'
    }, { status: 500 });
  }
}

async function parseEventsInBackground(events: any[], sessionId: string) {
  let eventsParsed = 0;
  let totalArtistsFound = 0;
  let totalLinksCreated = 0;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    
    // Update progress
    const progress = ((i + 1) / events.length) * 100;
    parsingProgress.set(sessionId, {
      progress,
      message: `Parsing event ${i + 1}/${events.length}: ${event.title}`,
      completed: false,
      eventsParsed,
      artistsFound: totalArtistsFound,
      linksCreated: totalLinksCreated
    });

    try {
      console.log(`Parsing event: ${event.title} at ${event.venue_name}`);
      console.log(`URL: ${event.url}`);

      // Fetch and parse the event page
      const { lineup, metadata } = await eventParser.fetchAndParseEventPage(event.url);
      
      eventsParsed++;
      totalArtistsFound += lineup.length;

      console.log(`Found ${lineup.length} artists in lineup:`, lineup.map(a => a.name));

      // Store the parsed lineup in the event's raw_data
      const { error: updateError } = await supabase
        .from('events')
        .update({
          raw_data: {
            ...event.raw_data,
            parsed_lineup: lineup,
            parsed_metadata: metadata,
            parsed_at: new Date().toISOString()
          }
        })
        .eq('id', event.id);

      if (updateError) {
        console.error(`Failed to update event ${event.id}:`, updateError);
        continue;
      }

      // Now link artists to the event
      for (const lineupArtist of lineup) {
        // Try to find the artist by ADE ID first
        let artistQuery = supabase
          .from('artists')
          .select('id, title')
          .eq('ade_id', lineupArtist.adeId)
          .single();

        const { data: artistByAdeId } = await artistQuery;
        
        let artist = artistByAdeId;

        // If not found by ADE ID, try by name
        if (!artist) {
          const { data: artistByName } = await supabase
            .from('artists')
            .select('id, title')
            .ilike('title', lineupArtist.name)
            .single();
          
          artist = artistByName;
        }

        if (artist) {
          // Check if link already exists
          const { data: existingLink } = await supabase
            .from('artist_events')
            .select('id')
            .eq('artist_id', artist.id)
            .eq('event_id', event.id)
            .single();

          if (!existingLink) {
            // Create the link
            const { error: linkError } = await supabase
              .from('artist_events')
              .insert({
                artist_id: artist.id,
                event_id: event.id,
                confidence: 1.0, // High confidence since it's from the actual event page
                source: 'event_page_parser',
                match_details: {
                  type: 'lineup_page',
                  artist_name: lineupArtist.name,
                  artist_ade_id: lineupArtist.adeId,
                  profile_url: lineupArtist.profileUrl
                }
              });

            if (!linkError) {
              totalLinksCreated++;
              console.log(`✅ Linked ${artist.title} to ${event.title}`);
            } else {
              console.error(`Failed to create link:`, linkError);
            }
          } else {
            console.log(`⏭️ Link already exists for ${artist.title} <-> ${event.title}`);
          }
        } else {
          console.log(`⚠️ Artist not found in database: ${lineupArtist.name} (ADE ID: ${lineupArtist.adeId})`);
        }
      }

      // Rate limiting - wait 1 second between requests
      if (i < events.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      console.error(`Error parsing event ${event.id}:`, error);
    }
  }

  // Mark as completed
  parsingProgress.set(sessionId, {
    progress: 100,
    message: 'Parsing complete!',
    completed: true,
    eventsParsed,
    artistsFound: totalArtistsFound,
    linksCreated: totalLinksCreated
  });

  // Clean up after 5 minutes
  setTimeout(() => {
    parsingProgress.delete(sessionId);
  }, 5 * 60 * 1000);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
  }

  const progress = parsingProgress.get(sessionId);
  
  if (!progress) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  return NextResponse.json(progress);
}
