import { NextRequest, NextResponse } from 'next/server';

import { supabase } from '@/lib/supabase';
import { validateWidgetAccess } from '@/lib/widget-access';

export async function GET(request: NextRequest) {
  const gate = await validateWidgetAccess(request, 'lineup');
  if (!gate.allowed) {
    return gate.response as NextResponse;
  }

  const nowIso = new Date().toISOString();
  const { data: events } = await supabase
    .from('events')
    .select('title,start_date,venue_name,categories,url')
    .gte('start_date', nowIso)
    .order('start_date', { ascending: true })
    .limit(18);

  const rows = (events || [])
    .map((event) => {
      const date = new Date(event.start_date).toLocaleString();
      return `<tr>
        <td>${event.title}</td>
        <td>${date}</td>
        <td>${event.venue_name || '-'}</td>
        <td>${event.categories || '-'}</td>
        <td>${event.url ? `<a href="${event.url}" target="_blank" rel="noreferrer">Open</a>` : '-'}</td>
      </tr>`;
    })
    .join('');

  const branding =
    gate.plan === 'white_label'
      ? ''
      : '<p class="brand">Powered by LineupBase embeds</p>';

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { margin: 0; font-family: Arial, sans-serif; background: #0b0b0c; color: #f5f5f5; }
      .wrap { padding: 16px; }
      h1 { font-size: 18px; margin: 0 0 12px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th, td { border-bottom: 1px solid #2b2b30; padding: 8px; text-align: left; vertical-align: top; }
      th { color: #ccccd1; font-weight: 600; }
      a { color: #ffe25a; text-decoration: none; }
      .brand { margin-top: 10px; color: #8a8a90; font-size: 12px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <h1>Featured Festival Lineup Calendar</h1>
      <table>
        <thead>
          <tr><th>Event</th><th>Start</th><th>Venue</th><th>Genres</th><th></th></tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="5">No upcoming events found.</td></tr>'}
        </tbody>
      </table>
      ${branding}
    </div>
  </body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Frame-Options': 'ALLOWALL',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
