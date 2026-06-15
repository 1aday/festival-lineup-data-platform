import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || process.env.SPOTIFY_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!clientId) {
    return NextResponse.json({ error: 'Missing Spotify client id' }, { status: 500 });
  }

  // Derive origin if NEXT_PUBLIC_APP_URL is not set and normalize to avoid trailing slash
  const fallbackOrigin = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const rawOrigin = appUrl && appUrl.length > 0 ? appUrl : fallbackOrigin;
  const origin = rawOrigin.replace(/\/+$/, '');
  const redirectUri = `${origin}/api/spotify/callback`;

  const scopes = [
    'user-read-private',
    'user-read-email',
    'user-top-read',
    'user-library-read',
    'user-follow-read',
    'playlist-read-private',
    'user-read-recently-played',
  ].join(' ');

  const authUrl = new URL('https://accounts.spotify.com/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('show_dialog', 'true');

  return NextResponse.redirect(authUrl.toString());
}
