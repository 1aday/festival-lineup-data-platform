import { NextResponse } from 'next/server';

export async function GET() {
  // Check if Spotify credentials are configured
  const clientId = process.env.SPOTIFY_CLIENT_ID || process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET;
  
  const hasCredentials = !!(clientId && clientSecret);
  
  if (!hasCredentials) {
    return NextResponse.json({
      configured: false,
      error: 'Spotify credentials are not configured',
      instructions: 'Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to your .env.local file'
    });
  }
  
  // Try to get an access token
  try {
    const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        configured: true,
        authenticated: false,
        error: `Failed to authenticate with Spotify: ${response.status}`,
        details: errorText
      });
    }
    
    const data = await response.json();
    
    return NextResponse.json({
      configured: true,
      authenticated: true,
      tokenType: data.token_type,
      expiresIn: data.expires_in,
      message: 'Spotify API is properly configured and working!'
    });
  } catch (error: any) {
    return NextResponse.json({
      configured: true,
      authenticated: false,
      error: 'Failed to connect to Spotify API',
      details: error.message
    });
  }
}
