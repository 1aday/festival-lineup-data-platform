import type { ConciergeTier } from '@/lib/monetization-types';

export interface ConciergeEvent {
  id: number;
  title: string;
  start_date: string;
  end_date: string;
  venue_name: string | null;
  categories: string | null;
  sold_out: boolean;
  url: string | null;
}

export interface ConciergePlan {
  selected: ConciergeEvent[];
  rejected: Array<{ event: ConciergeEvent; reason: string }>;
  notes: string[];
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function buildConciergePlan(
  events: ConciergeEvent[],
  travelBufferMinutes: number,
  preferredGenres: string[] = [],
  maxEvents: number = 8
): ConciergePlan {
  const sorted = [...events].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  const selected: ConciergeEvent[] = [];
  const rejected: Array<{ event: ConciergeEvent; reason: string }> = [];

  let lastEnd: Date | null = null;

  for (const event of sorted) {
    if (selected.length >= maxEvents) {
      rejected.push({ event, reason: 'max_events_reached' });
      continue;
    }

    if (preferredGenres.length > 0) {
      const normalized = (event.categories || '').toLowerCase();
      const matches = preferredGenres.some((genre) => normalized.includes(genre.toLowerCase()));
      if (!matches) {
        rejected.push({ event, reason: 'outside_preferred_genres' });
        continue;
      }
    }

    const start = new Date(event.start_date);
    const end = new Date(event.end_date);

    if (lastEnd) {
      const earliestAllowed = addMinutes(lastEnd, travelBufferMinutes);
      if (start.getTime() < earliestAllowed.getTime()) {
        rejected.push({ event, reason: 'schedule_conflict' });
        continue;
      }
    }

    selected.push(event);
    lastEnd = end;
  }

  const notes: string[] = [];
  notes.push(`Selected ${selected.length} events from ${events.length} candidates.`);
  notes.push(`Travel buffer: ${travelBufferMinutes} minutes between events.`);

  if (preferredGenres.length > 0) {
    notes.push(`Genre filter applied: ${preferredGenres.join(', ')}`);
  }

  return { selected, rejected, notes };
}

function icsEscape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function toIcsDate(input: string): string {
  return new Date(input).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function buildIcs(events: ConciergeEvent[], calendarName = 'Festival Concierge Plan'): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LineupBase//Concierge//EN',
    `X-WR-CALNAME:${icsEscape(calendarName)}`,
  ];

  for (const event of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:ade-${event.id}-${toIcsDate(event.start_date)}@adepulse`);
    lines.push(`DTSTAMP:${toIcsDate(new Date().toISOString())}`);
    lines.push(`DTSTART:${toIcsDate(event.start_date)}`);
    lines.push(`DTEND:${toIcsDate(event.end_date)}`);
    lines.push(`SUMMARY:${icsEscape(event.title)}`);
    if (event.venue_name) {
      lines.push(`LOCATION:${icsEscape(event.venue_name)}`);
    }
    if (event.url) {
      lines.push(`URL:${icsEscape(event.url)}`);
    }
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

export function buildConciergeHtml(
  tier: ConciergeTier,
  customerName: string,
  events: ConciergeEvent[],
  notes: string[]
): string {
  const rows = events
    .map(
      (event) =>
        `<tr><td>${event.title}</td><td>${new Date(event.start_date).toLocaleString()}</td><td>${event.venue_name || '-'}</td><td>${event.categories || '-'}</td></tr>`
    )
    .join('');

  const notesHtml = notes.map((note) => `<li>${note}</li>`).join('');

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Festival Concierge Plan</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      .meta { color: #555; margin-bottom: 8px; }
    </style>
  </head>
  <body>
    <h1>My Festival Plan Pro (${tier})</h1>
    <p class="meta">Prepared for ${customerName}</p>
    <h2>Selected Events</h2>
    <table>
      <thead><tr><th>Event</th><th>Start</th><th>Venue</th><th>Categories</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <h2>Planner Notes</h2>
    <ul>${notesHtml}</ul>
  </body>
</html>`;
}
