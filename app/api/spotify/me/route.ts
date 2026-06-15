import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('spotify_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user profile
    const userResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      // Token might be expired, try to refresh
      if (userResponse.status === 401) {
        const refreshToken = cookieStore.get('spotify_refresh_token')?.value;
        if (refreshToken) {
          const refreshed = await refreshAccessToken(refreshToken);
          if (refreshed) {
            // Retry with new token
            const retryResponse = await fetch('https://api.spotify.com/v1/me', {
              headers: {
                'Authorization': `Bearer ${refreshed.access_token}`,
              },
            });
            
            if (retryResponse.ok) {
              const userData = await retryResponse.json();
              return NextResponse.json(userData);
            }
          }
        }
      }
      
      return NextResponse.json({ error: 'Failed to fetch user data' }, { status: userResponse.status });
    }

    const userData = await userResponse.json();
    return NextResponse.json(userData);
    
  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function refreshAccessToken(refreshToken: string) {
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const tokenData = await response.json();
    
    // Update cookies with new token
    const cookieStore = await cookies();
    const expires = new Date(Date.now() + tokenData.expires_in * 1000);
    
    cookieStore.set('spotify_access_token', tokenData.access_token, {
      expires,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return tokenData;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}
