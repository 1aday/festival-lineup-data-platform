import { supabase } from '@/lib/supabase';
import { rowsToCsv } from '@/lib/monetization-server';
import type { ReportTier } from '@/lib/monetization-types';

export interface GeneratedReport {
  tier: ReportTier;
  generatedAt: string;
  summary: {
    artists: number;
    events: number;
    venues: number;
    countries: number;
  };
  topArtists: Array<{ name: string; popularity: number | null; followers: number | null }>;
  topVenues: Array<{ venue: string; events: number }>;
  topCategories: Array<{ category: string; events: number }>;
  eventDates: Array<{ date: string; events: number }>;
}

interface ArtistRow {
  title: string;
  popularity: number | null;
  followers: number | null;
  country_label: string | null;
}

interface EventRow {
  venue_name: string | null;
  categories: string | null;
  start_date: string | null;
}

function normalizeCategory(raw: string): string[] {
  return raw
    .split(/[|/,]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export async function buildInsightsReport(tier: ReportTier): Promise<GeneratedReport> {
  const [{ count: artistCount }, { count: eventCount }, artistsRes, eventsRes] = await Promise.all([
    supabase.from('artists').select('*', { count: 'exact', head: true }),
    supabase.from('events').select('*', { count: 'exact', head: true }),
    supabase
      .from('artists')
      .select('title, popularity, followers, country_label')
      .order('popularity', { ascending: false, nullsFirst: false })
      .limit(tier === 'full' ? 100 : 25),
    supabase
      .from('events')
      .select('venue_name, categories, start_date')
      .limit(tier === 'full' ? 5000 : 2000),
  ]);

  const artists: ArtistRow[] = artistsRes.data || [];
  const events: EventRow[] = eventsRes.data || [];

  const countries = new Set(artists.map((a) => a.country_label).filter(Boolean));

  const venueCount = new Map<string, number>();
  const categoryCount = new Map<string, number>();
  const dateCount = new Map<string, number>();

  for (const event of events) {
    if (event.venue_name) {
      venueCount.set(event.venue_name, (venueCount.get(event.venue_name) || 0) + 1);
    }

    if (event.categories) {
      const categories = normalizeCategory(event.categories);
      for (const cat of categories) {
        categoryCount.set(cat, (categoryCount.get(cat) || 0) + 1);
      }
    }

    if (event.start_date) {
      const date = new Date(event.start_date).toISOString().slice(0, 10);
      dateCount.set(date, (dateCount.get(date) || 0) + 1);
    }
  }

  const report: GeneratedReport = {
    tier,
    generatedAt: new Date().toISOString(),
    summary: {
      artists: Number(artistCount || 0),
      events: Number(eventCount || 0),
      venues: venueCount.size,
      countries: countries.size,
    },
    topArtists: artists
      .map((row) => ({
        name: row.title,
        popularity: row.popularity,
        followers: row.followers,
      }))
      .slice(0, tier === 'full' ? 100 : 25),
    topVenues: Array.from(venueCount.entries())
      .map(([venue, count]) => ({ venue, events: count }))
      .sort((a, b) => b.events - a.events)
      .slice(0, tier === 'full' ? 50 : 15),
    topCategories: Array.from(categoryCount.entries())
      .map(([category, count]) => ({ category, events: count }))
      .sort((a, b) => b.events - a.events)
      .slice(0, tier === 'full' ? 60 : 20),
    eventDates: Array.from(dateCount.entries())
      .map(([date, count]) => ({ date, events: count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };

  return report;
}

export function reportToCsv(report: GeneratedReport): string {
  const rows: Record<string, unknown>[] = [];

  rows.push({
    section: 'summary',
    key: 'artists',
    value: report.summary.artists,
  });
  rows.push({ section: 'summary', key: 'events', value: report.summary.events });
  rows.push({ section: 'summary', key: 'venues', value: report.summary.venues });
  rows.push({ section: 'summary', key: 'countries', value: report.summary.countries });

  report.topArtists.forEach((artist, index) => {
    rows.push({
      section: 'top_artists',
      rank: index + 1,
      name: artist.name,
      popularity: artist.popularity,
      followers: artist.followers,
    });
  });

  report.topVenues.forEach((venue, index) => {
    rows.push({
      section: 'top_venues',
      rank: index + 1,
      venue: venue.venue,
      events: venue.events,
    });
  });

  report.topCategories.forEach((cat, index) => {
    rows.push({
      section: 'top_categories',
      rank: index + 1,
      category: cat.category,
      events: cat.events,
    });
  });

  report.eventDates.forEach((d) => {
    rows.push({
      section: 'event_dates',
      date: d.date,
      events: d.events,
    });
  });

  return rowsToCsv(rows);
}

export function reportToHtml(report: GeneratedReport): string {
  const venueRows = report.topVenues
    .map((v) => `<tr><td>${v.venue}</td><td>${v.events}</td></tr>`)
    .join('');

  const artistRows = report.topArtists
    .slice(0, 20)
    .map((a) => `<tr><td>${a.name}</td><td>${a.popularity ?? '-'}</td><td>${a.followers ?? '-'}</td></tr>`)
    .join('');

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Festival Intelligence Pack (${report.tier})</title>
    <style>
      body { font-family: Arial, sans-serif; color: #111; margin: 24px; }
      h1, h2 { margin: 0 0 8px; }
      table { border-collapse: collapse; width: 100%; margin: 12px 0 24px; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      .meta { margin-bottom: 16px; color: #444; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
      .card { border: 1px solid #ddd; padding: 10px; border-radius: 8px; }
    </style>
  </head>
  <body>
    <h1>Festival Intelligence Pack (${report.tier.toUpperCase()})</h1>
    <p class="meta">Generated at: ${report.generatedAt}</p>
    <div class="grid">
      <div class="card"><strong>Artists</strong><br/>${report.summary.artists}</div>
      <div class="card"><strong>Events</strong><br/>${report.summary.events}</div>
      <div class="card"><strong>Venues</strong><br/>${report.summary.venues}</div>
      <div class="card"><strong>Countries</strong><br/>${report.summary.countries}</div>
    </div>
    <h2>Top Venues</h2>
    <table>
      <thead><tr><th>Venue</th><th>Events</th></tr></thead>
      <tbody>${venueRows}</tbody>
    </table>
    <h2>Top Artists</h2>
    <table>
      <thead><tr><th>Name</th><th>Popularity</th><th>Followers</th></tr></thead>
      <tbody>${artistRows}</tbody>
    </table>
  </body>
</html>`;
}
