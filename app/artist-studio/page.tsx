'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { toast, Toaster } from 'sonner';
import { SpotifyTrackPlayer } from '@/components/spotify-track-player';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
} from '@tanstack/react-table';
import {
  Music,
  Sparkles,
  Download,
  Upload,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Globe,
  TrendingUp,
  Users,
  Disc,
  Star,
  Zap,
  Shield,
  Play,
  Activity,
  Hash,
  Gauge,
  Rocket,
  Pause,
  X,
  Clock,
  BarChart2,
  Info,
  Calendar,
  MapPin,
  Ticket,
  Mic,
  Palette,
  Heart,
  Volume2,
  Headphones,
  TrendingDown,
  Music2,
  Waves,
  BarChart3
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { EventCard } from '@/components/event-card';

interface Artist {
  id: string;
  title: string;
  subtitle?: string;
  country_label?: string;
  url?: string;
  first_seen_at?: string; // When the artist was first seen/added to the database
  created_at?: string; // Keeping for compatibility
  
  // Spotify data
  spotify_id?: string;
  spotify_url?: string;
  spotify_image?: string; // Spotify provided image
  image_url?: string; // Original ADE image
  name?: string;
  followers?: number;
  popularity?: number;
  
  // Genres
  primary_genres?: string;
  secondary_genres?: string;
  genres?: string[]; // Raw genre array
  
  // Audio features
  sound_descriptor?: string;
  energy_mean?: number;
  danceability_mean?: number;
  valence_mean?: number;
  tempo_bpm_mean?: number;
  acousticness_mean?: number;
  instrumentalness_mean?: number;
  liveness_mean?: number;
  speechiness_mean?: number;
  loudness_mean_db?: number;
  
  // Top track
  top_track_id?: string;
  top_track_name?: string;
  top_track_popularity?: number;
  top_track_player_url?: string;
  
  // Preview metadata
  preview_available?: boolean;
  preview_length_sec?: number;
  preview_start_sec?: number;
  
  // Related artists
  related_1?: string;
  related_2?: string;
  related_3?: string;
  related_artists?: string[]; // Raw array
  
  // Event information
  events?: Array<{
    id: string;
    ade_id: number;
    title: string;
    subtitle?: string;
    start_date: string;
    end_date: string;
    venue_name?: string;
    venue_address?: string;
    categories?: string;
    sold_out?: boolean;
    url?: string;
    confidence?: number;
  }>;
  eventCount?: number;
  upcomingEvents?: number;
  venues?: string[];
  nextEvent?: {
    id: string;
    title: string;
    start_date: string;
    venue_name?: string;
  } | null;
  
  // Metadata
  enriched_at?: string;
  created_at: string;
  updated_at: string;
  spotify_data?: any; // Full Spotify data
}

interface Event {
  id: string;
  ade_id: number;
  title: string;
  subtitle?: string;
  start_date: string;
  end_date: string;
  venue_name?: string;
  venue_address?: string;
  categories?: string;
  sold_out?: boolean;
  url?: string;
  first_seen_at?: string; // When the event was first seen/added
  last_updated_at?: string;
  created_at?: string; // Keeping for compatibility
  updated_at?: string;
  artists?: Array<{
    id: string;
    ade_id: number;
    title: string;
    country_label?: string;
    confidence?: number;
  }>;
  artistCount?: number;
  artistNames?: string;
}

interface MassEnrichmentState {
  isRunning: boolean;
  isPaused: boolean;
  currentArtist: Artist | null;
  currentIndex: number;
  totalCount: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
  startTime: Date | null;
  estimatedTimeRemaining: string;
  errors: Array<{ artist: string; error: string }>;
}

// Helper to format percentage values
function formatPercent(value?: number): string {
  if (value === undefined || value === null) return '-';
  return `${Math.round(value * 100)}%`;
}

// Helper to format decimal values
function formatDecimal(value?: number, decimals = 2): string {
  if (value === undefined || value === null) return '-';
  return value.toFixed(decimals);
}

// Helper to format time duration
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export default function ArtistStudioPage() {
  const [viewMode, setViewMode] = useState<'artists' | 'events'>('artists');
  const [artists, setArtists] = useState<Artist[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'first_seen_at', desc: true } // Default sort by newest first
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    subtitle: false,
    url: false,
    country_label: false,
    created_at: false,
    updated_at: false,
    // Hide some less important columns by default to make room for events
    acousticness_mean: false,
    instrumentalness_mean: false,
    liveness_mean: false,
    speechiness_mean: false,
    loudness_mean_db: false,
  });
  const [rowSelection, setRowSelection] = useState({});
  const [stats, setStats] = useState({
    total: 0,
    enriched: 0,
    withSpotify: 0,
    withGenres: 0,
    withAudioFeatures: 0,
    withEvents: 0,
  });
  
  // Mass enrichment state
  const [massEnrichment, setMassEnrichment] = useState<MassEnrichmentState>({
    isRunning: false,
    isPaused: false,
    currentArtist: null,
    currentIndex: 0,
    totalCount: 0,
    successCount: 0,
    errorCount: 0,
    skippedCount: 0,
    startTime: null,
    estimatedTimeRemaining: '--:--',
    errors: [],
  });
  
  // Track failed artist IDs for retry
  const [failedArtistIds, setFailedArtistIds] = useState<Set<string>>(new Set());
  
  const massEnrichmentRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Test API endpoints
  const testApiEndpoints = async () => {
    try {
      console.log('=== TESTING API ENDPOINTS ===');
      
      // Test Spotify enrichment endpoint with a simple health check
      const response = await fetch('/api/spotify/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          artistId: 'test',
          artistName: 'Test Artist'
        }),
      });

      console.log(`Spotify Enrichment API: ${response.status} ${response.statusText}`);
      
      if (response.status === 404) {
        console.error('❌ Spotify enrichment API endpoint not found');
      } else if (response.status >= 500) {
        console.error('❌ Spotify enrichment API server error');
      } else {
        console.log('✅ Spotify enrichment API is responding');
      }
      
      console.log('=== API ENDPOINTS TEST COMPLETE ===');
    } catch (error) {
      console.error('❌ API endpoint test failed:', error);
    }
  };

  // Test database structure
  const testDatabaseStructure = async () => {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured');
      return;
    }

    try {
      console.log('=== TESTING DATABASE STRUCTURE ===');
      
      // Test events table
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id, title')
        .limit(3);
      
      console.log('Events table:', eventsError ? `ERROR: ${eventsError.message}` : `✅ ${events?.length} events found`);
      if (events && events.length > 0) {
        console.log('Sample events:', events.map(e => `${e.id}: ${e.title}`));
      }

      // Test artists table  
      const { data: artists, error: artistsError } = await supabase
        .from('artists')
        .select('id, title')
        .limit(3);
      
      console.log('Artists table:', artistsError ? `ERROR: ${artistsError.message}` : `✅ ${artists?.length} artists found`);
      if (artists && artists.length > 0) {
        console.log('Sample artists:', artists.map(a => `${a.id}: ${a.title}`));
      }

      // Test artist_events table
      const { data: artistEvents, error: artistEventsError } = await supabase
        .from('artist_events')
        .select('event_id, artist_id, confidence')
        .limit(5);
      
      console.log('Artist_events table:', artistEventsError ? `ERROR: ${artistEventsError.message}` : `✅ ${artistEvents?.length} relationships found`);
      if (artistEvents && artistEvents.length > 0) {
        console.log('Sample relationships:', artistEvents.map(ae => `Event ${ae.event_id} -> Artist ${ae.artist_id} (${ae.confidence || 'no confidence'})`));
      }

      console.log('=== DATABASE STRUCTURE TEST COMPLETE ===');
    } catch (error) {
      console.error('Database structure test failed:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await testApiEndpoints();
      await testDatabaseStructure();
      await Promise.all([loadArtists(), loadEvents()]);
    };
    loadData();
  }, []);

  useEffect(() => {
    // Update estimated time remaining
    if (massEnrichment.isRunning && massEnrichment.startTime) {
      const interval = setInterval(() => {
        const elapsed = (Date.now() - massEnrichment.startTime.getTime()) / 1000;
        const processed = massEnrichment.currentIndex;
        if (processed > 0) {
          const avgTimePerArtist = elapsed / processed;
          const remaining = (massEnrichment.totalCount - processed) * avgTimePerArtist;
          setMassEnrichment(prev => ({
            ...prev,
            estimatedTimeRemaining: formatDuration(remaining),
          }));
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [massEnrichment.isRunning, massEnrichment.startTime, massEnrichment.currentIndex, massEnrichment.totalCount]);

  const loadArtists = async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Loading artists with separate queries for better multi-event handling...');
      
      // Step 1: Load all artists (simple query)
      console.log('Loading artists...');
      
      // Get total count first
      const { count: totalCount } = await supabase
        .from('artists')
        .select('*', { count: 'exact', head: true });
      
      console.log(`Total artists in database: ${totalCount}`);
      
      // Load ALL artists - Supabase defaults to 1000, we need to explicitly set range
      let { data: artistsData, error: artistsError } = await supabase
        .from('artists')
        .select('*')
        .order('first_seen_at', { ascending: false }) // Newest first (using first_seen_at instead of created_at)
        .range(0, 99999); // Get up to 100k artists (way more than we'll ever have)

      if (artistsError) {
        console.error('Artists query with first_seen_at ordering failed:', {
          error: artistsError,
          message: artistsError?.message || 'Unknown error',
          code: artistsError?.code,
          details: artistsError?.details,
          hint: artistsError?.hint,
          stringified: JSON.stringify(artistsError, null, 2)
        });
        
        // Try without ordering by created_at (column might not exist)
        console.log('Retrying artists query without created_at ordering...');
        const fallbackResult = await supabase
          .from('artists')
          .select('*')
          .order('title', { ascending: true }) // Use title as fallback
          .range(0, 99999);
        
        if (fallbackResult.error) {
          console.error('Fallback artists query also failed:', fallbackResult.error);
          // Don't throw, continue with empty artists
          console.warn('Continuing with empty artists due to query error');
          const emptyArtists: any[] = [];
          setArtists(emptyArtists);
          setStats({
            total: 0,
            enriched: 0,
            withSpotify: 0,
            withGenres: 0,
            withAudioFeatures: 0,
            withEvents: 0,
          });
          return;
        }
        
        artistsData = fallbackResult.data;
        console.log('Successfully loaded artists with fallback query');
      }
      
      console.log(`Successfully loaded ${artistsData?.length} artists (total in DB: ${totalCount})`);
      if (totalCount && artistsData && artistsData.length < totalCount) {
        console.warn(`⚠️ Only loaded ${artistsData.length} of ${totalCount} artists - may need pagination`);
      }

      console.log(`Loaded ${artistsData?.length || 0} artists`);
      
      // Debug: Check if data is sorted by created_at
      if (artistsData && artistsData.length > 0) {
        console.log('First 3 artists (should be newest):', artistsData.slice(0, 3).map(a => ({
          title: a.title,
          created_at: a.created_at,
          time_ago: a.created_at ? `${Math.floor((Date.now() - new Date(a.created_at).getTime()) / (1000 * 60 * 60))}h ago` : 'no date'
        })));
      }

      // Step 2: Load all artist_events relationships
      console.log('Loading artist-event relationships for artists...');
      const { data: artistEventsData, error: artistEventsError } = await supabase
        .from('artist_events')
        .select('*')
        .range(0, 99999); // Get all relationships

      if (artistEventsError) {
        console.error('Artist-events query failed:', artistEventsError);
        // Continue without event data
        const artistsWithoutEvents = artistsData.map(artist => ({
          ...artist,
          events: [],
          eventCount: 0,
          upcomingEvents: 0,
          venues: [],
          nextEvent: null
        }));
        setArtists(artistsWithoutEvents);
        return;
      }

      console.log(`Loaded ${artistEventsData?.length || 0} artist-event relationships`);

      // Step 3: Load all events
      console.log('Loading events for artists...');
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .range(0, 99999); // Get all events

      if (eventsError) {
        console.error('Events query failed:', eventsError);
        // Continue with artists but no event details
        const artistsWithoutEvents = artistsData.map(artist => ({
          ...artist,
          events: [],
          eventCount: 0,
          upcomingEvents: 0,
          venues: [],
          nextEvent: null
        }));
        setArtists(artistsWithoutEvents);
        return;
      }

      console.log(`Loaded ${eventsData?.length || 0} events`);

      // Step 4: Create lookup maps for efficient joining
      const eventsMap = new Map(eventsData.map(event => [event.id, event]));
      const artistEventsMap = new Map();

      // Group artist_events by artist_id (multiple events per artist)
      artistEventsData.forEach(ae => {
        if (!artistEventsMap.has(ae.artist_id)) {
          artistEventsMap.set(ae.artist_id, []);
        }
        artistEventsMap.get(ae.artist_id).push(ae);
      });

      console.log(`Created lookup maps: ${eventsMap.size} events, ${artistEventsMap.size} artists with events`);

      // Step 5: Combine data - each artist gets ALL their events
      const processedArtists = artistsData.map(artist => {
        const artistEvents = artistEventsMap.get(artist.id) || [];
        
        // Get all events for this artist
        const events = artistEvents.map(ae => {
          const event = eventsMap.get(ae.event_id);
          if (!event) return null;
          
          return {
            ...event,
            confidence: ae.confidence
          };
        }).filter(Boolean); // Remove null events

        // Filter for upcoming events only
        const now = new Date();
        const upcomingEvents = events.filter(event => new Date(event.start_date) > now);
        
        // Get unique venues
        const venues = [...new Set(events.map(event => event.venue_name).filter(Boolean))];
        
        // Find next event (earliest upcoming)
        const nextEvent = upcomingEvents
          .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())[0] || null;

        console.log(`Artist "${artist.title}" has ${events.length} total events, ${upcomingEvents.length} upcoming, ${venues.length} unique venues`);
        if (events.length > 0) {
          console.log(`  Events: ${events.map(e => e.title).join(', ')}`);
        }

        return {
          ...artist,
          events,
          eventCount: events.length,
          upcomingEvents: upcomingEvents.length,
          venues,
          nextEvent
        };
      });

      console.log(`Successfully processed ${processedArtists.length} artists with multi-event support`);
      console.log('Sample artist with multiple events:', processedArtists.find(a => a.events.length > 1));
      
      // Sort by first_seen_at descending (newest first) to maintain database order
      processedArtists.sort((a, b) => {
        const aDate = a.first_seen_at || a.created_at;
        const bDate = b.first_seen_at || b.created_at;
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });
      
      setArtists(processedArtists);
      
      // Calculate stats
      const enriched = processedArtists.filter(a => a.enriched_at).length;
      const withSpotify = processedArtists.filter(a => a.spotify_id).length;
      const withGenres = processedArtists.filter(a => a.primary_genres).length;
      const withAudioFeatures = processedArtists.filter(a => a.energy_mean !== null && a.energy_mean !== undefined).length;
      const withEvents = processedArtists.filter(a => a.eventCount > 0).length;
      
      setStats({
        total: processedArtists.length,
        enriched,
        withSpotify,
        withGenres,
        withAudioFeatures,
        withEvents,
      });
    } catch (error) {
      console.error('Error loading artists:', error);
      toast.error('Failed to load artists');
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured, skipping event loading');
      return;
    }

    try {
      console.log('Starting to load events with separate queries...');
      
      // Step 1: Load all events (simple query)
      console.log('Loading events...');
      
      // Get total count first
      const { count: totalEventCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true });
      
      console.log(`Total events in database: ${totalEventCount}`);
      
      // Load ALL events
      let { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .order('first_seen_at', { ascending: false }) // Newest first (using first_seen_at instead of created_at)
        .range(0, 99999); // Get up to 100k events

      if (eventsError) {
        console.error('Events query with first_seen_at ordering failed:', {
          error: eventsError,
          message: eventsError?.message || 'Unknown error',
          code: eventsError?.code,
          details: eventsError?.details,
          hint: eventsError?.hint,
          stringified: JSON.stringify(eventsError, null, 2)
        });
        
        // Try without ordering by created_at (column might not exist)
        console.log('Retrying events query without created_at ordering...');
        const fallbackResult = await supabase
          .from('events')
          .select('*')
          .order('start_date', { ascending: false }) // Use start_date as fallback
          .range(0, 99999);
        
        if (fallbackResult.error) {
          console.error('Fallback events query also failed:', fallbackResult.error);
          // Don't throw, continue with empty events
          console.warn('Continuing with empty events due to query error');
          const emptyEvents: any[] = [];
          setEvents(emptyEvents);
          return;
        }
        
        eventsData = fallbackResult.data;
        console.log('Successfully loaded events with fallback query');
      }
      
      console.log(`Successfully loaded ${eventsData?.length} events (total in DB: ${totalEventCount})`);
      if (totalEventCount && eventsData && eventsData.length < totalEventCount) {
        console.warn(`⚠️ Only loaded ${eventsData.length} of ${totalEventCount} events - may need pagination`);
      }

      console.log(`Loaded ${eventsData?.length || 0} events`);
      
      // Debug: Check if data is sorted by created_at
      if (eventsData && eventsData.length > 0) {
        console.log('First 3 events (should be newest):', eventsData.slice(0, 3).map(e => ({
          title: e.title,
          created_at: e.created_at,
          time_ago: e.created_at ? `${Math.floor((Date.now() - new Date(e.created_at).getTime()) / (1000 * 60 * 60))}h ago` : 'no date'
        })));
      }

      // Step 2: Load all artist_events relationships
      console.log('Loading artist-event relationships...');
      const { data: artistEventsData, error: artistEventsError } = await supabase
        .from('artist_events')
        .select('*')
        .range(0, 99999); // Get all relationships

      if (artistEventsError) {
        console.error('Artist-events query failed:', artistEventsError);
        // Continue without artist data
        const eventsWithoutArtists = eventsData.map(event => ({
          ...event,
          artists: [],
          artistCount: 0,
          artistNames: ''
        }));
        setEvents(eventsWithoutArtists);
        return;
      }

      console.log(`Loaded ${artistEventsData?.length || 0} artist-event relationships`);

      // Step 3: Load all artists
      console.log('Loading artists...');
      const { data: artistsData, error: artistsError } = await supabase
        .from('artists')
        .select('*')
        .range(0, 99999); // Get all artists

      if (artistsError) {
        console.error('Artists query failed:', artistsError);
        // Continue with events but no artist details
        const eventsWithoutArtists = eventsData.map(event => ({
          ...event,
          artists: [],
          artistCount: 0,
          artistNames: ''
        }));
        setEvents(eventsWithoutArtists);
        return;
      }

      console.log(`Loaded ${artistsData?.length || 0} artists`);

      // Step 4: Create lookup maps for efficient joining
      const artistsMap = new Map(artistsData.map(artist => [artist.id, artist]));
      const eventArtistsMap = new Map();

      // Group artist_events by event_id
      artistEventsData.forEach(ae => {
        if (!eventArtistsMap.has(ae.event_id)) {
          eventArtistsMap.set(ae.event_id, []);
        }
        eventArtistsMap.get(ae.event_id).push(ae);
      });

      console.log(`Created lookup maps: ${artistsMap.size} artists, ${eventArtistsMap.size} events with artists`);

      // Step 5: Combine data
      const processedEvents = eventsData.map(event => {
        const eventArtists = eventArtistsMap.get(event.id) || [];
        
        const artists = eventArtists.map(ae => {
          const artist = artistsMap.get(ae.artist_id);
          if (!artist) return null;
          
          return {
            id: artist.id,
            ade_id: artist.ade_id,
            title: artist.title,
            country_label: artist.country_label,
            confidence: ae.confidence,
            // Spotify data
            spotify_id: artist.spotify_id,
            spotify_url: artist.spotify_url,
            spotify_image: artist.spotify_image,
            image_url: artist.image_url,
            name: artist.name,
            followers: artist.followers,
            popularity: artist.popularity,
            // Genres
            primary_genres: artist.primary_genres,
            secondary_genres: artist.secondary_genres,
            genres: artist.genres,
            // Audio features
            sound_descriptor: artist.sound_descriptor,
            energy_mean: artist.energy_mean,
            danceability_mean: artist.danceability_mean,
            valence_mean: artist.valence_mean,
            tempo_bpm_mean: artist.tempo_bpm_mean,
            acousticness_mean: artist.acousticness_mean,
            instrumentalness_mean: artist.instrumentalness_mean,
            liveness_mean: artist.liveness_mean,
            speechiness_mean: artist.speechiness_mean,
            loudness_mean_db: artist.loudness_mean_db,
            // Top track
            top_track_id: artist.top_track_id,
            top_track_name: artist.top_track_name,
            top_track_popularity: artist.top_track_popularity,
            top_track_player_url: artist.top_track_player_url,
            // Preview metadata
            preview_available: artist.preview_available,
            preview_length_sec: artist.preview_length_sec,
            preview_start_sec: artist.preview_start_sec,
            // Related artists
            related_1: artist.related_1,
            related_2: artist.related_2,
            related_3: artist.related_3,
            related_artists: artist.related_artists
          };
        }).filter(Boolean); // Remove null artists

        console.log(`Event "${event.title}" has ${artists.length} artists: ${artists.map(a => a.title).join(', ')}`);

        // Aggregate all unique genres from all artists
        const allGenres = new Set();
        const primaryGenres = new Set();
        const secondaryGenres = new Set();
        
        artists.forEach(artist => {
          // Process primary genres
          if (artist.primary_genres) {
            const genres = artist.primary_genres.includes(' | ') 
              ? artist.primary_genres.split(' | ')
              : artist.primary_genres.includes(',')
              ? artist.primary_genres.split(',').map(g => g.trim())
              : artist.primary_genres.includes('/')
              ? artist.primary_genres.split('/').map(g => g.trim())
              : [artist.primary_genres];
            
            genres.forEach(g => {
              if (g && g.trim()) {
                allGenres.add(g.trim());
                primaryGenres.add(g.trim());
              }
            });
          }
          
          // Process secondary genres
          if (artist.secondary_genres) {
            const genres = artist.secondary_genres.includes(' | ')
              ? artist.secondary_genres.split(' | ')
              : artist.secondary_genres.includes(',')
              ? artist.secondary_genres.split(',').map(g => g.trim())
              : [artist.secondary_genres];
            
            genres.forEach(g => {
              if (g && g.trim()) {
                allGenres.add(g.trim());
                secondaryGenres.add(g.trim());
              }
            });
          }
          
          // Process general genres field as fallback
          if (!artist.primary_genres && artist.genres) {
            const genres = artist.genres.includes(',')
              ? artist.genres.split(',').map(g => g.trim())
              : artist.genres.includes('/')
              ? artist.genres.split('/').map(g => g.trim())
              : [artist.genres];
            
            genres.forEach(g => {
              if (g && g.trim()) {
                allGenres.add(g.trim());
                primaryGenres.add(g.trim());
              }
            });
          }
        });

        return {
          ...event,
          artists,
          artistCount: artists.length,
          artistNames: artists.map(a => a.title).join(', '),
          // Add aggregated genre information
          eventGenres: Array.from(allGenres),
          eventPrimaryGenres: Array.from(primaryGenres),
          eventSecondaryGenres: Array.from(secondaryGenres)
        };
      });

      console.log(`Successfully processed ${processedEvents.length} events`);
      console.log('Sample event with artists:', processedEvents.find(e => e.artists.length > 0));
      
      // Sort by first_seen_at descending (newest first) to maintain database order
      processedEvents.sort((a, b) => {
        const aDate = a.first_seen_at || a.created_at;
        const bDate = b.first_seen_at || b.created_at;
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });
      
      setEvents(processedEvents);
    } catch (error) {
      console.error('Error loading events:', {
        error,
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        message: error?.message || 'Unknown error',
        stack: error?.stack,
        stringified: JSON.stringify(error, null, 2)
      });
      
      // Show more detailed error message to user
      const errorMessage = error?.message || 'Unknown database error';
      toast.error(`Failed to load events: ${errorMessage}`);
    }
  };

  const enrichArtist = async (artist: Artist, signal?: AbortSignal): Promise<boolean> => {
    if (signal?.aborted) return false;
    
    setEnriching(artist.id);
    try {
      console.log(`Starting enrichment for artist: ${artist.title} (ID: ${artist.id})`);
      
      // Create a timeout controller if none provided - FAST MODE
      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => timeoutController.abort(), 8000); // 8 second timeout for speed
      
      // Use the provided signal or the timeout controller
      const effectiveSignal = signal || timeoutController.signal;
      
      const response = await fetch('/api/spotify/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          artistId: artist.id,
          artistName: artist.title 
        }),
        signal: effectiveSignal,
      });

      clearTimeout(timeoutId);

      console.log(`API response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.error('Could not parse error response:', parseError);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log(`Enrichment successful for ${artist.title}:`, data);
      
      // Update local state
      setArtists(prev => prev.map(a => 
        a.id === artist.id 
          ? { ...a, ...data.enrichedData, enriched_at: new Date().toISOString() }
          : a
      ));
      
      // Update stats
      if (!artist.enriched_at) {
        setStats(prev => ({
          ...prev,
          enriched: prev.enriched + 1,
          withSpotify: data.enrichedData.spotify_id ? prev.withSpotify + 1 : prev.withSpotify,
          withGenres: data.enrichedData.primary_genres ? prev.withGenres + 1 : prev.withGenres,
          withAudioFeatures: data.enrichedData.energy_mean ? prev.withAudioFeatures + 1 : prev.withAudioFeatures,
        }));
      }
      
      return true;
    } catch (error: any) {
      if (signal?.aborted) {
        console.log(`Enrichment aborted for ${artist.title}`);
        return false;
      }
      
      console.error(`Error enriching artist ${artist.title}:`, {
        error,
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      
      // Track this artist as failed for retry
      setFailedArtistIds(prev => {
        const newSet = new Set(prev);
        newSet.add(artist.id);
        console.log(`🔄 Added ${artist.title} to retry queue (${newSet.size} total failed artists)`);
        return newSet;
      });
      
      // More specific error messages
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error(`Network error: Cannot reach enrichment API. Will retry next time.`);
      } else if (error.name === 'AbortError') {
        throw new Error(`Request timeout: Enrichment took too long. Will retry next time.`);
      } else {
        throw error;
      }
    } finally {
      setEnriching(null);
    }
  };

  const enrichSelectedArtists = async () => {
    const selectedIds = Object.keys(rowSelection).filter(id => rowSelection[id]);
    if (selectedIds.length === 0) {
      toast.error('No artists selected');
      return;
    }

    for (const id of selectedIds) {
      const artist = artists.find(a => a.id === id);
      if (artist && !artist.enriched_at) {
        try {
          await enrichArtist(artist);
          toast.success(`Enriched ${artist.title}`);
        } catch (error: any) {
          toast.error(error.message || `Failed to enrich ${artist.title}`);
        }
        // Delay between requests
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
  };

  const startMassEnrichment = async (forceReenrich: boolean = false) => {
    // Get artists to enrich based on mode
    let artistsToEnrich = forceReenrich ? artists : artists.filter(a => !a.enriched_at);
    
    // SMART RETRY: Include previously failed artists
    if (!forceReenrich && failedArtistIds.size > 0) {
      const failedArtists = artists.filter(a => failedArtistIds.has(a.id) && !a.enriched_at);
      const newArtists = artistsToEnrich.filter(a => !failedArtistIds.has(a.id));
      
      // Put failed artists first for retry, then new artists
      artistsToEnrich = [...failedArtists, ...newArtists];
      
      if (failedArtists.length > 0) {
        toast.info(`🔄 Including ${failedArtists.length} previously failed artists for retry`, {
          duration: 3000
        });
        console.log(`🔄 Retry queue: ${failedArtists.map(a => a.title).join(', ')}`);
      }
    }
    
    if (artistsToEnrich.length === 0) {
      toast.error('No artists to enrich!');
      return;
    }
    
    // Initialize state
    setMassEnrichment({
      isRunning: true,
      isPaused: false,
      currentArtist: null,
      currentIndex: 0,
      totalCount: artistsToEnrich.length,
      successCount: 0,
      errorCount: 0,
      skippedCount: 0,
      startTime: new Date(),
      estimatedTimeRemaining: '--:--',
      errors: [],
    });
    
    massEnrichmentRef.current = true;
    abortControllerRef.current = new AbortController();
    
    // TURBO MODE: Process artists in parallel batches for 10x speed!
    const BATCH_SIZE = 10; // Process 10 artists simultaneously
    const MAX_CONCURRENT = 10; // Maximum concurrent requests
    let processedCount = 0;
    
    console.log(`🚀 TURBO ENRICHMENT: Processing ${artistsToEnrich.length} artists in batches of ${BATCH_SIZE}`);
    
    // Process artists in batches
    for (let i = 0; i < artistsToEnrich.length; i += BATCH_SIZE) {
      if (!massEnrichmentRef.current || abortControllerRef.current.signal.aborted) {
        break;
      }
      
      // Check if paused
      while (massEnrichment.isPaused && massEnrichmentRef.current) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (!massEnrichmentRef.current) break;
      
      // Get current batch
      const batch = artistsToEnrich.slice(i, Math.min(i + BATCH_SIZE, artistsToEnrich.length));
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(artistsToEnrich.length / BATCH_SIZE);
      
      console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} artists)`);
      
      // Update state to show batch progress
      setMassEnrichment(prev => ({
        ...prev,
        currentArtist: batch[0], // Show first artist in batch
        currentIndex: Math.min(i + BATCH_SIZE, artistsToEnrich.length),
      }));
      
      // Process entire batch in parallel
      const batchPromises = batch.map(async (artist, batchIndex) => {
        // Add small stagger to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, batchIndex * 50));
        
        try {
          const success = await enrichArtist(artist, abortControllerRef.current.signal);
          if (success) {
            // Remove from failed list if it was there
            setFailedArtistIds(prev => {
              const newSet = new Set(prev);
              if (newSet.has(artist.id)) {
                newSet.delete(artist.id);
                console.log(`✅ Removed ${artist.title} from retry queue (was previously failed)`);
              }
              return newSet;
            });
            
            setMassEnrichment(prev => ({
              ...prev,
              successCount: prev.successCount + 1,
            }));
            toast.success(`✓ ${artist.title}`, { duration: 300 });
            return 'success';
          } else {
            setMassEnrichment(prev => ({
              ...prev,
              skippedCount: prev.skippedCount + 1,
            }));
            return 'skipped';
          }
        } catch (error: any) {
          setMassEnrichment(prev => ({
            ...prev,
            errorCount: prev.errorCount + 1,
            errors: [...prev.errors, { artist: artist.title, error: error.message }].slice(-10),
          }));
          toast.error(`✗ ${artist.title}`, { duration: 500 });
          return 'error';
        }
      });
      
      // Wait for entire batch to complete
      const results = await Promise.all(batchPromises);
      processedCount += batch.length;
      
      // Calculate and update time estimate
      const elapsed = (Date.now() - new Date(massEnrichment.startTime || Date.now()).getTime()) / 1000;
      const avgTimePerBatch = elapsed / (batchNumber);
      const remainingBatches = totalBatches - batchNumber;
      const estimatedRemaining = remainingBatches * avgTimePerBatch;
      
      setMassEnrichment(prev => ({
        ...prev,
        estimatedTimeRemaining: formatDuration(estimatedRemaining),
      }));
      
      console.log(`Batch ${batchNumber} complete: ${results.filter(r => r === 'success').length} success, ${results.filter(r => r === 'error').length} errors`);
      
      // Smart delay between batches to avoid API rate limiting
      if (i + BATCH_SIZE < artistsToEnrich.length) {
        // 1.5 second delay between batches for API stability
        await new Promise(resolve => setTimeout(resolve, 1500));
        console.log(`⏳ Waiting 1.5s before next batch to respect API limits...`);
      }
    }
    
    // Completion with speed stats
    const elapsed = (Date.now() - new Date(massEnrichment.startTime || Date.now()).getTime()) / 1000;
    const artistsPerSecond = (processedCount / elapsed).toFixed(2);
    
    if (massEnrichmentRef.current) {
      const finalState = massEnrichment;
      const retryMessage = failedArtistIds.size > 0 
        ? ` (${failedArtistIds.size} failed - will retry next time)` 
        : '';
      
      toast.success(
        `🚀 TURBO enrichment complete! ✓ ${finalState.successCount} successful, ✗ ${finalState.errorCount} errors${retryMessage} (${artistsPerSecond} artists/sec)`,
        { duration: 5000 }
      );
      console.log(`🏁 Enrichment complete: Processed ${processedCount} artists in ${elapsed.toFixed(1)}s (${artistsPerSecond} artists/sec)`);
      
      if (failedArtistIds.size > 0) {
        console.log(`🔄 ${failedArtistIds.size} artists failed and will be retried next time`);
      }
    }
    
    setMassEnrichment(prev => ({
      ...prev,
      isRunning: false,
      currentArtist: null,
    }));
    
    massEnrichmentRef.current = false;
    abortControllerRef.current = null;
  };

  const pauseMassEnrichment = () => {
    setMassEnrichment(prev => ({
      ...prev,
      isPaused: !prev.isPaused,
    }));
  };

  const stopMassEnrichment = () => {
    massEnrichmentRef.current = false;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setMassEnrichment(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      currentArtist: null,
    }));
    toast.info('Mass enrichment stopped');
  };

  const columns: ColumnDef<Artist>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'first_seen_at',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 hover:bg-primary/10"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Added
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
          )}
        </Button>
      ),
      cell: ({ row }) => {
        const date = row.original.first_seen_at || row.original.created_at;
        if (!date) return <span className="text-muted-foreground text-xs">-</span>;
        
        const createdDate = new Date(date);
        const now = new Date();
        const diffMs = now.getTime() - createdDate.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        let displayText = '';
        let badgeClass = '';
        
        if (diffHours < 1) {
          displayText = 'Just now';
          badgeClass = 'bg-green-500/10 text-green-600 border-green-500/20';
        } else if (diffHours < 24) {
          displayText = `${diffHours}h ago`;
          badgeClass = 'bg-blue-500/10 text-blue-600 border-blue-500/20';
        } else if (diffDays < 7) {
          displayText = `${diffDays}d ago`;
          badgeClass = diffDays < 3 ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' : 'bg-muted text-muted-foreground';
        } else {
          displayText = format(createdDate, 'MMM d');
          badgeClass = 'bg-muted text-muted-foreground';
        }
        
        return (
          <Tooltip>
            <TooltipTrigger>
              <Badge className={`text-xs ${badgeClass}`}>
                {displayText}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              {format(createdDate, 'PPpp')}
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      accessorKey: 'image_url',
      header: 'Image',
      cell: ({ row }) => {
        const imageUrl = row.getValue('image_url') as string;
        const spotifyImage = row.original.spotify_image;
        const finalImage = imageUrl || spotifyImage;
        
        if (!finalImage) return <div className="w-12 h-12 bg-muted rounded" />;
        return (
          <img 
            src={finalImage} 
            alt={row.original.title} 
            className="w-12 h-12 object-cover rounded"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder-artist.png';
            }}
          />
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-primary/10"
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5 min-w-[150px]">
          <span className="font-medium">{row.getValue('title')}</span>
          {row.original.subtitle && (
            <span className="text-xs text-muted-foreground">{row.original.subtitle}</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'events',
      header: 'All Events',
      filterFn: (row, columnId, filterValue) => {
        const artist = row.original;
        const allEvents = artist.events || [];
        const upcomingEvents = allEvents.filter(event => new Date(event.start_date) > new Date());
        
        if (filterValue === 'has-upcoming') {
          return upcomingEvents.length > 0;
        } else if (filterValue === 'no-events') {
          return allEvents.length === 0;
        }
        return true;
      },
      cell: ({ row }) => {
        const events = row.original.events || [];
        const upcomingEvents = events.filter(event => new Date(event.start_date) > new Date());
        const pastEvents = events.filter(event => new Date(event.start_date) <= new Date());
        const nextEvent = row.original.nextEvent;
        const venues = row.original.venues || [];
        
        if (events.length === 0) {
          return <span className="text-muted-foreground text-sm italic">No events</span>;
        }

        return (
          <div className="space-y-2 min-w-[300px]">
            {/* Next Event (if any upcoming) */}
            {nextEvent && (
              <div className="p-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-3 w-3 text-blue-500" />
                  <span className="text-xs font-semibold text-blue-600">Next Performance</span>
                </div>
                <div className="text-sm font-medium truncate">{nextEvent.title}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <Clock className="h-3 w-3" />
                  <span>{format(new Date(nextEvent.start_date), 'MMM dd, HH:mm')}</span>
                </div>
                {nextEvent.venue_name && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{nextEvent.venue_name}</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Event Summary - ALL Events */}
            <div className="flex flex-wrap gap-1">
              <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                <Calendar className="h-3 w-3 mr-1" />
                {events.length} total event{events.length !== 1 ? 's' : ''}
              </Badge>
              
              {upcomingEvents.length > 0 && (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                  <Clock className="h-3 w-3 mr-1" />
                  {upcomingEvents.length} upcoming
                </Badge>
              )}
              
              {pastEvents.length > 0 && (
                <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/30">
                  <Clock className="h-3 w-3 mr-1" />
                  {pastEvents.length} past
                </Badge>
              )}
              
              {venues.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="border-orange-500/30 bg-orange-500/10 text-orange-600">
                        <MapPin className="h-3 w-3 mr-1" />
                        {venues.length} venue{venues.length !== 1 ? 's' : ''}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        {venues.slice(0, 5).map((venue, i) => (
                          <p key={i} className="text-sm">{venue}</p>
                        ))}
                        {venues.length > 5 && (
                          <p className="text-sm text-muted-foreground">+{venues.length - 5} more</p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            
            {/* All Events List */}
            {events.length > 1 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-xs text-muted-foreground cursor-help">
                      View all {events.length} events...
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {/* Upcoming Events */}
                      {upcomingEvents.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-green-600 mb-2">🔜 Upcoming ({upcomingEvents.length})</div>
                          {upcomingEvents.slice(0, 8).map((event, i) => (
                            <div key={i} className="border-b border-muted last:border-b-0 pb-1 last:pb-0 mb-1">
                              <div className="font-medium text-sm text-green-700">{event.title}</div>
                              <div className="text-xs text-muted-foreground">
                                📅 {format(new Date(event.start_date), 'MMM dd, HH:mm')}
                              </div>
                              {event.venue_name && (
                                <div className="text-xs text-muted-foreground">
                                  📍 {event.venue_name}
                                </div>
                              )}
                            </div>
                          ))}
                          {upcomingEvents.length > 8 && (
                            <div className="text-xs text-muted-foreground">
                              +{upcomingEvents.length - 8} more upcoming...
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Past Events */}
                      {pastEvents.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-gray-600 mb-2">📅 Past ({pastEvents.length})</div>
                          {pastEvents.slice(-5).map((event, i) => (
                            <div key={i} className="border-b border-muted last:border-b-0 pb-1 last:pb-0 mb-1">
                              <div className="font-medium text-sm text-gray-700">{event.title}</div>
                              <div className="text-xs text-muted-foreground">
                                📅 {format(new Date(event.start_date), 'MMM dd, HH:mm')}
                              </div>
                              {event.venue_name && (
                                <div className="text-xs text-muted-foreground">
                                  📍 {event.venue_name}
                                </div>
                              )}
                            </div>
                          ))}
                          {pastEvents.length > 5 && (
                            <div className="text-xs text-muted-foreground">
                              +{pastEvents.length - 5} more past events...
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: 'followers',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-primary/10"
        >
          <Users className="h-4 w-4 mr-1" />
          Followers
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      filterFn: (row, columnId, filterValue) => {
        const spotifyId = row.original.spotify_id;
        if (filterValue === 'has-spotify') {
          return !!spotifyId;
        }
        return true;
      },
      cell: ({ row }) => {
        const followers = row.getValue('followers') as number | undefined;
        if (!followers && followers !== 0) return <span className="text-muted-foreground">-</span>;
        return (
          <span className="font-medium tabular-nums">{followers.toLocaleString()}</span>
        );
      },
    },
    {
      accessorKey: 'popularity',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-primary/10"
        >
          <TrendingUp className="h-4 w-4 mr-1" />
          Popularity
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const popularity = row.getValue('popularity') as number | undefined;
        if (popularity === undefined || popularity === null) return <span className="text-muted-foreground">-</span>;
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium tabular-nums">{popularity}</span>
            <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-purple-500"
                style={{ width: `${popularity}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'primary_genres',
      header: 'Primary Genres',
      cell: ({ row }) => {
        const primary = row.getValue('primary_genres') as string | undefined;
        if (!primary) return <span className="text-muted-foreground">-</span>;
        
        const genres = primary.split(' | ');
        return (
          <div className="flex flex-wrap gap-1 max-w-[200px]">
            {genres.map((genre, i) => (
              <Badge key={i} variant="outline" className="text-xs border-purple-500/30 text-purple-500">
                {genre}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: 'secondary_genres',
      header: 'Secondary Genres',
      cell: ({ row }) => {
        const secondary = row.getValue('secondary_genres') as string | undefined;
        if (!secondary) return <span className="text-muted-foreground">-</span>;
        
        const genres = secondary.split(' | ').slice(0, 3);
        const hasMore = secondary.split(' | ').length > 3;
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-wrap gap-1 max-w-[150px]">
                  {genres.map((genre, i) => (
                    <Badge key={i} variant="outline" className="text-xs border-primary/20">
                      {genre}
                    </Badge>
                  ))}
                  {hasMore && (
                    <Badge variant="outline" className="text-xs border-primary/20">
                      +{secondary.split(' | ').length - 3}
                    </Badge>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm max-w-xs">{secondary}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      accessorKey: 'sound_descriptor',
      header: 'Sound',
      cell: ({ row }) => {
        const descriptor = row.getValue('sound_descriptor') as string | undefined;
        if (!descriptor) return <span className="text-muted-foreground">-</span>;
        return (
          <Badge className="bg-gradient-to-r from-purple-500/10 to-primary/10 text-primary border-primary/30">
            {descriptor}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'energy_mean',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-primary/10"
        >
          <Zap className="h-4 w-4 mr-1" />
          Energy
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const value = row.getValue('energy_mean') as number | undefined;
        if (value === undefined || value === null) return <span className="text-muted-foreground">-</span>;
        return (
          <div className="flex items-center gap-1">
            <span className="font-medium tabular-nums">{formatPercent(value)}</span>
            <div className="w-8 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-yellow-500 to-orange-500"
                style={{ width: `${value * 100}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'danceability_mean',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-primary/10"
        >
          <Activity className="h-4 w-4 mr-1" />
          Dance
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const value = row.getValue('danceability_mean') as number | undefined;
        if (value === undefined || value === null) return <span className="text-muted-foreground">-</span>;
        return (
          <div className="flex items-center gap-1">
            <span className="font-medium tabular-nums">{formatPercent(value)}</span>
            <div className="w-8 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-pink-500 to-purple-500"
                style={{ width: `${value * 100}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'valence_mean',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-primary/10"
        >
          <Star className="h-4 w-4 mr-1" />
          Valence
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const value = row.getValue('valence_mean') as number | undefined;
        if (value === undefined || value === null) return <span className="text-muted-foreground">-</span>;
        return (
          <div className="flex items-center gap-1">
            <span className="font-medium tabular-nums">{formatPercent(value)}</span>
            <div className="w-8 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-blue-500"
                style={{ width: `${value * 100}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'tempo_bpm_mean',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-primary/10"
        >
          <Gauge className="h-4 w-4 mr-1" />
          BPM
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const value = row.getValue('tempo_bpm_mean') as number | undefined;
        if (value === undefined || value === null) return <span className="text-muted-foreground">-</span>;
        return (
          <span className="font-medium tabular-nums">{Math.round(value)}</span>
        );
      },
    },
    {
      accessorKey: 'acousticness_mean',
      header: 'Acoustic',
      cell: ({ row }) => {
        const value = row.getValue('acousticness_mean') as number | undefined;
        if (value === undefined || value === null) return <span className="text-muted-foreground">-</span>;
        return <span className="text-sm tabular-nums">{formatPercent(value)}</span>;
      },
    },
    {
      accessorKey: 'instrumentalness_mean',
      header: 'Instrumental',
      cell: ({ row }) => {
        const value = row.getValue('instrumentalness_mean') as number | undefined;
        if (value === undefined || value === null) return <span className="text-muted-foreground">-</span>;
        return <span className="text-sm tabular-nums">{formatPercent(value)}</span>;
      },
    },
    {
      accessorKey: 'liveness_mean',
      header: 'Live',
      cell: ({ row }) => {
        const value = row.getValue('liveness_mean') as number | undefined;
        if (value === undefined || value === null) return <span className="text-muted-foreground">-</span>;
        return <span className="text-sm tabular-nums">{formatPercent(value)}</span>;
      },
    },
    {
      accessorKey: 'speechiness_mean',
      header: 'Speech',
      cell: ({ row }) => {
        const value = row.getValue('speechiness_mean') as number | undefined;
        if (value === undefined || value === null) return <span className="text-muted-foreground">-</span>;
        return <span className="text-sm tabular-nums">{formatPercent(value)}</span>;
      },
    },
    {
      accessorKey: 'loudness_mean_db',
      header: 'Loudness',
      cell: ({ row }) => {
        const value = row.getValue('loudness_mean_db') as number | undefined;
        if (value === undefined || value === null) return <span className="text-muted-foreground">-</span>;
        return <span className="text-sm tabular-nums">{formatDecimal(value, 1)} dB</span>;
      },
    },
    {
      accessorKey: 'top_track_name',
      header: 'Top Track',
      cell: ({ row }) => {
        const trackId = row.original.top_track_id;
        const trackName = row.original.top_track_name;
        const trackPop = row.original.top_track_popularity;
        
        if (!trackId && !trackName) return <span className="text-muted-foreground">No track</span>;
        
        const spotifyUrl = trackId ? `https://open.spotify.com/track/${trackId}` : null;
        
        return (
          <div className="flex items-center gap-2 min-w-[200px]">
            <div className="flex-1">
              <p className="font-medium text-sm truncate">{trackName || 'Unknown Track'}</p>
              {trackPop !== undefined && (
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-green-400"
                      style={{ width: `${trackPop}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{trackPop}</span>
                </div>
              )}
            </div>
            {spotifyUrl && (
              <motion.a
                href={spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-green-500/10 transition-colors group"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg
                  className="w-5 h-5 text-muted-foreground group-hover:text-green-500 transition-colors"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
              </motion.a>
            )}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: 'top_track_popularity',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-primary/10"
        >
          Track Pop
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const value = row.getValue('top_track_popularity') as number | undefined;
        if (value === undefined || value === null) return <span className="text-muted-foreground">-</span>;
        return (
          <div className="flex items-center gap-1">
            <span className="font-medium tabular-nums">{value}</span>
            <div className="w-8 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-green-500"
                style={{ width: `${value}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'related_1',
      header: 'Related Artists',
      cell: ({ row }) => {
        const related1 = row.getValue('related_1') as string | undefined;
        const related2 = row.original.related_2;
        const related3 = row.original.related_3;
        
        if (!related1 && !related2 && !related3) return <span className="text-muted-foreground">-</span>;
        
        const relatedArtists = [related1, related2, related3].filter(Boolean);
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-wrap gap-1 max-w-[200px]">
                  <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-500">
                    {related1 || 'None'}
                  </Badge>
                  {relatedArtists.length > 1 && (
                    <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-500">
                      +{relatedArtists.length - 1}
                    </Badge>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  {relatedArtists.map((artist, i) => (
                    <p key={i} className="text-sm">{i + 1}. {artist}</p>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      accessorKey: 'enriched_at',
      header: 'Status',
      filterFn: (row, columnId, filterValue) => {
        const enrichedAt = row.getValue('enriched_at');
        if (filterValue === 'enriched') {
          return !!enrichedAt;
        }
        return true;
      },
      cell: ({ row }) => {
        const enrichedAt = row.getValue('enriched_at') as string | undefined;
        
        if (enrichedAt) {
          return (
            <Badge className="bg-green-500/10 text-green-500 border-green-500/30">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Complete
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className="border-primary/30">
            <AlertCircle className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const artist = row.original;
        const isEnriching = enriching === artist.id || (massEnrichment.currentArtist?.id === artist.id);
        
        return (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => enrichArtist(artist)}
              disabled={isEnriching || !!artist.enriched_at || massEnrichment.isRunning}
              className="border-primary/30 hover:bg-primary/10 hover:text-primary"
            >
              {isEnriching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : artist.enriched_at ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-0.5" />
                  Done
                </>
              ) : (
                <>
                  <Zap className="h-3 w-3 mr-0.5" />
                  Enrich
                </>
              )}
            </Button>
            {artist.spotify_url && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => window.open(artist.spotify_url, '_blank')}
                className="h-8 w-8 hover:bg-green-500/10 hover:text-green-500"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const eventColumns: ColumnDef<Event>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'first_seen_at',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 hover:bg-blue-500/10"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Added
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
          )}
        </Button>
      ),
      cell: ({ row }) => {
        const date = row.original.first_seen_at || row.original.created_at;
        if (!date) return <span className="text-muted-foreground text-xs">-</span>;
        
        const createdDate = new Date(date);
        const now = new Date();
        const diffMs = now.getTime() - createdDate.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        let displayText = '';
        let badgeClass = '';
        
        if (diffHours < 1) {
          displayText = 'New!';
          badgeClass = 'bg-red-500/10 text-red-600 border-red-500/20 animate-pulse';
        } else if (diffHours < 24) {
          displayText = `${diffHours}h ago`;
          badgeClass = 'bg-orange-500/10 text-orange-600 border-orange-500/20';
        } else if (diffDays < 7) {
          displayText = `${diffDays}d ago`;
          badgeClass = diffDays < 3 ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' : 'bg-muted text-muted-foreground';
        } else {
          displayText = format(createdDate, 'MMM d');
          badgeClass = 'bg-muted text-muted-foreground';
        }
        
        return (
          <Tooltip>
            <TooltipTrigger>
              <Badge className={`text-xs ${badgeClass}`}>
                {displayText}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              {format(createdDate, 'PPpp')}
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-primary/10"
        >
          <Ticket className="h-4 w-4 mr-1" />
          Event Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-sm">
              <Ticket className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm truncate">{row.getValue('title')}</div>
              {row.original.subtitle && (
                <div className="text-xs text-muted-foreground truncate mt-0.5">{row.original.subtitle}</div>
              )}
            </div>
            {row.original.sold_out && (
              <Badge variant="destructive" className="text-xs">
                Sold Out
              </Badge>
            )}
          </div>
          
          {/* Genre Tags */}
          {row.original.eventGenres && row.original.eventGenres.length > 0 && (
            <div className="flex flex-wrap gap-1 pl-13">
              {row.original.eventPrimaryGenres?.slice(0, 4).map((genre, i) => (
                <Badge 
                  key={`primary-${i}`} 
                  className="bg-gradient-to-r from-primary/10 to-secondary/10 text-primary border-primary/20 text-xs px-1.5 py-0.5 hover:from-primary/20 hover:to-secondary/20 transition-all cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Filter events by this genre using global filter
                    setGlobalFilter(genre);
                  }}
                >
                  <Music2 className="h-2.5 w-2.5 mr-0.5" />
                  {genre}
                </Badge>
              ))}
              {row.original.eventSecondaryGenres?.slice(0, 2).map((genre, i) => (
                <Badge 
                  key={`secondary-${i}`} 
                  variant="outline" 
                  className="border-muted-foreground/20 bg-muted/10 text-muted-foreground text-xs px-1.5 py-0.5 hover:bg-muted/20 transition-all cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Filter events by this genre using global filter
                    setGlobalFilter(genre);
                  }}
                >
                  {genre}
                </Badge>
              ))}
              {row.original.eventGenres.length > 6 && (
                <Badge 
                  variant="outline" 
                  className="text-xs px-1.5 py-0.5 border-dashed"
                >
                  +{row.original.eventGenres.length - 6} more
                </Badge>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'venue_name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-primary/10"
        >
          <MapPin className="h-4 w-4 mr-1" />
          Venue
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const venue = row.getValue('venue_name') as string;
        return venue ? (
          <Badge variant="outline" className="border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 transition-colors text-xs px-2.5 py-1">
            <MapPin className="h-3 w-3 mr-1" />
            <span className="truncate max-w-[120px]">{venue}</span>
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm italic">TBA</span>
        );
      },
    },
    {
      accessorKey: 'start_date',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-primary/10"
        >
          <Clock className="h-4 w-4 mr-1" />
          Date & Time
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const startDate = row.getValue('start_date') as string;
        const endDate = row.original.end_date;

        const isToday = new Date().toDateString() === new Date(startDate).toDateString();
        const isTomorrow = new Date(Date.now() + 86400000).toDateString() === new Date(startDate).toDateString();

        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge
                variant={isToday ? "default" : "secondary"}
                className={`text-xs px-2.5 py-1 ${isToday ? 'bg-green-500 hover:bg-green-600 animate-pulse' : ''}`}
              >
                {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : format(new Date(startDate), 'MMM dd, yyyy')}
              </Badge>
              {isToday && <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium tabular-nums">
                {format(new Date(startDate), 'HH:mm')}
              </span>
              <span className="text-muted-foreground">-</span>
              <span className="tabular-nums">
                {format(new Date(endDate), 'HH:mm')}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'categories',
      header: 'Categories',
      cell: ({ row }) => {
        const categories = row.getValue('categories') as string;
        if (!categories) return <span className="text-muted-foreground text-sm">-</span>;

        const categoryList = categories.split('/').filter(Boolean);
        const colors = [
          'border-purple-500/30 bg-purple-500/10 text-purple-700',
          'border-blue-500/30 bg-blue-500/10 text-blue-700',
          'border-green-500/30 bg-green-500/10 text-green-700',
          'border-orange-500/30 bg-orange-500/10 text-orange-700'
        ];

        return (
          <div className="flex flex-wrap gap-1.5">
            {categoryList.slice(0, 3).map((cat, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className={`text-xs px-2 py-0.5 hover:scale-105 transition-transform cursor-default ${colors[idx % colors.length]}`}
              >
                {cat.trim()}
              </Badge>
            ))}
            {categoryList.length > 3 && (
              <Badge variant="outline" className="text-xs px-2 py-0.5 border-gray-500/30 bg-gray-500/10 text-gray-600">
                +{categoryList.length - 3} more
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'artistNames',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-primary/10"
        >
          <Users className="h-4 w-4 mr-1" />
          Lineup
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const artists = row.original.artists || [];
        const artistCount = row.original.artistCount || 0;

        if (!artists || artists.length === 0) {
          return <span className="text-muted-foreground text-sm italic">No lineup yet</span>;
        }

        const displayArtists = artists.slice(0, 3);
        const remainingCount = artists.length - 3;

        // Debug: Log first artist to see available data
        if (displayArtists.length > 0) {
          console.log('Artist data sample:', displayArtists[0]);
        }

        return (
          <div className="space-y-4 min-w-[400px]">
            {/* Enhanced Artist Cards */}
            <div className="space-y-3">
              {displayArtists.map((artist, idx) => (
                <motion.div 
                  key={idx} 
                  className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-black via-gray-950/90 to-black border border-primary/10 hover:border-primary/40 transition-all duration-500 shadow-2xl hover:shadow-primary/20"
                  initial={{ opacity: 0, y: 20, rotateX: -10 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{ 
                    delay: idx * 0.15,
                    duration: 0.6,
                    type: "spring",
                    stiffness: 100
                  }}
                  whileHover={{ 
                    scale: 1.03,
                    rotateY: 2,
                    z: 50,
                    transition: { duration: 0.3 }
                  }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* Animated Background Gradients */}
                  <div className="absolute inset-0 opacity-30 group-hover:opacity-60 transition-opacity duration-500">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20 animate-pulse" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-chart-1/10 via-transparent to-chart-2/10 animate-pulse" style={{ animationDelay: '1s' }} />
                    <div className="absolute inset-0 bg-gradient-to-bl from-chart-3/10 via-transparent to-chart-4/10 animate-pulse" style={{ animationDelay: '2s' }} />
                  </div>
                  
                  {/* Particle Effect Overlay */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute w-1 h-1 bg-primary rounded-full animate-ping" style={{ top: '10%', left: '20%', animationDuration: '3s' }} />
                    <div className="absolute w-1 h-1 bg-secondary rounded-full animate-ping" style={{ top: '70%', left: '80%', animationDuration: '4s' }} />
                    <div className="absolute w-1 h-1 bg-chart-1 rounded-full animate-ping" style={{ top: '40%', left: '60%', animationDuration: '3.5s' }} />
                  </div>
                  
                  {/* Holographic Shimmer */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                  
                  <div className="relative p-4">
                    {/* Header Section */}
                    <div className="flex items-start gap-4 mb-3">
                      {/* ULTRA Enhanced Artist Photo with 3D Effects */}
                      <motion.div 
                        className="relative"
                        whileHover={{ 
                          scale: 1.1,
                          rotateZ: 5,
                          transition: { duration: 0.3 }
                        }}
                      >
                        {/* Spinning Glow Ring */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary via-secondary to-primary opacity-50 blur-xl animate-spin" style={{ animationDuration: '8s' }} />
                        
                        {/* Pulsing Outer Ring */}
                        <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-chart-1 via-chart-2 to-chart-3 opacity-30 animate-pulse" />
                        
                        {artist.spotify_image || artist.image_url ? (
                          <motion.img 
                            src={artist.spotify_image || artist.image_url} 
                            alt={artist.title} 
                            className="relative w-20 h-20 object-cover rounded-full border-3 border-primary/50 shadow-2xl ring-4 ring-primary/20 group-hover:ring-primary/50 transition-all duration-500"
                            whileHover={{ 
                              filter: "saturate(1.2) contrast(1.1)",
                            }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder-artist.png';
                            }}
                          />
                        ) : (
                          <motion.div 
                            className="relative w-20 h-20 bg-gradient-to-br from-primary via-secondary to-chart-1 rounded-full flex items-center justify-center shadow-2xl ring-4 ring-primary/20 group-hover:ring-primary/50 transition-all duration-500"
                            animate={{ 
                              backgroundImage: [
                                'linear-gradient(135deg, var(--primary), var(--secondary))',
                                'linear-gradient(135deg, var(--secondary), var(--chart-1))',
                                'linear-gradient(135deg, var(--chart-1), var(--primary))',
                              ]
                            }}
                            transition={{ duration: 3, repeat: Infinity }}
                          >
                            <Mic className="h-10 w-10 text-primary-foreground drop-shadow-lg" />
                          </motion.div>
                        )}
                        
                        {/* EPIC Confidence Score */}
                        {artist.confidence && (
                          <motion.div 
                            className="absolute -top-3 -right-3 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 text-white text-xs rounded-full w-8 h-8 flex items-center justify-center font-black shadow-2xl border-2 border-white/20"
                            animate={{ 
                              scale: [1, 1.1, 1],
                              rotate: [0, 5, -5, 0]
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            {Math.round(artist.confidence * 100)}%
                          </motion.div>
                        )}
                        
                        {/* GLOWING Spotify Badge */}
                        {artist.spotify_id && (
                          <motion.div 
                            className="absolute -bottom-2 -right-2 bg-gradient-to-br from-green-400 via-green-500 to-emerald-600 rounded-full p-2 shadow-2xl"
                            animate={{ 
                              boxShadow: [
                                '0 0 20px rgba(34, 197, 94, 0.5)',
                                '0 0 40px rgba(34, 197, 94, 0.8)',
                                '0 0 20px rgba(34, 197, 94, 0.5)',
                              ]
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <Disc className="h-4 w-4 text-white drop-shadow-lg" />
                          </motion.div>
                        )}
                      </motion.div>
                      
                      {/* Artist Info */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-base text-foreground truncate group-hover:text-primary transition-colors">
                            {artist.title}
                          </h4>
                          {artist.popularity && (
                            <Badge className="bg-gradient-to-r from-chart-1 to-chart-2 text-primary-foreground border-0 text-xs px-2">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              {artist.popularity}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Country & Followers */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {artist.country_label && (
                            <div className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              <span>{artist.country_label}</span>
                            </div>
                          )}
                          {artist.followers && (
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span>{(artist.followers / 1000).toFixed(0)}k</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Sound Descriptor or Genres as fallback */}
                        {(artist.sound_descriptor || artist.genres) && (
                          <div className="text-xs text-muted-foreground italic">
                            {artist.sound_descriptor ? `"${artist.sound_descriptor}"` : artist.genres}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Genres Section - Handle multiple formats */}
                    {(artist.primary_genres || artist.secondary_genres || artist.genres) && (
                      <div className="space-y-2 mb-3">
                        {/* Primary Genres or Genres fallback */}
                        {(artist.primary_genres || artist.genres) && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                              <Palette className="h-3 w-3" />
                              <span>Genres</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {(() => {
                                const genresStr = artist.primary_genres || artist.genres || '';
                                const genresList = genresStr.includes(' | ') 
                                  ? genresStr.split(' | ')
                                  : genresStr.includes(',') 
                                  ? genresStr.split(',').map(g => g.trim())
                                  : genresStr.includes('/') 
                                  ? genresStr.split('/').map(g => g.trim())
                                  : [genresStr].filter(g => g);
                                
                                return genresList.slice(0, 3).map((genre, i) => (
                                  <Badge key={i} className="bg-gradient-to-r from-primary/10 to-secondary/10 text-primary border-primary/20 text-xs px-2 py-0.5 hover:from-primary/20 hover:to-secondary/20 transition-all">
                                    <Music2 className="h-2.5 w-2.5 mr-1" />
                                    {genre}
                                  </Badge>
                                ));
                              })()}
                            </div>
                          </div>
                        )}
                        
                        {/* Secondary Genres if available */}
                        {artist.secondary_genres && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                              <Waves className="h-3 w-3" />
                              <span>Sub-genres</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {(() => {
                                const genresStr = artist.secondary_genres || '';
                                const genresList = genresStr.includes(' | ') 
                                  ? genresStr.split(' | ')
                                  : genresStr.includes(',') 
                                  ? genresStr.split(',').map(g => g.trim())
                                  : [genresStr].filter(g => g);
                                
                                return genresList.slice(0, 4).map((genre, i) => (
                                  <Badge key={i} variant="outline" className="border-muted-foreground/20 bg-muted/30 text-muted-foreground text-xs px-1.5 py-0.5">
                                    {genre}
                                  </Badge>
                                ));
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* INSANE Audio Features Visualization - Show if ANY data available */}
                    {(artist.energy_mean != null || artist.danceability_mean != null || artist.valence_mean != null || 
                      artist.tempo_bpm_mean != null || artist.popularity != null) && (
                      <motion.div 
                        className="space-y-3 mb-4 p-3 rounded-xl bg-gradient-to-br from-black/50 via-gray-950/50 to-black/50 border border-primary/20"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            >
                              <BarChart3 className="h-4 w-4 text-primary" />
                            </motion.div>
                            <span className="text-sm font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                              Audio DNA Analysis
                            </span>
                          </div>
                          <Badge className="bg-gradient-to-r from-chart-1/20 to-chart-2/20 border-chart-1/30 text-xs">
                            AI Analyzed
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3">
                          {artist.energy_mean !== null && artist.energy_mean !== undefined && (
                            <motion.div 
                              className="relative group/stat cursor-pointer"
                              whileHover={{ scale: 1.05, y: -2 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/30 to-yellow-500/30 rounded-xl blur-xl group-hover/stat:blur-2xl transition-all duration-300" />
                              <div className="relative p-3 rounded-xl bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border border-orange-500/30 backdrop-blur-sm">
                                <div className="flex items-center justify-between mb-2">
                                  <motion.div
                                    animate={{ 
                                      scale: [1, 1.2, 1],
                                      rotate: [0, 10, -10, 0]
                                    }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                  >
                                    <Zap className="h-5 w-5 text-orange-400 drop-shadow-glow" />
                                  </motion.div>
                                  <span className="text-2xl font-black text-orange-300">
                                    {Math.round(artist.energy_mean * 100)}
                                  </span>
                                </div>
                                <div className="text-xs font-bold text-orange-400 mb-2">ENERGY</div>
                                <div className="relative h-2 bg-black/50 rounded-full overflow-hidden">
                                  <motion.div 
                                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${artist.energy_mean * 100}%` }}
                                    transition={{ duration: 1, delay: 0.5 }}
                                  />
                                  <motion.div 
                                    className="absolute inset-y-0 bg-white/30"
                                    animate={{ 
                                      left: ['0%', '100%', '0%']
                                    }}
                                    transition={{ duration: 3, repeat: Infinity }}
                                    style={{ width: '20%' }}
                                  />
                                </div>
                              </div>
                            </motion.div>
                          )}
                          
                          {artist.danceability_mean !== null && artist.danceability_mean !== undefined && (
                            <motion.div 
                              className="relative group/stat cursor-pointer"
                              whileHover={{ scale: 1.05, y: -2 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-xl blur-xl group-hover/stat:blur-2xl transition-all duration-300" />
                              <div className="relative p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 backdrop-blur-sm">
                                <div className="flex items-center justify-between mb-2">
                                  <motion.div
                                    animate={{ 
                                      y: [0, -3, 0],
                                      rotate: [0, -5, 5, 0]
                                    }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                  >
                                    <Activity className="h-5 w-5 text-purple-400 drop-shadow-glow" />
                                  </motion.div>
                                  <span className="text-2xl font-black text-purple-300">
                                    {Math.round(artist.danceability_mean * 100)}
                                  </span>
                                </div>
                                <div className="text-xs font-bold text-purple-400 mb-2">DANCE</div>
                                <div className="relative h-2 bg-black/50 rounded-full overflow-hidden">
                                  <motion.div 
                                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${artist.danceability_mean * 100}%` }}
                                    transition={{ duration: 1, delay: 0.6 }}
                                  />
                                  <motion.div 
                                    className="absolute inset-y-0 bg-white/30"
                                    animate={{ 
                                      left: ['0%', '100%', '0%']
                                    }}
                                    transition={{ duration: 3, repeat: Infinity, delay: 1 }}
                                    style={{ width: '20%' }}
                                  />
                                </div>
                              </div>
                            </motion.div>
                          )}
                          
                          {artist.valence_mean !== null && artist.valence_mean !== undefined && (
                            <motion.div 
                              className="relative group/stat cursor-pointer"
                              whileHover={{ scale: 1.05, y: -2 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-br from-green-500/30 to-blue-500/30 rounded-xl blur-xl group-hover/stat:blur-2xl transition-all duration-300" />
                              <div className="relative p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-blue-500/20 border border-green-500/30 backdrop-blur-sm">
                                <div className="flex items-center justify-between mb-2">
                                  <motion.div
                                    animate={{ 
                                      scale: [1, 1.3, 1],
                                    }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                  >
                                    <Heart className="h-5 w-5 text-green-400 drop-shadow-glow" />
                                  </motion.div>
                                  <span className="text-2xl font-black text-green-300">
                                    {Math.round(artist.valence_mean * 100)}
                                  </span>
                                </div>
                                <div className="text-xs font-bold text-green-400 mb-2">MOOD</div>
                                <div className="relative h-2 bg-black/50 rounded-full overflow-hidden">
                                  <motion.div 
                                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-400 via-cyan-400 to-blue-400"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${artist.valence_mean * 100}%` }}
                                    transition={{ duration: 1, delay: 0.7 }}
                                  />
                                  <motion.div 
                                    className="absolute inset-y-0 bg-white/30"
                                    animate={{ 
                                      left: ['0%', '100%', '0%']
                                    }}
                                    transition={{ duration: 3, repeat: Infinity, delay: 2 }}
                                    style={{ width: '20%' }}
                                  />
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    )}
                    
                    {/* Spotify Top Track */}
                    {artist.top_track_id && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                          <Headphones className="h-3 w-3" />
                          <span>Top Track Preview</span>
                          {artist.top_track_popularity && (
                            <Badge variant="outline" className="text-xs px-1.5 py-0.5 ml-auto">
                              <Star className="h-2.5 w-2.5 mr-1" />
                              {artist.top_track_popularity}
                            </Badge>
                          )}
                        </div>
                        <SpotifyTrackPlayer
                          trackId={artist.top_track_id}
                          trackName={artist.top_track_name}
                          artistName={artist.title}
                          popularity={artist.top_track_popularity}
                          className="w-full"
                        />
                      </div>
                    )}
                    
                    {/* Quick Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-border/30">
                      <div className="flex items-center gap-2">
                        {artist.spotify_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(artist.spotify_url, '_blank')}
                            className="text-xs h-7 px-2 border-green-500/30 bg-green-500/10 text-green-600 hover:bg-green-500/20"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Spotify
                          </Button>
                        )}
                        {artist.url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(artist.url, '_blank')}
                            className="text-xs h-7 px-2"
                          >
                            <Globe className="h-3 w-3 mr-1" />
                            ADE
                          </Button>
                        )}
                      </div>
                      
                      {/* Tempo & Additional Stats */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {artist.tempo_bpm_mean && (
                          <div className="flex items-center gap-1">
                            <Volume2 className="h-3 w-3" />
                            <span>{Math.round(artist.tempo_bpm_mean)} BPM</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {/* More Artists Indicator */}
              {remainingCount > 0 && (
                <motion.div 
                  className="p-4 border-2 border-dashed border-muted-foreground/30 rounded-xl text-center bg-gradient-to-br from-muted/20 to-muted/10 hover:from-muted/30 hover:to-muted/20 transition-all cursor-pointer group"
                  whileHover={{ scale: 1.02 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: displayArtists.length * 0.1 }}
                >
                  <Badge className="bg-gradient-to-r from-primary to-secondary text-primary-foreground border-0 px-3 py-1.5 group-hover:from-primary/80 group-hover:to-secondary/80 transition-all">
                    <Users className="h-4 w-4 mr-2" />
                    +{remainingCount} more artists
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-2">
                    Click to view full lineup
                  </div>
                </motion.div>
              )}
            </div>
            
            {/* Enhanced Summary Stats */}
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border/30">
              <Badge className="bg-gradient-to-r from-chart-1 to-chart-2 text-primary-foreground border-0 px-3 py-1.5 shadow-sm">
                <Users className="h-3.5 w-3.5 mr-1.5" />
                {artistCount} Total Artists
              </Badge>
              
              {artists.filter(a => a.spotify_id).length > 0 && (
                <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-600 px-2.5 py-1">
                  <Disc className="h-3.5 w-3.5 mr-1.5" />
                  {artists.filter(a => a.spotify_id).length} on Spotify
                </Badge>
              )}
              
              {artists.filter(a => a.primary_genres).length > 0 && (
                <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary px-2.5 py-1">
                  <Palette className="h-3.5 w-3.5 mr-1.5" />
                  {artists.filter(a => a.primary_genres).length} with genres
                </Badge>
              )}
              
              {artists.filter(a => a.energy_mean !== null && a.energy_mean !== undefined).length > 0 && (
                <Badge variant="outline" className="border-orange-500/30 bg-orange-500/10 text-orange-600 px-2.5 py-1">
                  <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                  {artists.filter(a => a.energy_mean !== null && a.energy_mean !== undefined).length} with audio data
                </Badge>
              )}
              
              {artists.filter(a => a.top_track_id).length > 0 && (
                <Badge variant="outline" className="border-purple-500/30 bg-purple-500/10 text-purple-600 px-2.5 py-1">
                  <Headphones className="h-3.5 w-3.5 mr-1.5" />
                  {artists.filter(a => a.top_track_id).length} with previews
                </Badge>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const event = row.original;
        if (event.url) {
          return (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open(event.url, '_blank')}
              className="h-8 w-8 hover:bg-blue-500/10 hover:text-blue-500"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          );
        }
        return null;
      },
    },
  ];

  const table = useReactTable({
    data: viewMode === 'artists' ? artists : events,
    columns: viewMode === 'artists' ? columns : eventColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    initialState: {
      pagination: {
        pageSize: 1000, // Show 1000 items by default
      },
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, columnId, filterValue) => {
      if (viewMode === 'artists') {
        const artist = row.original as Artist;
        const searchValue = filterValue.toLowerCase();
        
        // Search in basic artist info
        const basicSearch = [
          artist.title,
          artist.subtitle,
          artist.country_label,
          artist.primary_genres,
          artist.secondary_genres,
          artist.sound_descriptor,
          artist.name, // Spotify name
        ].filter(Boolean).join(' ').toLowerCase();
        
        // Search in event info
        const eventSearch = [
          ...(artist.events?.map(e => e.title) || []),
          ...(artist.events?.map(e => e.venue_name) || []),
          ...(artist.events?.map(e => e.categories) || []),
          ...(artist.venues || []),
        ].filter(Boolean).join(' ').toLowerCase();
        
        return basicSearch.includes(searchValue) || eventSearch.includes(searchValue);
      }
      
      // Event filtering
      const event = row.original as any;
      const searchValue = filterValue.toLowerCase();
      
      // Search in basic event info
      const basicSearch = [
        event.title,
        event.venue,
        event.venue_name,
        event.category,
        event.categories,
        event.artistNames,
      ].filter(Boolean).join(' ').toLowerCase();
      
      // Search in genres
      const genreSearch = [
        ...(event.eventGenres || []),
        ...(event.eventPrimaryGenres || []),
        ...(event.eventSecondaryGenres || []),
      ].filter(Boolean).join(' ').toLowerCase();
      
      // Search in artist details
      const artistSearch = event.artists?.map((artist: any) => [
        artist.title,
        artist.name,
        artist.primary_genres,
        artist.secondary_genres,
        artist.country_label,
      ].filter(Boolean).join(' ')).join(' ').toLowerCase() || '';
      
      return basicSearch.includes(searchValue) || 
             genreSearch.includes(searchValue) || 
             artistSearch.includes(searchValue);
    },
  });

  const progressPercentage = massEnrichment.totalCount > 0 
    ? (massEnrichment.currentIndex / massEnrichment.totalCount) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />
      <TooltipProvider>
      {/* Header */}
      <div className="border-b border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <motion.div
                  animate={{ rotate: enriching || massEnrichment.isRunning ? 360 : 0 }}
                  transition={{ duration: 2, repeat: enriching || massEnrichment.isRunning ? Infinity : 0, ease: "linear" }}
                >
                  <Sparkles className="w-8 h-8 text-primary" />
                </motion.div>
                Artist Studio
              </h1>
              <p className="text-muted-foreground">
                Comprehensive Spotify enrichment with audio features
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge className="px-4 py-2 bg-primary/10 text-primary border-primary/30">
                <Shield className="h-4 w-4 mr-2" />
                {isSupabaseConfigured() ? 'Database Connected' : 'Database Offline'}
              </Badge>
              {!massEnrichment.isRunning && (
                <>
                  <Button
                    size="lg"
                    onClick={() => startMassEnrichment(false)}
                    disabled={stats.enriched === stats.total && failedArtistIds.size === 0}
                    className="bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 text-white hover:from-yellow-600 hover:via-orange-600 hover:to-red-600 shadow-lg hover:shadow-xl transition-all duration-300 animate-pulse"
                  >
                    <Rocket className="h-5 w-5 mr-2 animate-bounce" />
                    🚀 TURBO Enrich (10x Speed!)
                    <div className="flex items-center gap-2 ml-2">
                      {stats.total - stats.enriched > 0 && (
                        <Badge className="bg-white/30 text-white font-bold">
                          {stats.total - stats.enriched} new
                        </Badge>
                      )}
                      {failedArtistIds.size > 0 && (
                        <Badge className="bg-red-500/30 text-white font-bold animate-pulse">
                          🔄 {failedArtistIds.size} retry
                        </Badge>
                      )}
                    </div>
                  </Button>
                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={() => {
                      if (confirm(`This will re-enrich ALL ${stats.total} artists, overwriting existing data. Are you sure?`)) {
                        startMassEnrichment(true);
                      }
                    }}
                    disabled={stats.total === 0}
                    className="bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700"
                  >
                    <RefreshCw className="h-5 w-5 mr-2" />
                    Re-enrich All
                    <Badge className="ml-2 bg-white/20">
                      {stats.total} artists
                    </Badge>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'artists' | 'events')} className="w-full">
          <div className="flex items-center justify-between mb-6">
            <TabsList className="bg-muted/50 p-1 rounded-2xl shadow-sm border">
              <TabsTrigger
                value="artists"
                className="flex items-center gap-2 px-6 py-3 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
              >
                <Music className="h-4 w-4" />
                <span className="font-medium">Artists</span>
                <Badge variant="secondary" className="ml-1 bg-muted-foreground/10 text-muted-foreground">
                  {artists.length.toLocaleString()}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="events"
                className="flex items-center gap-2 px-6 py-3 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
              >
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Events</span>
                <Badge variant="secondary" className="ml-1 bg-muted-foreground/10 text-muted-foreground">
                  {events.length.toLocaleString()}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Artists Tab */}
          <TabsContent value="artists" className="mt-0">
            <div className="space-y-6">
          {/* Data Summary */}
          {viewMode === 'artists' && table.getFilteredRowModel && (
            <div className="flex items-center justify-between mb-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  Total Artists in Database: <span className="text-primary font-bold text-lg">{stats.total.toLocaleString()}</span>
                </span>
                {globalFilter && (
                  <span className="text-sm text-muted-foreground">
                    • Filtered: <span className="text-primary font-semibold">{table.getFilteredRowModel().rows.length.toLocaleString()}</span>
                  </span>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                Showing {Math.min(table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length).toLocaleString()} on this page
              </div>
            </div>
          )}
          
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Artists</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-primary">{stats.total}</span>
                  <Music className="h-5 w-5 text-primary/50" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Enriched</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-green-500">{stats.enriched}</span>
                  <CheckCircle2 className="h-5 w-5 text-green-500/50" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.total > 0 ? `${Math.round(stats.enriched / stats.total * 100)}%` : '0%'} complete
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">With Spotify</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-blue-500">{stats.withSpotify}</span>
                  <Disc className="h-5 w-5 text-blue-500/50" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">With Genres</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-purple-500">{stats.withGenres}</span>
                  <Hash className="h-5 w-5 text-purple-500/50" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Audio Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-orange-500">{stats.withAudioFeatures}</span>
                  <Activity className="h-5 w-5 text-orange-500/50" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-transparent">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">With Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-cyan-500">{stats.withEvents}</span>
                  <Calendar className="h-5 w-5 text-cyan-500/50" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.total > 0 ? `${Math.round(stats.withEvents / stats.total * 100)}%` : '0%'} performing
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Table Card */}
          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Artist Database</CardTitle>
                  <CardDescription>
                    Full Spotify enrichment with audio analysis and track features
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={loadArtists}
                    variant="outline"
                    className="border-primary/30 hover:bg-primary/10"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <Button
                    onClick={enrichSelectedArtists}
                    disabled={Object.keys(rowSelection).filter(id => rowSelection[id]).length === 0 || massEnrichment.isRunning}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Enrich Selected ({Object.keys(rowSelection).filter(id => rowSelection[id]).length})
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Filters */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search artists, countries, genres, venues, events..."
                      value={globalFilter ?? ''}
                      onChange={(e) => setGlobalFilter(e.target.value)}
                      className="pl-9 border-primary/20 focus:border-primary/50"
                    />
                  </div>
                  <Select
                    value={table.getState().pagination.pageSize.toString()}
                    onValueChange={(value) => table.setPageSize(Number(value))}
                  >
                    <SelectTrigger className="w-[180px] border-primary/20">
                      <SelectValue placeholder="Page size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 per page</SelectItem>
                      <SelectItem value="25">25 per page</SelectItem>
                      <SelectItem value="50">50 per page</SelectItem>
                      <SelectItem value="100">100 per page</SelectItem>
                      <SelectItem value="250">250 per page</SelectItem>
                      <SelectItem value="500">500 per page</SelectItem>
                      <SelectItem value="1000">1000 per page</SelectItem>
                      <SelectItem value="5000">5000 per page</SelectItem>
                      <SelectItem value="99999">Show All</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Quick Filters */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={columnFilters.find(f => f.id === 'events' && f.value === 'has-upcoming') ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      const existingFilter = columnFilters.find(f => f.id === 'events');
                      if (existingFilter && existingFilter.value === 'has-upcoming') {
                        setColumnFilters(prev => prev.filter(f => f.id !== 'events'));
                      } else {
                        setColumnFilters(prev => [
                          ...prev.filter(f => f.id !== 'events'),
                          { id: 'events', value: 'has-upcoming' }
                        ]);
                      }
                    }}
                    className="border-green-500/30 hover:bg-green-500/10"
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    Has Upcoming Events
                  </Button>
                  
                  <Button
                    variant={columnFilters.find(f => f.id === 'events' && f.value === 'no-events') ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      const existingFilter = columnFilters.find(f => f.id === 'events');
                      if (existingFilter && existingFilter.value === 'no-events') {
                        setColumnFilters(prev => prev.filter(f => f.id !== 'events'));
                      } else {
                        setColumnFilters(prev => [
                          ...prev.filter(f => f.id !== 'events'),
                          { id: 'events', value: 'no-events' }
                        ]);
                      }
                    }}
                    className="border-gray-500/30 hover:bg-gray-500/10"
                  >
                    <X className="h-4 w-4 mr-1" />
                    No Events
                  </Button>
                  
                  <Button
                    variant={columnFilters.find(f => f.id === 'enriched_at') ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      const existingFilter = columnFilters.find(f => f.id === 'enriched_at');
                      if (existingFilter) {
                        setColumnFilters(prev => prev.filter(f => f.id !== 'enriched_at'));
                      } else {
                        setColumnFilters(prev => [
                          ...prev.filter(f => f.id !== 'enriched_at'),
                          { id: 'enriched_at', value: 'enriched' }
                        ]);
                      }
                    }}
                    className="border-blue-500/30 hover:bg-blue-500/10"
                  >
                    <Sparkles className="h-4 w-4 mr-1" />
                    Enriched Only
                  </Button>
                  
                  <Button
                    variant={columnFilters.find(f => f.id === 'followers' && f.value === 'has-spotify') ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      const existingFilter = columnFilters.find(f => f.id === 'followers');
                      if (existingFilter && existingFilter.value === 'has-spotify') {
                        setColumnFilters(prev => prev.filter(f => f.id !== 'followers'));
                      } else {
                        setColumnFilters(prev => [
                          ...prev.filter(f => f.id !== 'followers'),
                          { id: 'followers', value: 'has-spotify' }
                        ]);
                      }
                    }}
                    className="border-green-500/30 hover:bg-green-500/10"
                  >
                    <Disc className="h-4 w-4 mr-1" />
                    Has Spotify
                  </Button>
                  
                  {columnFilters.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setColumnFilters([])}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>

              {/* Table */}
              <div className="border rounded-lg border-primary/20 overflow-x-auto">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id} className="border-primary/20 hover:bg-primary/5">
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id} className="text-primary whitespace-nowrap">
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="text-center py-10">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                          <p className="mt-2 text-muted-foreground">Loading artists...</p>
                        </TableCell>
                      </TableRow>
                    ) : table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && 'selected'}
                          className="border-primary/10 hover:bg-primary/5"
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="text-center py-10">
                          <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground" />
                          <p className="mt-2 text-muted-foreground">No artists found</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {table.getFilteredSelectedRowModel().rows.length} of{' '}
                  {table.getFilteredRowModel().rows.length} row(s) selected
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.setPageIndex(0)}
                    disabled={!table.getCanPreviousPage()}
                    className="border-primary/30 hover:bg-primary/10"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="border-primary/30 hover:bg-primary/10"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="border-primary/30 hover:bg-primary/10"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                    disabled={!table.getCanNextPage()}
                    className="border-primary/30 hover:bg-primary/10"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="mt-0">
            <div className="space-y-6">
              {/* Data Summary */}
              {viewMode === 'events' && table.getFilteredRowModel && (
                <div className="flex items-center justify-between mb-4 p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">
                      Total Events in Database: <span className="text-blue-500 font-bold text-lg">{events.length.toLocaleString()}</span>
                    </span>
                    {globalFilter && (
                      <span className="text-sm text-muted-foreground">
                        • Filtered: <span className="text-blue-500 font-semibold">{table.getFilteredRowModel().rows.length.toLocaleString()}</span>
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Showing {Math.min(table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length).toLocaleString()} on this page
                  </div>
                </div>
              )}
              {/* Events Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Events</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-blue-500">{events.length}</span>
                      <Calendar className="h-5 w-5 text-blue-500/50" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Artists</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-purple-500">
                        {events.reduce((total, event) => total + (event.artistCount || 0), 0)}
                      </span>
                      <Users className="h-5 w-5 text-purple-500/50" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Events Today</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-green-500">
                        {events.filter(event => new Date(event.start_date).toDateString() === new Date().toDateString()).length}
                      </span>
                      <Clock className="h-5 w-5 text-green-500/50" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Unique Venues</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-orange-500">
                        {new Set(events.map(event => event.venue_name).filter(Boolean)).size}
                      </span>
                      <MapPin className="h-5 w-5 text-orange-500/50" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Search and View Controls */}
              <Card className="border-blue-500/20">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search events, venues, artists, genres..."
                        value={globalFilter ?? ''}
                        onChange={(e) => setGlobalFilter(e.target.value)}
                        className="pl-9 border-blue-500/20 focus:border-blue-500/50"
                      />
                    </div>
                    <Select
                      value={table.getState().pagination.pageSize.toString()}
                      onValueChange={(value) => table.setPageSize(Number(value))}
                    >
                      <SelectTrigger className="w-[180px] border-blue-500/20">
                        <SelectValue placeholder="Events per page" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6 per page</SelectItem>
                        <SelectItem value="12">12 per page</SelectItem>
                        <SelectItem value="24">24 per page</SelectItem>
                        <SelectItem value="48">48 per page</SelectItem>
                        <SelectItem value="100">100 per page</SelectItem>
                        <SelectItem value="500">500 per page</SelectItem>
                        <SelectItem value="1000">1000 per page</SelectItem>
                        <SelectItem value="99999">Show All</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Genre Filter Buttons */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Music2 className="h-4 w-4 text-primary" />
                        Filter by Genre
                      </Label>
                      {globalFilter && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setGlobalFilter('')}
                          className="h-7 text-xs hover:bg-red-500/10 hover:text-red-500"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Clear Filter
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        // Collect all unique genres from all events
                        const allEventGenres = new Set();
                        events.forEach(event => {
                          if (event.eventGenres) {
                            event.eventGenres.forEach(genre => allEventGenres.add(genre));
                          }
                        });
                        
                        // Convert to array and sort
                        const genres = Array.from(allEventGenres).sort();
                        
                        // Show top genres as buttons
                        const topGenres = genres.slice(0, 12);
                        
                        return (
                          <>
                            {topGenres.map((genre) => (
                              <Button
                                key={genre}
                                size="sm"
                                variant={globalFilter === genre ? "default" : "outline"}
                                onClick={() => setGlobalFilter(globalFilter === genre ? '' : genre)}
                                className={cn(
                                  "h-8 text-xs transition-all duration-200",
                                  globalFilter === genre 
                                    ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-md" 
                                    : "border-primary/20 hover:border-primary/40 hover:bg-primary/10"
                                )}
                              >
                                <Music2 className="h-3 w-3 mr-1" />
                                {genre}
                                <Badge 
                                  variant="secondary" 
                                  className="ml-1.5 h-4 px-1 text-xs bg-background/50"
                                >
                                  {events.filter(e => e.eventGenres?.includes(genre)).length}
                                </Badge>
                              </Button>
                            ))}
                            
                            {genres.length > 12 && (
                              <Select
                                value=""
                                onValueChange={(value) => setGlobalFilter(value)}
                              >
                                <SelectTrigger className="h-8 w-[140px] text-xs border-primary/20">
                                  <SelectValue placeholder={`+${genres.length - 12} more genres`} />
                                </SelectTrigger>
                                <SelectContent>
                                  {genres.slice(12).map((genre) => (
                                    <SelectItem key={genre} value={genre}>
                                      <div className="flex items-center justify-between w-full">
                                        <span>{genre}</span>
                                        <Badge variant="outline" className="ml-2 text-xs">
                                          {events.filter(e => e.eventGenres?.includes(genre)).length}
                                        </Badge>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            
                            {genres.length === 0 && (
                              <div className="text-xs text-muted-foreground italic py-2">
                                No genre data available. Enrich artists to see genres.
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    
                    {/* Quick Filters */}
                    <div className="flex items-center gap-2 pt-2 border-t border-muted/20">
                      <Label className="text-xs text-muted-foreground">Quick:</Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setGlobalFilter('techno')}
                        className="h-7 text-xs"
                      >
                        Techno
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setGlobalFilter('house')}
                        className="h-7 text-xs"
                      >
                        House
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setGlobalFilter('trance')}
                        className="h-7 text-xs"
                      >
                        Trance
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setGlobalFilter('drum')}
                        className="h-7 text-xs"
                      >
                        Drum & Bass
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Events Cards Grid */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-500" />
                    <p className="text-muted-foreground text-lg">Loading events...</p>
                  </div>
                </div>
              ) : table.getRowModel().rows?.length ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {table.getRowModel().rows.map((row, index) => (
                      <EventCard key={row.original.id} event={row.original} index={index} />
                    ))}
                  </div>

                  {/* Pagination */}
                  <Card className="border-blue-500/20">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          Showing {table.getRowModel().rows.length} of {table.getFilteredRowModel().rows.length} events
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.setPageIndex(0)}
                            disabled={!table.getCanPreviousPage()}
                            className="border-blue-500/30 hover:bg-blue-500/10"
                          >
                            <ChevronsLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                            className="border-blue-500/30 hover:bg-blue-500/10"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="text-sm px-3 py-2 bg-muted/50 rounded-lg">
                            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                            className="border-blue-500/30 hover:bg-blue-500/10"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                            disabled={!table.getCanNextPage()}
                            className="border-blue-500/30 hover:bg-blue-500/10"
                          >
                            <ChevronsRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="border-blue-500/20">
                  <CardContent className="text-center py-12">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No events found</h3>
                    <p className="text-muted-foreground">
                      {globalFilter ? 'Try adjusting your search terms' : 'No events available to display'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Mass Enrichment Progress Bar - Sticky Bottom */}
      <AnimatePresence>
        {massEnrichment.isRunning && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-background border-t border-primary/20 shadow-2xl z-50"
          >
            <div className="container mx-auto px-4 py-4">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Rocket className="h-6 w-6 text-yellow-500" />
                    </motion.div>
                    <div>
                      <h3 className="text-lg font-bold bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 bg-clip-text text-transparent">
                        🚀 TURBO Enrichment Active (10x Speed!)
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Batch processing {massEnrichment.totalCount} artists in parallel (10 at a time!)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={pauseMassEnrichment}
                      className="border-primary/30"
                    >
                      {massEnrichment.isPaused ? (
                        <>
                          <Play className="h-4 w-4 mr-1" />
                          Resume
                        </>
                      ) : (
                        <>
                          <Pause className="h-4 w-4 mr-1" />
                          Pause
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={stopMassEnrichment}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Stop
                    </Button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {massEnrichment.currentIndex} of {massEnrichment.totalCount} artists
                    </span>
                    <span className="font-medium text-primary">
                      {Math.round(progressPercentage)}% Complete
                    </span>
                  </div>
                  <Progress value={progressPercentage} className="h-3" />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-5 gap-4">
                  <Card className="border-0 bg-green-500/10">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Success</p>
                          <p className="text-lg font-bold text-green-500">
                            {massEnrichment.successCount}
                          </p>
                        </div>
                        <CheckCircle2 className="h-5 w-5 text-green-500/50" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 bg-red-500/10">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Errors</p>
                          <p className="text-lg font-bold text-red-500">
                            {massEnrichment.errorCount}
                          </p>
                        </div>
                        <AlertCircle className="h-5 w-5 text-red-500/50" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 bg-orange-500/10">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Skipped</p>
                          <p className="text-lg font-bold text-orange-500">
                            {massEnrichment.skippedCount}
                          </p>
                        </div>
                        <Info className="h-5 w-5 text-orange-500/50" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 bg-blue-500/10">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Time Remaining</p>
                          <p className="text-lg font-bold text-blue-500">
                            {massEnrichment.estimatedTimeRemaining}
                          </p>
                        </div>
                        <Clock className="h-5 w-5 text-blue-500/50" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 bg-purple-500/10">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Rate</p>
                          <p className="text-lg font-bold text-purple-500">
                            ~20/min
                          </p>
                        </div>
                        <BarChart2 className="h-5 w-5 text-purple-500/50" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Current Artist */}
                {massEnrichment.currentArtist && (
                  <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm">
                      Currently enriching: <strong>{massEnrichment.currentArtist.title}</strong>
                    </span>
                  </div>
                )}

                {/* Recent Errors */}
                {massEnrichment.errors.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Recent errors:</p>
                    {massEnrichment.errors.slice(-3).map((error, i) => (
                      <div key={i} className="text-xs text-red-500/80">
                        • {error.artist}: {error.error}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </TooltipProvider>
    </div>
  );
}