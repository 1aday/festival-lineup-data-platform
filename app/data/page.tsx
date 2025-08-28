'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { OverviewStats } from '@/components/dashboard/overview-stats';
import { EventTimeline } from '@/components/dashboard/event-timeline';
import { VenueAnalytics } from '@/components/dashboard/venue-analytics';
import { CategoryInsights } from '@/components/dashboard/category-insights';
import { WorldMap } from '@/components/world-map';
import { AdeDataTable } from '@/components/ade-data-table';
import { 
  LayoutDashboard, 
  Map, 
  Table2, 
  BarChart3, 
  Calendar,
  MapPin,
  Tag,
  Activity,
  Sparkles,
  Database,
  TrendingUp
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

export default function DataPage() {
  const [artists, setArtists] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [artistEvents, setArtistEvents] = useState<any[]>([]);
  const [stats, setStats] = useState({
    artists: 0,
    events: 0,
    venues: 0,
    countries: 0,
    connections: 0,
    categories: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      // Load ALL artists
      let allArtists: any[] = [];
      let artistsOffset = 0;
      const artistsLimit = 1000;
      let hasMoreArtists = true;
      
      while (hasMoreArtists) {
        const { data: artistsBatch } = await supabase
          .from('artists')
          .select('*')
          .order('title', { ascending: true })
          .range(artistsOffset, artistsOffset + artistsLimit - 1);
        
        if (artistsBatch && artistsBatch.length > 0) {
          allArtists = [...allArtists, ...artistsBatch];
          artistsOffset += artistsLimit;
          if (artistsBatch.length < artistsLimit) {
            hasMoreArtists = false;
          }
        } else {
          hasMoreArtists = false;
        }
      }

      // Load ALL events
      let allEvents: any[] = [];
      let eventsOffset = 0;
      const eventsLimit = 1000;
      let hasMoreEvents = true;
      
      while (hasMoreEvents) {
        const { data: eventsBatch } = await supabase
          .from('events')
          .select('*')
          .order('start_date', { ascending: true })
          .range(eventsOffset, eventsOffset + eventsLimit - 1);
        
        if (eventsBatch && eventsBatch.length > 0) {
          allEvents = [...allEvents, ...eventsBatch];
          eventsOffset += eventsLimit;
          if (eventsBatch.length < eventsLimit) {
            hasMoreEvents = false;
          }
        } else {
          hasMoreEvents = false;
        }
      }

      // Load ALL artist-event relationships
      let allLinks: any[] = [];
      let linksOffset = 0;
      const linksLimit = 1000;
      let hasMoreLinks = true;
      
      while (hasMoreLinks) {
        const { data: linksBatch } = await supabase
          .from('artist_events')
          .select('*')
          .range(linksOffset, linksOffset + linksLimit - 1);
        
        if (linksBatch && linksBatch.length > 0) {
          allLinks = [...allLinks, ...linksBatch];
          linksOffset += linksLimit;
          if (linksBatch.length < linksLimit) {
            hasMoreLinks = false;
          }
        } else {
          hasMoreLinks = false;
        }
      }

      setArtists(allArtists);
      setEvents(allEvents);
      setArtistEvents(allLinks);

      // Calculate statistics
      if (allArtists && allEvents && allLinks) {
        const countries = new Set(allArtists.map(a => a.country_label).filter(Boolean));
        const venues = new Set(allEvents.map(e => e.venue_name).filter(Boolean));
        const categories = new Set(
          allEvents.flatMap(e => 
            e.categories ? e.categories.split('/').map((c: string) => c.trim()) : []
          )
        );

        setStats({
          artists: allArtists.length,
          events: allEvents.length,
          venues: venues.size,
          countries: countries.size,
          connections: allLinks.length,
          categories: categories.size
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Process events with artists for visualizations
  const eventsWithArtists = events.map(event => {
    const eventArtistLinks = artistEvents.filter(ae => ae.event_id === event.id);
    const eventArtistsData = eventArtistLinks.map(link => {
      const artist = artists.find(a => a.id === link.artist_id);
      return artist ? { ...artist, confidence: link.confidence } : null;
    }).filter(Boolean);
    
    return {
      ...event,
      artists: eventArtistsData,
      artistCount: eventArtistsData.length
    };
  });

  const tabItems = [
    { value: 'overview', label: 'Overview', icon: LayoutDashboard },
    { value: 'timeline', label: 'Timeline', icon: Activity },
    { value: 'venues', label: 'Venues', icon: MapPin },
    { value: 'categories', label: 'Categories', icon: Tag },
    { value: 'map', label: 'World Map', icon: Map },
    { value: 'data', label: 'Data Table', icon: Table2 }
  ];

  const { ref: headerRef, inView: headerInView } = useInView({
    threshold: 0.1,
    triggerOnce: true
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Database className="h-16 w-16 text-purple-500 mx-auto" />
          </motion.div>
          <p className="text-muted-foreground">Loading ADE data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background">
      {/* Header */}
      <motion.div 
        ref={headerRef}
        initial={{ opacity: 0, y: -20 }}
        animate={headerInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10" />
        <div className="absolute inset-0 bg-grid-white/[0.02]" />
        
        <div className="relative z-10 px-6 py-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 bg-clip-text text-transparent mb-4">
                  ADE 2025 Analytics
                </h1>
                <p className="text-lg text-muted-foreground">
                  Comprehensive insights into Amsterdam Dance Event
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="px-4 py-2 border-purple-500/30 bg-purple-500/10">
                  <Sparkles className="h-4 w-4 mr-2 text-purple-500" />
                  Live Data
                </Badge>
                <Badge variant="outline" className="px-4 py-2 border-blue-500/30 bg-blue-500/10">
                  <TrendingUp className="h-4 w-4 mr-2 text-blue-500" />
                  Real-time Updates
                </Badge>
              </div>
            </div>
            
            <OverviewStats stats={stats} />
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsList className="grid grid-cols-6 w-full h-14 bg-gradient-to-r from-purple-500/5 via-blue-500/5 to-purple-500/5">
              {tabItems.map(item => (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500 data-[state=active]:text-white transition-all duration-300"
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">{item.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview" className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <EventTimeline events={eventsWithArtists} />
              </div>
              <VenueAnalytics events={eventsWithArtists} />
            </TabsContent>

            <TabsContent value="timeline">
              <EventTimeline events={eventsWithArtists} />
              <div className="mt-8">
                <CategoryInsights events={eventsWithArtists} />
              </div>
            </TabsContent>

            <TabsContent value="venues">
              <VenueAnalytics events={eventsWithArtists} />
            </TabsContent>

            <TabsContent value="categories">
              <CategoryInsights events={eventsWithArtists} />
            </TabsContent>

            <TabsContent value="map">
              <WorldMap artistData={artists} />
            </TabsContent>

            <TabsContent value="data">
              <AdeDataTable 
                artists={artists} 
                events={events} 
                artistEvents={artistEvents}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
