'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, MapPin, Music, Users, Star, AlertTriangle, Route, Filter, Search, CheckCircle } from 'lucide-react';
import { format, parseISO, isWithinInterval, addMinutes, subMinutes } from 'date-fns';
import { AppShell } from '@/components/design/AppShell';
import { ConversionCtaStrip } from '@/components/monetization/app-ctas';

interface Artist {
  id: number;
  ade_id: number;
  title: string;
  subtitle?: string;
  country_label?: string;
  image_url?: string;
  spotify_id?: string;
  genres?: string[];
  popularity?: number;
  energy_mean?: number;
  danceability_mean?: number;
  valence_mean?: number;
  tempo_bpm_mean?: number;
  sound_descriptor?: string;
}

interface Event {
  id: number;
  ade_id: number;
  title: string;
  subtitle?: string;
  start_date: string;
  end_date: string;
  venue_name?: string;
  venue_address?: string;
  categories?: string;
  sold_out: boolean;
  artists?: Artist[];
}

interface ScheduleEvent extends Event {
  selected: boolean;
  priority: number;
  travelTime?: number;
}

interface TimeSlot {
  start: Date;
  end: Date;
  events: ScheduleEvent[];
}

export default function SchedulePage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('2025-10-22');
  const [viewMode, setViewMode] = useState<'timeline' | 'grid' | 'conflicts'>('timeline');
  const [sortBy, setSortBy] = useState<'time' | 'popularity' | 'energy' | 'venue'>('time');
  const [showConflicts, setShowConflicts] = useState(true);
  const [travelBuffer, setTravelBuffer] = useState(30); // minutes
  const [conflicts, setConflicts] = useState<{ [key: string]: string[] }>({});

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load artists with Spotify enrichment
      const artistsResponse = await fetch('/api/artists?enriched=true');
      const artistsData = await artistsResponse.json();
      
      // Check if artistsData is an array, if not, set empty array
      const artistsArray = Array.isArray(artistsData) ? artistsData : [];
      setArtists(artistsArray);

      // Load events for the selected date
      const eventsResponse = await fetch(`/api/events?date=${selectedDate}`);
      const eventsData = await eventsResponse.json();
      
      // Check if eventsData is an array, if not, set empty array
      const eventsArray = Array.isArray(eventsData) ? eventsData : [];
      setEvents(eventsArray);

      // Initialize schedule events
      const initialScheduleEvents = eventsArray.map((event: Event) => ({
        ...event,
        selected: false,
        priority: 0
      }));
      setScheduleEvents(initialScheduleEvents);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // Get unique genres from artists
  const availableGenres = useMemo(() => {
    const genreSet = new Set<string>();
    if (Array.isArray(artists)) {
      artists.forEach(artist => {
        if (artist.genres) {
          artist.genres.forEach(genre => genreSet.add(genre));
        }
      });
    }
    return Array.from(genreSet).sort();
  }, [artists]);

  // Filter events based on search and filters
  const filteredEvents = useMemo(() => {
    return scheduleEvents.filter(event => {
      const matchesSearch = !searchTerm || 
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.venue_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.artists?.some(artist => 
          artist.title.toLowerCase().includes(searchTerm.toLowerCase())
        );

      const matchesGenres = selectedGenres.length === 0 || 
        event.artists?.some(artist => 
          artist.genres?.some(genre => selectedGenres.includes(genre))
        );

      const matchesDate = event.start_date.startsWith(selectedDate);

      return matchesSearch && matchesGenres && matchesDate;
    });
  }, [scheduleEvents, searchTerm, selectedGenres, selectedDate]);

  // Detect conflicts between selected events
  const detectConflicts = (events: ScheduleEvent[]) => {
    const selectedEvents = events.filter(e => e.selected);
    const conflicts: { [key: string]: string[] } = {};

    selectedEvents.forEach(event => {
      const eventStart = parseISO(event.start_date);
      const eventEnd = parseISO(event.end_date);
      const eventWithBuffer = {
        start: subMinutes(eventStart, travelBuffer),
        end: addMinutes(eventEnd, travelBuffer)
      };

      const eventConflicts: string[] = [];
      
      selectedEvents.forEach(otherEvent => {
        if (otherEvent.id === event.id) return;

        const otherStart = parseISO(otherEvent.start_date);
        const otherEnd = parseISO(otherEvent.end_date);
        const otherWithBuffer = {
          start: subMinutes(otherStart, travelBuffer),
          end: addMinutes(otherEnd, travelBuffer)
        };

        // Check for time overlap
        if (isWithinInterval(eventStart, otherWithBuffer) || 
            isWithinInterval(otherStart, eventWithBuffer)) {
          eventConflicts.push(otherEvent.title);
        }
      });

      conflicts[event.id] = eventConflicts;
    });

    return conflicts;
  };

  // Update conflicts when selected events or travel buffer change
  useEffect(() => {
    const selectedEvents = scheduleEvents.filter(e => e.selected);
    if (selectedEvents.length === 0) {
      setConflicts({});
      return;
    }
    
    const newConflicts = detectConflicts(scheduleEvents);
    setConflicts(newConflicts);
  }, [scheduleEvents.filter(e => e.selected).length, travelBuffer]);

  // Group events by time slots
  const timeSlots = useMemo(() => {
    const slots: TimeSlot[] = [];
    const sortedEvents = [...filteredEvents].sort((a, b) => 
      new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );

    sortedEvents.forEach(event => {
      const eventStart = parseISO(event.start_date);
      const eventEnd = parseISO(event.end_date);
      
      // Find existing slot or create new one
      let slot = slots.find(s => 
        eventStart >= s.start && eventStart < s.end
      );

      if (!slot) {
        slot = {
          start: eventStart,
          end: eventEnd,
          events: []
        };
        slots.push(slot);
      }

      slot.events.push(event);
      slot.end = new Date(Math.max(slot.end.getTime(), eventEnd.getTime()));
    });

    return slots.sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [filteredEvents]);

  const toggleEventSelection = (eventId: number) => {
    setScheduleEvents(prev => prev.map(event => 
      event.id === eventId 
        ? { ...event, selected: !event.selected }
        : event
    ));
  };

  const updateEventPriority = (eventId: number, priority: number) => {
    setScheduleEvents(prev => prev.map(event => 
      event.id === eventId 
        ? { ...event, priority }
        : event
    ));
  };

  const getEventEnergyColor = (event: ScheduleEvent) => {
    const avgEnergy = event.artists?.reduce((sum, artist) => 
      sum + (artist.energy_mean || 0), 0) / (event.artists?.length || 1);
    
    if (avgEnergy > 0.7) return 'bg-red-100 border-red-300';
    if (avgEnergy > 0.4) return 'bg-yellow-100 border-yellow-300';
    return 'bg-green-100 border-green-300';
  };

  const getConflictSeverity = (event: ScheduleEvent) => {
    const eventConflicts = conflicts[event.id] || [];
    if (eventConflicts.length === 0) return 'none';
    if (eventConflicts.length === 1) return 'minor';
    return 'major';
  };

  return (
    <AppShell
      title="Featured Festival Schedule Optimizer"
      subtitle="Plan your festival experience with smart conflict detection and route optimization. Current featured festival: Amsterdam Dance Event."
      actions={
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-sm">
            {scheduleEvents.filter(e => e.selected).length} Selected
          </Badge>
          <Badge variant="destructive" className="text-sm">
            {scheduleEvents.filter((e) => e.selected && conflicts[e.id] && conflicts[e.id].length > 0).length} Conflicts
          </Badge>
        </div>
      }
    >

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search events, artists, venues..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Select value={selectedDate} onValueChange={setSelectedDate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025-10-22">Oct 22, 2025</SelectItem>
                  <SelectItem value="2025-10-23">Oct 23, 2025</SelectItem>
                  <SelectItem value="2025-10-24">Oct 24, 2025</SelectItem>
                  <SelectItem value="2025-10-25">Oct 25, 2025</SelectItem>
                  <SelectItem value="2025-10-26">Oct 26, 2025</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Genres</label>
              <Select value={selectedGenres[0] || 'all'} onValueChange={(value) => 
                setSelectedGenres(value === 'all' ? [] : [value])
              }>
                <SelectTrigger>
                  <SelectValue placeholder="All genres" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All genres</SelectItem>
                  {availableGenres.map(genre => (
                    <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Travel Buffer</label>
              <Select value={travelBuffer.toString()} onValueChange={(value) => 
                setTravelBuffer(parseInt(value))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">60 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <ConversionCtaStrip
        variant="schedule"
        selectedCount={scheduleEvents.filter(e => e.selected).length || undefined}
      />

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="timeline">Timeline View</TabsTrigger>
          <TabsTrigger value="grid">Grid View</TabsTrigger>
          <TabsTrigger value="conflicts">Conflict Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          {timeSlots.map((slot, index) => (
            <Card key={index} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    {format(slot.start, 'HH:mm')} - {format(slot.end, 'HH:mm')}
                  </CardTitle>
                  <Badge variant="outline">
                    {slot.events.length} events
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {slot.events.map(event => (
                    <div
                      key={event.id}
                      className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                        event.selected 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      } ${getEventEnergyColor(event)}`}
                      onClick={() => toggleEventSelection(event.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Checkbox 
                              checked={event.selected}
                              onChange={() => toggleEventSelection(event.id)}
                            />
                            <h3 className="font-semibold">{event.title}</h3>
                            {event.sold_out && (
                              <Badge variant="destructive" className="text-xs">Sold Out</Badge>
                            )}
                            {conflicts[event.id] && conflicts[event.id].length > 0 && (
                              <Badge variant="outline" className="text-xs text-orange-600">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {conflicts[event.id].length} conflict{conflicts[event.id].length > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {event.venue_name}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {format(parseISO(event.start_date), 'HH:mm')} - {format(parseISO(event.end_date), 'HH:mm')}
                            </div>
                          </div>

                          {event.artists && event.artists.length > 0 && (
                            <div className="flex items-center gap-2 mb-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <div className="flex flex-wrap gap-1">
                                {event.artists.slice(0, 3).map(artist => (
                                  <Badge key={artist.id} variant="secondary" className="text-xs">
                                    {artist.title}
                                  </Badge>
                                ))}
                                {event.artists.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{event.artists.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}

                          {event.artists?.[0]?.sound_descriptor && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Music className="h-4 w-4" />
                              {event.artists[0].sound_descriptor}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3].map(level => (
                              <Star
                                key={level}
                                className={`h-4 w-4 ${
                                  level <= event.priority 
                                    ? 'text-yellow-400 fill-current' 
                                    : 'text-gray-300'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateEventPriority(event.id, level);
                                }}
                              />
                            ))}
                          </div>
                          
                          {event.artists?.[0]?.energy_mean && (
                            <div className="text-xs text-muted-foreground">
                              Energy: {Math.round(event.artists[0].energy_mean * 100)}%
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="grid" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEvents.map(event => (
              <Card 
                key={event.id} 
                className={`cursor-pointer transition-all ${
                  event.selected ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => toggleEventSelection(event.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{event.title}</CardTitle>
                    <Checkbox 
                      checked={event.selected}
                      onChange={() => toggleEventSelection(event.id)}
                    />
                  </div>
                  <CardDescription>
                    {format(parseISO(event.start_date), 'MMM d, HH:mm')} - {format(parseISO(event.end_date), 'HH:mm')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {event.venue_name}
                    </div>
                    
                    {event.artists && event.artists.length > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {event.artists.length} artist{event.artists.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    )}

                    {conflicts[event.id] && conflicts[event.id].length > 0 && (
                      <div className="flex items-center gap-1 text-sm text-orange-600">
                        <AlertTriangle className="h-4 w-4" />
                        {conflicts[event.id].length} conflict{conflicts[event.id].length > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="conflicts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Conflict Analysis
              </CardTitle>
              <CardDescription>
                Review and resolve scheduling conflicts in your selected events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scheduleEvents.filter(e => e.selected && conflicts[e.id] && conflicts[e.id].length > 0).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p className="text-lg font-medium">No conflicts detected!</p>
                  <p>Your selected events don't overlap in time.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {scheduleEvents
                    .filter(e => e.selected && conflicts[e.id] && conflicts[e.id].length > 0)
                    .map(event => (
                      <Card key={event.id} className="border-orange-200">
                        <CardHeader>
                          <CardTitle className="text-lg">{event.title}</CardTitle>
                          <CardDescription>
                            Conflicts with {conflicts[event.id]?.length || 0} other event{(conflicts[event.id]?.length || 0) > 1 ? 's' : ''}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {conflicts[event.id]?.map(conflictTitle => (
                              <div key={conflictTitle} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                                <span className="font-medium">{conflictTitle}</span>
                                <Button size="sm" variant="outline">
                                  Resolve
                                </Button>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
// @ts-nocheck
