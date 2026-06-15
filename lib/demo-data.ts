export interface DemoArtist {
  id: number;
  ade_id: number;
  title: string;
  subtitle: string;
  country_label: string;
  image_url: string;
  spotify_id: string;
  spotify_url: string;
  followers: number;
  popularity: number;
  primary_genres: string;
  secondary_genres: string;
  energy_mean: number;
  danceability_mean: number;
  valence_mean: number;
  tempo_bpm_mean: number;
  sound_descriptor: string;
  top_track_name: string;
  top_track_popularity: number;
  preview_available: boolean;
  preview_length_sec: number;
  preview_start_sec: number;
  enriched_at: string;
}

export interface DemoEvent {
  id: number;
  ade_id: number;
  title: string;
  subtitle: string;
  start_date: string;
  end_date: string;
  venue_name: string;
  venue_address: string;
  categories: string;
  sold_out: boolean;
  url: string;
  artists: DemoArtist[];
}

const DEMO_ARTISTS: DemoArtist[] = [
  {
    id: 101,
    ade_id: 900101,
    title: 'Amora K',
    subtitle: 'DJ / Producer',
    country_label: 'Netherlands',
    image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
    spotify_id: 'demo-amora-k',
    spotify_url: 'https://open.spotify.com/artist/demo-amora-k',
    followers: 184200,
    popularity: 74,
    primary_genres: 'melodic techno|house',
    secondary_genres: 'progressive house',
    energy_mean: 0.78,
    danceability_mean: 0.71,
    valence_mean: 0.49,
    tempo_bpm_mean: 126,
    sound_descriptor: 'driving / melodic',
    top_track_name: 'Neon Hearts',
    top_track_popularity: 68,
    preview_available: true,
    preview_length_sec: 30,
    preview_start_sec: 0,
    enriched_at: '2026-02-13T00:00:00.000Z',
  },
  {
    id: 102,
    ade_id: 900102,
    title: 'Riko Vale',
    subtitle: 'Live',
    country_label: 'Germany',
    image_url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800',
    spotify_id: 'demo-riko-vale',
    spotify_url: 'https://open.spotify.com/artist/demo-riko-vale',
    followers: 95210,
    popularity: 66,
    primary_genres: 'techno|industrial techno',
    secondary_genres: 'ebm',
    energy_mean: 0.88,
    danceability_mean: 0.64,
    valence_mean: 0.31,
    tempo_bpm_mean: 132,
    sound_descriptor: 'hard / dark',
    top_track_name: 'Steel Pulse',
    top_track_popularity: 62,
    preview_available: true,
    preview_length_sec: 30,
    preview_start_sec: 0,
    enriched_at: '2026-02-13T00:00:00.000Z',
  },
  {
    id: 103,
    ade_id: 900103,
    title: 'Mina Sol',
    subtitle: 'DJ',
    country_label: 'Spain',
    image_url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800',
    spotify_id: 'demo-mina-sol',
    spotify_url: 'https://open.spotify.com/artist/demo-mina-sol',
    followers: 70340,
    popularity: 61,
    primary_genres: 'afro house|deep house',
    secondary_genres: 'organic house',
    energy_mean: 0.69,
    danceability_mean: 0.79,
    valence_mean: 0.58,
    tempo_bpm_mean: 122,
    sound_descriptor: 'warm / percussive',
    top_track_name: 'Sunline',
    top_track_popularity: 57,
    preview_available: true,
    preview_length_sec: 30,
    preview_start_sec: 0,
    enriched_at: '2026-02-13T00:00:00.000Z',
  },
];

const DEMO_EVENTS: DemoEvent[] = [
  {
    id: 201,
    ade_id: 910201,
    title: 'Warehouse Pulse Night',
    subtitle: 'Techno Marathon',
    start_date: '2025-10-22T21:00:00.000Z',
    end_date: '2025-10-23T03:00:00.000Z',
    venue_name: 'NDSM Warehouse',
    venue_address: 'NDSM-Plein 85, Amsterdam',
    categories: 'Techno/Industrial',
    sold_out: false,
    url: 'https://www.amsterdam-dance-event.nl/',
    artists: [DEMO_ARTISTS[0], DEMO_ARTISTS[1]],
  },
  {
    id: 202,
    ade_id: 910202,
    title: 'Canal House Sessions',
    subtitle: 'House & Grooves',
    start_date: '2025-10-22T18:30:00.000Z',
    end_date: '2025-10-22T23:30:00.000Z',
    venue_name: 'Melkweg',
    venue_address: 'Lijnbaansgracht 234A, Amsterdam',
    categories: 'House/Deep House',
    sold_out: false,
    url: 'https://www.amsterdam-dance-event.nl/',
    artists: [DEMO_ARTISTS[0], DEMO_ARTISTS[2]],
  },
  {
    id: 203,
    ade_id: 910203,
    title: 'Sunrise Terrace',
    subtitle: 'Organic / Afro House',
    start_date: '2025-10-23T05:30:00.000Z',
    end_date: '2025-10-23T10:00:00.000Z',
    venue_name: 'A’DAM Tower',
    venue_address: 'Overhoeksplein 1, Amsterdam',
    categories: 'Afro House/Organic',
    sold_out: false,
    url: 'https://www.amsterdam-dance-event.nl/',
    artists: [DEMO_ARTISTS[2]],
  },
];

export function getDemoArtists(limit = 1000, offset = 0): DemoArtist[] {
  return DEMO_ARTISTS.slice(offset, offset + limit);
}

export function getDemoEvents(params?: { date?: string; limit?: number; offset?: number }): DemoEvent[] {
  const date = params?.date;
  const limit = params?.limit ?? 1000;
  const offset = params?.offset ?? 0;

  let rows = DEMO_EVENTS;
  if (date) {
    rows = rows.filter((event) => event.start_date.startsWith(date));
  }

  return rows.slice(offset, offset + limit);
}

export function getDemoHomepageData() {
  const venueSet = new Set(DEMO_EVENTS.map((e) => e.venue_name));
  const countrySet = new Set(DEMO_ARTISTS.map((a) => a.country_label));
  const genreSet = new Set<string>();

  for (const artist of DEMO_ARTISTS) {
    artist.primary_genres
      .split('|')
      .map((g) => g.trim().toUpperCase())
      .filter(Boolean)
      .forEach((g) => genreSet.add(g));
  }

  const topVenuesMap = new Map<string, number>();
  for (const event of DEMO_EVENTS) {
    topVenuesMap.set(event.venue_name, (topVenuesMap.get(event.venue_name) || 0) + 1);
  }

  const topVenues = Array.from(topVenuesMap.entries())
    .map(([venue, count]) => ({ venue, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const dates = Array.from(new Set(DEMO_EVENTS.map((e) => e.start_date.slice(0, 10)))).sort();

  return {
    counts: {
      artists: DEMO_ARTISTS.length,
      events: DEMO_EVENTS.length,
      venues: venueSet.size,
      countries: countrySet.size,
      genres: genreSet.size,
    },
    dates,
    topVenues,
    genres: Array.from(genreSet).sort(),
    warning: 'demo_data_fallback',
  };
}
