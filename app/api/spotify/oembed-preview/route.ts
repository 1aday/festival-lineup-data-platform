import { NextRequest, NextResponse } from 'next/server';

// Use Spotify's oEmbed API to try getting preview URLs
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const trackId = searchParams.get('trackId');
    
    if (!trackId) {
      return NextResponse.json(
        { error: 'Track ID is required' },
        { status: 400 }
      );
    }
    
    // Try oEmbed API
    const oembedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`;
    const response = await fetch(oembedUrl);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to get oEmbed data' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    // Parse the HTML to extract preview URL if available
    if (data.html) {
      // Look for preview_url in the iframe HTML
      const previewMatch = data.html.match(/preview_url['"]*[:=]['"]*([^'"]+)/);
      if (previewMatch) {
        return NextResponse.json({
          success: true,
          previewUrl: previewMatch[1],
          trackName: data.title,
        });
      }
    }
    
    return NextResponse.json({
      success: false,
      previewUrl: null,
      message: 'No preview URL found in oEmbed data'
    });
    
  } catch (error: any) {
    console.error('oEmbed error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get preview' },
      { status: 500 }
    );
  }
}
