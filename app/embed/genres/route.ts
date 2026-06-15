import { NextRequest, NextResponse } from 'next/server';

import { supabase } from '@/lib/supabase';
import { validateWidgetAccess } from '@/lib/widget-access';

function normalizeCategories(raw: string): string[] {
  return raw
    .split(/[|/,]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export async function GET(request: NextRequest) {
  const gate = await validateWidgetAccess(request, 'genres');
  if (!gate.allowed) {
    return gate.response as NextResponse;
  }

  const { data: events } = await supabase
    .from('events')
    .select('categories')
    .limit(5000);

  const counts = new Map<string, number>();
  for (const row of events || []) {
    if (!row.categories) continue;
    const categories = normalizeCategories(row.categories);
    for (const category of categories) {
      counts.set(category, (counts.get(category) || 0) + 1);
    }
  }

  const top = Array.from(counts.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 30);

  const bars = top
    .map((row) => {
      const max = top[0]?.total || 1;
      const pct = Math.round((row.total / max) * 100);
      return `<div class="row"><span>${row.category}</span><span>${row.total}</span><div class="bar"><i style="width:${pct}%"></i></div></div>`;
    })
    .join('');

  const branding = gate.plan === 'white_label' ? '' : '<p class="brand">Powered by LineupBase embeds</p>';

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { margin: 0; font-family: Arial, sans-serif; background: #0f1316; color: #eef1f4; }
      .wrap { padding: 16px; }
      h1 { margin: 0 0 12px; font-size: 18px; }
      .row { margin-bottom: 8px; }
      .row span:first-child { display: inline-block; min-width: 160px; font-size: 13px; }
      .row span:last-child { font-size: 12px; color: #c6cbd0; margin-left: 8px; }
      .bar { margin-top: 4px; height: 6px; background: #252c32; border-radius: 999px; overflow: hidden; }
      .bar i { display: block; height: 100%; background: linear-gradient(90deg, #ffe25a, #ffc22f); }
      .brand { margin-top: 12px; color: #8f949a; font-size: 12px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <h1>Festival Genre Heatmap</h1>
      ${bars || '<p>No genre data found.</p>'}
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
