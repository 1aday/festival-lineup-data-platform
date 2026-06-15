// Featured festival source API types
export interface ADEArtist {
  id: number;
  handle: string;
  title: string;
  subtitle: string | null;
  url: string;
  country: {
    label: string;
    value: string;
    selected: boolean;
    valid: boolean;
  };
  image: {
    title: string | null;
    url: string | null;
  };
}

export interface ADEEvent {
  id: number;
  handle: string;
  title: string;
  subtitle: string | null;
  start_date_time: {
    date: string;
    timezone_type: number;
    timezone: string;
  };
  show_start_date_time: boolean;
  end_date_time: {
    date: string;
    timezone_type: number;
    timezone: string;
  };
  show_end_date_time: boolean;
  url: string;
  venue: {
    title: string;
  };
  soldOut: boolean;
  categories: string;
}

export interface ADEApiResponse<T = ADEArtist> {
  data: T[];
}

// Database Types
export interface DBArtist {
  id: number;
  ade_id: number;
  handle: string | null;
  title: string;
  subtitle: string | null;
  url: string | null;
  country_label: string | null;
  country_value: string | null;
  image_title: string | null;
  image_url: string | null;
  first_seen_at: string;
  last_updated_at: string;
  is_active: boolean;
  raw_data: any;
  popularity?: number | null;
  
  // Spotify enrichment fields
  spotify_id?: string | null;
  spotify_url?: string | null;
  spotify_uri?: string | null;
  spotify_href?: string | null;
  spotify_name?: string | null;
  spotify_image_url?: string | null;
  image_url_medium?: string | null;
  image_url_small?: string | null;
  followers?: number | null;
  artist_type?: string | null;
  
  // Genres
  genres?: string[] | null; // Main genres array from database
  primary_genres?: string | null;
  secondary_genres?: string | null;
  all_genres?: string | null;
  genre_count?: number | null;
  
  // Audio features
  sound_descriptor?: string | null;
  energy_mean?: number | null;
  danceability_mean?: number | null;
  valence_mean?: number | null;
  tempo_bpm_mean?: number | null;
  acousticness_mean?: number | null;
  instrumentalness_mean?: number | null;
  liveness_mean?: number | null;
  speechiness_mean?: number | null;
  loudness_mean_db?: number | null;
  
  // Top track
  top_track_id?: string | null;
  top_track_name?: string | null;
  top_track_album?: string | null;
  top_track_popularity?: number | null;
  top_track_spotify_url?: string | null;
  top_track_player_url?: string | null;
  top_track_album_art?: string | null;
  preview_available?: boolean | null;
  preview_length_sec?: number | null;
  preview_start_sec?: number | null;
  
  // Related artists
  related_1?: string | null;
  related_1_id?: string | null;
  related_2?: string | null;
  related_2_id?: string | null;
  related_3?: string | null;
  related_3_id?: string | null;

  // Source-page socials and contact surfaces
  social_links?: Record<string, string> | null;
  social_link_rows?: Array<{ type: string; url: string; label?: string | null; source?: string | null }> | null;
  social_link_count?: number | null;
  socials_match_status?: 'found' | 'none' | 'error' | string | null;
  socials_last_checked_at?: string | null;
  socials_enrichment_version?: string | null;
  socials_error?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  x_url?: string | null;
  youtube_url?: string | null;
  soundcloud_url?: string | null;
  bandcamp_url?: string | null;
  tiktok_url?: string | null;
  ra_url?: string | null;
  beatport_url?: string | null;
  discogs_url?: string | null;
  mixcloud_url?: string | null;
  apple_music_url?: string | null;
  deezer_url?: string | null;
  linktree_url?: string | null;
  website_url?: string | null;
  
  // Metadata
  enriched_at?: string | null;
  spotify_last_updated?: string | null;
  full_spotify_data?: any;
}

export interface DBEvent {
  id: number;
  ade_id: number;
  title: string;
  subtitle: string | null;
  url: string | null;
  start_date: string;
  end_date: string;
  venue_name: string | null;
  venue_address: string | null;
  event_type: string | null;
  categories: string | null;
  sold_out: boolean;
  first_seen_at: string;
  last_updated_at: string;
  is_active: boolean;
  raw_data: any;
}

export interface DBArtistEvent {
  id: number;
  artist_id: number;
  event_id: number;
  role: string | null;
  created_at: string;
}

export interface SyncHistory {
  id: number;
  sync_type: 'artists' | 'events';
  started_at: string;
  completed_at: string | null;
  total_items_fetched: number;
  new_items_added: number;
  items_updated: number;
  status: 'in_progress' | 'completed' | 'failed';
  error_message: string | null;
  metadata: any;
}

export interface ArtistChange {
  id: number;
  artist_id: number;
  change_type: 'added' | 'updated' | 'deactivated' | 'reactivated';
  changed_at: string;
  previous_data: any;
  new_data: any;
}

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export interface SyncProgress {
  currentPage: number;
  totalPages: number | null;
  itemsFetched: number;
  newItemsAdded: number;
  itemsUpdated: number;
  status: 'idle' | 'fetching' | 'processing' | 'completed' | 'error';
  message: string;
  currentBatch: ADEArtist[];
  logs: SyncLogEntry[];
}
