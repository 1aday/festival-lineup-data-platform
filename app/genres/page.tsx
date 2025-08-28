'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Music,
  Calendar,
  Search,
  Filter,
  Sparkles,
  TrendingUp,
  Globe,
  MapPin,
  Clock,
  Users,
  Disc,
  Mic,
  Headphones,
  Radio,
  Volume2,
  Zap,
  Star,
  Heart,
  ExternalLink,
  ArrowRight,
  X,
  ChevronRight,
  Layers
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface GenreData {
  genre: string;
  artists: any[];
  events: any[];
  count: number;
  color: string;
}

export default function GenresPage() {
  const [artists, setArtists] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'all' | 'artists' | 'events'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      // Load all artists
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

      // Load all events
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

      setArtists(allArtists);
      setEvents(allEvents);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Extract and process genres
  const genreData = useMemo(() => {
    const genreMap = new Map<string, GenreData>();
    
    // Process events by categories
    events.forEach(event => {
      if (event.categories) {
        event.categories.split('/').forEach((cat: string) => {
          const genre = cat.trim();
          if (!genreMap.has(genre)) {
            genreMap.set(genre, {
              genre,
              artists: [],
              events: [],
              count: 0,
              color: `hsl(${Math.random() * 360}, 70%, 50%)`
            });
          }
          const data = genreMap.get(genre)!;
          data.events.push(event);
          data.count++;
        });
      }
    });

    // Process artists (if they have genres from Spotify enrichment)
    artists.forEach(artist => {
      if (artist.genres && Array.isArray(artist.genres)) {
        artist.genres.forEach((genre: string) => {
          if (!genreMap.has(genre)) {
            genreMap.set(genre, {
              genre,
              artists: [],
              events: [],
              count: 0,
              color: `hsl(${Math.random() * 360}, 70%, 50%)`
            });
          }
          const data = genreMap.get(genre)!;
          data.artists.push(artist);
          data.count++;
        });
      }
      
      // Also check subtitle for genre hints
      if (artist.subtitle) {
        const genre = artist.subtitle;
        if (!genreMap.has(genre)) {
          genreMap.set(genre, {
            genre,
            artists: [],
            events: [],
            count: 0,
            color: `hsl(${Math.random() * 360}, 70%, 50%)`
          });
        }
        const data = genreMap.get(genre)!;
        if (!data.artists.includes(artist)) {
          data.artists.push(artist);
          data.count++;
        }
      }
    });

    return Array.from(genreMap.values()).sort((a, b) => b.count - a.count);
  }, [artists, events]);

  // Filter data based on selected genres and search
  const filteredData = useMemo(() => {
    let filteredArtists = artists;
    let filteredEvents = events;

    // Filter by selected genres
    if (selectedGenres.size > 0) {
      filteredEvents = events.filter(event => {
        if (!event.categories) return false;
        const eventGenres = event.categories.split('/').map((c: string) => c.trim());
        return eventGenres.some(g => selectedGenres.has(g));
      });

      filteredArtists = artists.filter(artist => {
        // Check Spotify genres
        if (artist.genres && Array.isArray(artist.genres)) {
          if (artist.genres.some((g: string) => selectedGenres.has(g))) return true;
        }
        // Check subtitle
        if (artist.subtitle && selectedGenres.has(artist.subtitle)) return true;
        // Check if artist appears in filtered events
        return false;
      });
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredArtists = filteredArtists.filter(a => 
        a.title?.toLowerCase().includes(query) ||
        a.subtitle?.toLowerCase().includes(query) ||
        a.country_label?.toLowerCase().includes(query)
      );
      filteredEvents = filteredEvents.filter(e => 
        e.title?.toLowerCase().includes(query) ||
        e.subtitle?.toLowerCase().includes(query) ||
        e.venue_name?.toLowerCase().includes(query)
      );
    }

    return { artists: filteredArtists, events: filteredEvents };
  }, [artists, events, selectedGenres, searchQuery]);

  const toggleGenre = (genre: string) => {
    const newSelected = new Set(selectedGenres);
    if (newSelected.has(genre)) {
      newSelected.delete(genre);
    } else {
      newSelected.add(genre);
    }
    setSelectedGenres(newSelected);
  };

  const clearFilters = () => {
    setSelectedGenres(new Set());
    setSearchQuery('');
  };

  const genreIcons = [Music, Disc, Mic, Headphones, Radio, Volume2, Zap];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[...Array(12)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10" />
        <div className="absolute inset-0 bg-grid-white/[0.02]" />
        
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 px-6 py-12"
        >
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 bg-clip-text text-transparent mb-4">
                  Genre Explorer
                </h1>
                <p className="text-lg text-muted-foreground">
                  Filter and discover artists and events by genre
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="px-4 py-2 border-purple-500/30 bg-purple-500/10">
                  <Layers className="h-4 w-4 mr-2 text-purple-500" />
                  {genreData.length} Genres
                </Badge>
                {selectedGenres.size > 0 && (
                  <Button
                    onClick={clearFilters}
                    variant="outline"
                    className="border-red-500/30 hover:bg-red-500/10"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear ({selectedGenres.size})
                  </Button>
                )}
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto mb-8">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                placeholder="Search artists, events, venues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 h-12 text-lg bg-background/50 backdrop-blur-sm border-purple-500/20 focus:border-purple-500/50"
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Genre Chips */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-background to-background/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-purple-500" />
                Select Genres
              </CardTitle>
            </CardHeader>
            <CardContent>
              <motion.div 
                className="flex flex-wrap gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ staggerChildren: 0.02 }}
              >
                {genreData.slice(0, 50).map((genre, index) => {
                  const Icon = genreIcons[index % genreIcons.length];
                  const isSelected = selectedGenres.has(genre.genre);
                  
                  return (
                    <motion.button
                      key={genre.genre}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: index * 0.01 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleGenre(genre.genre)}
                      className={`
                        relative px-4 py-2 rounded-full border transition-all duration-200
                        ${isSelected 
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent shadow-lg' 
                          : 'bg-background/50 hover:bg-muted border-muted hover:border-purple-500/50'}
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span className="font-medium">{genre.genre}</span>
                        <Badge 
                          variant="secondary" 
                          className={`ml-1 ${isSelected ? 'bg-white/20' : 'bg-muted'}`}
                        >
                          {genre.count}
                        </Badge>
                      </div>
                      {isSelected && (
                        <motion.div
                          layoutId="genre-selector"
                          className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-xl"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </motion.div>
            </CardContent>
          </Card>

          {/* Results */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="w-full h-14 bg-gradient-to-r from-purple-500/5 to-pink-500/5">
              <TabsTrigger 
                value="all"
                className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                All ({filteredData.artists.length + filteredData.events.length})
              </TabsTrigger>
              <TabsTrigger 
                value="artists"
                className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white"
              >
                <Users className="h-4 w-4 mr-2" />
                Artists ({filteredData.artists.length})
              </TabsTrigger>
              <TabsTrigger 
                value="events"
                className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Events ({filteredData.events.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Artists Column */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Music className="h-5 w-5 text-purple-500" />
                    Artists ({filteredData.artists.slice(0, 20).length})
                  </h3>
                  <AnimatePresence mode="popLayout">
                    <div className="space-y-3">
                      {filteredData.artists.slice(0, 20).map((artist, index) => (
                        <motion.div
                          key={artist.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ delay: index * 0.03 }}
                        >
                          <Card className="hover:shadow-lg transition-all duration-200 bg-gradient-to-r from-purple-500/5 to-transparent border-purple-500/20">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                    <Music className="h-5 w-5 text-white" />
                                  </div>
                                  <div>
                                    <div className="font-semibold">{artist.title}</div>
                                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                                      {artist.country_label && (
                                        <>
                                          <Globe className="h-3 w-3" />
                                          {artist.country_label}
                                        </>
                                      )}
                                      {artist.subtitle && (
                                        <>
                                          <span>•</span>
                                          {artist.subtitle}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {artist.popularity && (
                                  <div className="flex items-center gap-1">
                                    <TrendingUp className="h-4 w-4 text-green-500" />
                                    <span className="text-sm font-medium">{artist.popularity}</span>
                                  </div>
                                )}
                              </div>
                              {artist.genres && artist.genres.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-1">
                                  {artist.genres.slice(0, 3).map((g: string) => (
                                    <Badge key={g} variant="secondary" className="text-xs">
                                      {g}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </AnimatePresence>
                </div>

                {/* Events Column */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    Events ({filteredData.events.slice(0, 20).length})
                  </h3>
                  <AnimatePresence mode="popLayout">
                    <div className="space-y-3">
                      {filteredData.events.slice(0, 20).map((event, index) => (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.03 }}
                        >
                          <Card className="hover:shadow-lg transition-all duration-200 bg-gradient-to-r from-blue-500/5 to-transparent border-blue-500/20">
                            <CardContent className="p-4">
                              <div className="space-y-2">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="font-semibold">{event.title}</div>
                                    {event.subtitle && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {event.subtitle}
                                      </div>
                                    )}
                                  </div>
                                  {event.sold_out && (
                                    <Badge variant="destructive">Sold Out</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                  {event.venue_name && (
                                    <div className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {event.venue_name}
                                    </div>
                                  )}
                                  {event.start_date && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {new Date(event.start_date).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                                {event.categories && (
                                  <div className="flex flex-wrap gap-1">
                                    {event.categories.split('/').slice(0, 3).map((cat: string) => (
                                      <Badge 
                                        key={cat} 
                                        variant="outline" 
                                        className="text-xs border-blue-500/30"
                                      >
                                        {cat.trim()}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </AnimatePresence>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="artists" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <AnimatePresence mode="popLayout">
                  {filteredData.artists.map((artist, index) => (
                    <motion.div
                      key={artist.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: Math.min(index * 0.02, 0.5) }}
                    >
                      <Card className="hover:shadow-xl transition-all duration-200 hover:-translate-y-1">
                        <CardContent className="p-6">
                          <div className="flex flex-col items-center text-center space-y-3">
                            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                              <Music className="h-8 w-8 text-white" />
                            </div>
                            <div>
                              <h4 className="font-semibold">{artist.title}</h4>
                              {artist.country_label && (
                                <p className="text-sm text-muted-foreground">{artist.country_label}</p>
                              )}
                            </div>
                            {artist.genres && artist.genres.length > 0 && (
                              <div className="flex flex-wrap gap-1 justify-center">
                                {artist.genres.slice(0, 2).map((g: string) => (
                                  <Badge key={g} variant="secondary" className="text-xs">
                                    {g}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {artist.popularity && (
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-yellow-500" />
                                <span className="text-sm">{artist.popularity}</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </TabsContent>

            <TabsContent value="events" className="mt-6">
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {filteredData.events.map((event, index) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      transition={{ delay: Math.min(index * 0.02, 0.5) }}
                    >
                      <Card className="hover:shadow-xl transition-all duration-200">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <h4 className="text-lg font-semibold">{event.title}</h4>
                              {event.subtitle && (
                                <p className="text-sm text-muted-foreground">{event.subtitle}</p>
                              )}
                              <div className="flex items-center gap-4 text-sm">
                                {event.venue_name && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4 text-orange-500" />
                                    {event.venue_name}
                                  </div>
                                )}
                                {event.start_date && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4 text-blue-500" />
                                    {new Date(event.start_date).toLocaleDateString()}
                                  </div>
                                )}
                                {event.start_date && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-4 w-4 text-green-500" />
                                    {new Date(event.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                )}
                              </div>
                              {event.categories && (
                                <div className="flex flex-wrap gap-2">
                                  {event.categories.split('/').map((cat: string) => (
                                    <Badge key={cat} variant="outline">
                                      {cat.trim()}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {event.sold_out && (
                                <Badge variant="destructive">Sold Out</Badge>
                              )}
                              {event.url && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => window.open(event.url, '_blank')}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </TabsContent>
          </Tabs>

          {/* Stats */}
          {selectedGenres.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              <Card className="bg-gradient-to-br from-purple-500/10 to-transparent">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Selected Genres</p>
                      <p className="text-2xl font-bold">{selectedGenres.size}</p>
                    </div>
                    <Filter className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-green-500/10 to-transparent">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Filtered Artists</p>
                      <p className="text-2xl font-bold">{filteredData.artists.length}</p>
                    </div>
                    <Users className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-blue-500/10 to-transparent">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Filtered Events</p>
                      <p className="text-2xl font-bold">{filteredData.events.length}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
