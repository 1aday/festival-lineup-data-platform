import { NextRequest, NextResponse } from 'next/server';

// Proxy endpoint to fetch audio files and avoid CORS issues
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const audioUrl = searchParams.get('url');
    
    if (!audioUrl) {
      return NextResponse.json(
        { error: 'Audio URL is required' },
        { status: 400 }
      );
    }
    
    // Validate that it's a Spotify preview URL (be more lenient)
    if (!audioUrl.includes('spotify') && 
        !audioUrl.includes('mp3-preview') && 
        !audioUrl.includes('scdn') && 
        !audioUrl.includes('.mp3')) {
      return NextResponse.json(
        { error: 'Invalid audio URL' },
        { status: 400 }
      );
    }
    
    // Fetch the audio file with proper headers
    const audioResponse = await fetch(audioUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'audio/mpeg, audio/*, */*',
        'Accept-Encoding': 'identity', // Don't compress audio
        'Range': request.headers.get('range') || 'bytes=0-', // Support range requests
      },
    });
    
    if (!audioResponse.ok) {
      console.error('Failed to fetch audio:', audioResponse.status, audioResponse.statusText);
      return NextResponse.json(
        { error: `Failed to fetch audio: ${audioResponse.statusText}` },
        { status: audioResponse.status }
      );
    }
    
    // Stream the audio instead of buffering it all
    const audioStream = audioResponse.body;
    if (!audioStream) {
      return NextResponse.json(
        { error: 'No audio stream available' },
        { status: 500 }
      );
    }
    
    // Return the audio stream with proper headers
    const headers = new Headers({
      'Content-Type': audioResponse.headers.get('content-type') || 'audio/mpeg',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range',
      'Accept-Ranges': 'bytes',
    });
    
    // Pass through content-length if available
    const contentLength = audioResponse.headers.get('content-length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }
    
    // Pass through content-range if it's a partial response
    const contentRange = audioResponse.headers.get('content-range');
    if (contentRange) {
      headers.set('Content-Range', contentRange);
    }
    
    return new NextResponse(audioStream, {
      status: audioResponse.status === 206 ? 206 : 200,
      headers,
    });
    
  } catch (error: any) {
    console.error('Audio proxy error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to proxy audio' },
      { status: 500 }
    );
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
