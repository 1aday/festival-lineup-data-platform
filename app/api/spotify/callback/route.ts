import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    console.error('Spotify auth error:', error);
    const originRaw = process.env.NEXT_PUBLIC_APP_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    const origin = originRaw.replace(/\/+$/, '');
    const safeError = encodeURIComponent(error);

    return NextResponse.redirect(`${origin}/?spotify_error=${safeError}`);
  }

  if (!code) {
    const originRaw = process.env.NEXT_PUBLIC_APP_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    const origin = originRaw.replace(/\/+$/, '');
    return NextResponse.redirect(`${origin}/?spotify_error=no_code`);
  }

  try {
    // Exchange code for access token
    const originRaw = process.env.NEXT_PUBLIC_APP_URL || `${new URL(request.url).protocol}//${new URL(request.url).host}`;
    const origin = originRaw.replace(/\/+$/, '');
    const redirectUri = `${origin}/api/spotify/callback`;

    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();
    
    // Get user profile
    const userResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error(`User fetch failed: ${userResponse.statusText}`);
    }

    const userData = await userResponse.json();

    // Store tokens in httpOnly cookies
    const cookieStore = await cookies();
    const expires = new Date(Date.now() + tokenData.expires_in * 1000);
    
    cookieStore.set('spotify_access_token', tokenData.access_token, {
      expires,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    cookieStore.set('spotify_refresh_token', tokenData.refresh_token, {
      expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    cookieStore.set('spotify_user_id', userData.id, {
      expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    // Redirect to homepage to process matches inline
    const appUrl = origin;
    return NextResponse.redirect(`${appUrl}/?matches=1`);
    
  } catch (error) {
    console.error('Spotify callback error:', error);
    const originRawErr = process.env.NEXT_PUBLIC_APP_URL || `${new URL(request.url).protocol}//${new URL(request.url).host}`;
    const appUrl = originRawErr.replace(/\/+$/, '');
    return NextResponse.redirect(`${appUrl}/?spotify_error=callback_failed`);
  }
}
