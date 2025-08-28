import { NextRequest, NextResponse } from 'next/server';
import { artistEventMatcher } from '@/lib/artist-event-matcher';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { linkingProgress } from './progress/route';

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { mode = 'all', artistId, sessionId } = body;

    console.log(`Starting artist-event linking in mode: ${mode}, session: ${sessionId}`);

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Initialize progress
    linkingProgress.set(sessionId, {
      progress: 0,
      message: 'Initializing...',
      completed: false
    });

    if (mode === 'single' && artistId) {
      // Link single artist
      const { data: artist } = await supabase
        .from('artists')
        .select('*')
        .eq('id', artistId)
        .single();

      if (!artist) {
        linkingProgress.delete(sessionId);
        return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
      }

      const matches = await artistEventMatcher.findEventsForArtist(artist);
      
      linkingProgress.set(sessionId, {
        progress: 100,
        message: 'Complete!',
        stats: {
          artist: artist.title,
          matches: matches.length,
          details: matches
        },
        completed: true
      });

      return NextResponse.json({
        success: true,
        sessionId,
        artist: artist.title,
        matches: matches.length,
        details: matches
      });
    } else {
      // Start linking in background
      artistEventMatcher.linkAllArtistsToEvents(
        (progress, message) => {
          console.log(`Progress: ${progress.toFixed(1)}% - ${message}`);
          
          // Update progress in memory
          const currentProgress = linkingProgress.get(sessionId);
          if (currentProgress && !currentProgress.completed) {
            linkingProgress.set(sessionId, {
              ...currentProgress,
              progress,
              message
            });
          }
        }
      ).then(results => {
        // Mark as completed
        linkingProgress.set(sessionId, {
          progress: 100,
          message: 'Linking complete!',
          stats: results,
          completed: true
        });
        
        // Clean up after 5 minutes
        setTimeout(() => {
          linkingProgress.delete(sessionId);
        }, 5 * 60 * 1000);
      }).catch(error => {
        console.error('Linking error:', error);
        linkingProgress.set(sessionId, {
          progress: 0,
          message: `Error: ${error.message}`,
          completed: true
        });
      });

      return NextResponse.json({
        success: true,
        sessionId,
        message: 'Linking started in background'
      });
    }
  } catch (error) {
    console.error('Error linking artists to events:', error);
    return NextResponse.json({ 
      error: String(error),
      message: 'Failed to link artists to events'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const searchParams = request.nextUrl.searchParams;
  const artistId = searchParams.get('artistId');
  const eventId = searchParams.get('eventId');

  try {
    if (artistId) {
      // Get events for an artist
      const events = await artistEventMatcher.getArtistEvents(Number(artistId));
      return NextResponse.json({ 
        artistId: Number(artistId), 
        events 
      });
    } else if (eventId) {
      // Get artists for an event
      const artists = await artistEventMatcher.getEventArtists(Number(eventId));
      return NextResponse.json({ 
        eventId: Number(eventId), 
        artists 
      });
    } else {
      // Get summary statistics
      const { data: stats } = await supabase
        .from('artist_events')
        .select('confidence')
        .order('confidence', { ascending: false });

      const totalLinks = stats?.length || 0;
      const highConfidence = stats?.filter(s => s.confidence >= 0.9).length || 0;
      const mediumConfidence = stats?.filter(s => s.confidence >= 0.7 && s.confidence < 0.9).length || 0;
      const lowConfidence = stats?.filter(s => s.confidence < 0.7).length || 0;

      return NextResponse.json({
        totalLinks,
        highConfidence,
        mediumConfidence,
        lowConfidence,
        averageConfidence: totalLinks > 0 
          ? stats!.reduce((sum, s) => sum + s.confidence, 0) / totalLinks 
          : 0
      });
    }
  } catch (error) {
    console.error('Error fetching artist-event data:', error);
    return NextResponse.json({ 
      error: String(error)
    }, { status: 500 });
  }
}
