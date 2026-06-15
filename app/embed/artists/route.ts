import { NextRequest, NextResponse } from 'next/server';

import { supabase } from '@/lib/supabase';
import { validateWidgetAccess } from '@/lib/widget-access';

export async function GET(request: NextRequest) {
  const gate = await validateWidgetAccess(request, 'artists');
  if (!gate.allowed) {
    return gate.response as NextResponse;
  }

  const { data: artists } = await supabase
    .from('artists')
    .select('title,country_label,popularity,followers,spotify_url')
    .eq('is_active', true)
    .order('popularity', { ascending: false, nullsFirst: false })
    .limit(20);

  const cards = (artists || [])
    .map(
      (artist) => `<article class="card">
        <h2>${artist.title}</h2>
        <p>${artist.country_label || 'Unknown country'}</p>
        <p>Popularity: ${artist.popularity ?? '-'}</p>
        <p>Followers: ${artist.followers ?? '-'}</p>
        ${artist.spotify_url ? `<a href="${artist.spotify_url}" target="_blank" rel="noreferrer">Spotify</a>` : ''}
      </article>`
    )
    .join('');

  const branding = gate.plan === 'white_label' ? '' : '<p class="brand">Powered by LineupBase embeds</p>';

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { margin: 0; font-family: Arial, sans-serif; background: #0f1115; color: #f6f7fb; }
      .wrap { padding: 16px; }
      h1 { margin: 0 0 12px; font-size: 18px; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
      .card { border: 1px solid #292b31; border-radius: 8px; padding: 10px; background: #171a20; }
      .card h2 { margin: 0 0 6px; font-size: 14px; }
      .card p { margin: 0 0 5px; color: #c5c7cf; font-size: 12px; }
      .card a { color: #ffe25a; font-size: 12px; text-decoration: none; }
      .brand { margin-top: 10px; color: #8a8d96; font-size: 12px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <h1>Trending Featured Festival Artists</h1>
      <div class="grid">${cards || '<p>No artist data found.</p>'}</div>
      ${branding}
    </div>
  </body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
