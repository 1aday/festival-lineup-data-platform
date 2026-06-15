'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, MapPin, Clock, Music, ExternalLink, Play, Heart, UserPlus, TrendingUp, Headphones, Users } from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, isYesterday } from 'date-fns';

interface EventArtist {
  id: number;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  matchReason: string;
}

interface GroupedEvent {
  id: number;
  ade_id: number;
  title: string;
  subtitle: string | null;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  venue_name: string | null;
  venue_address: string | null;
  city: string | null;
  country: string | null;
  artists: EventArtist[];
  allMatchReasons: string[];
}

export default function SpotifyEventsPage() {
  const [events, setEvents] = useState<GroupedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'venue' | 'artists'>('date');
  const [filterBy, setFilterBy] = useState<string>('all');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/spotify/matches');
      
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const data = await response.json();
      
      if (data.matches) {
        // Group events by event ID and collect all artists
        const eventMap = new Map<number, GroupedEvent>();
        
        data.matches.forEach((match: any) => {
          if (match.events && match.events.length > 0) {
            match.events.forEach((event: any) => {
              const eventId = event.id;
              
              if (!eventMap.has(eventId)) {
                // Create new event entry
                eventMap.set(eventId, {
                  id: event.id,
                  ade_id: event.ade_id,
                  title: event.title,
                  subtitle: event.subtitle,
                  start_date: event.start_date,
                  end_date: event.end_date,
                  start_time: event.start_time,
                  end_time: event.end_time,
                  venue_name: event.venue_name,
                  venue_address: event.venue_address,
                  city: event.city,
                  country: event.country,
                  artists: [],
                  allMatchReasons: []
                });
              }
              
              // Add artist to this event
              const groupedEvent = eventMap.get(eventId)!;
              groupedEvent.artists.push({
                id: match.id,
                title: match.title,
                subtitle: match.subtitle,
                image_url: match.image_url,
                matchReason: match.matchReason
              });
              
              // Track all match reasons for this event
              if (!groupedEvent.allMatchReasons.includes(match.matchReason)) {
                groupedEvent.allMatchReasons.push(match.matchReason);
              }
            });
          }
        });

        // Convert to array and sort
        const allEvents = Array.from(eventMap.values());
        allEvents.sort((a, b) => {
          const dateA = new Date(`${a.start_date} ${a.start_time || '00:00'}`);
          const dateB = new Date(`${b.start_date} ${b.start_time || '00:00'}`);
          return dateA.getTime() - dateB.getTime();
        });

        setEvents(allEvents);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getMatchReasonInfo = (reason: string) => {
    switch (reason) {
      case 'liked':
        return { icon: Heart, color: 'text-red-600 bg-red-50', label: 'Liked' };
      case 'followed':
        return { icon: UserPlus, color: 'text-blue-600 bg-blue-50', label: 'Followed' };
      case 'top_artist':
        return { icon: TrendingUp, color: 'text-purple-600 bg-purple-50', label: 'Top' };
      case 'recently_played':
        return { icon: Headphones, color: 'text-orange-600 bg-orange-50', label: 'Recent' };
      default:
        return { icon: Music, color: 'text-gray-600 bg-gray-50', label: 'Match' };
    }
  };

  const formatTime = (time: string | null): string => {
    if (!time) return '';
    return time.substring(0, 5);
  };

  const formatDate = (date: string): string => {
    const parsed = parseISO(date);
    if (isToday(parsed)) return 'Today';
    if (isTomorrow(parsed)) return 'Tomorrow';
    if (isYesterday(parsed)) return 'Yesterday';
    return format(parsed, 'EEE, MMM d');
  };

  const sortedEvents = [...events].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        const dateA = new Date(`${a.start_date} ${a.start_time || '00:00'}`);
        const dateB = new Date(`${b.start_date} ${b.start_time || '00:00'}`);
        return dateA.getTime() - dateB.getTime();
      case 'venue':
        return (a.venue_name || '').localeCompare(b.venue_name || '');
      case 'artists':
        return a.artists[0]?.title.localeCompare(b.artists[0]?.title || '');
      default:
        return 0;
    }
  });

  const filteredEvents = filterBy === 'all' 
    ? sortedEvents 
    : sortedEvents.filter(event => event.allMatchReasons.includes(filterBy));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading events...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <Card className="mt-8">
            <CardContent className="p-8 text-center">
              <div className="text-red-500 mb-4">
                <Music className="h-12 w-12 mx-auto" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Error Loading Events</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={fetchEvents} variant="outline">
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <Card className="mt-8">
            <CardContent className="p-8 text-center">
              <div className="text-gray-400 mb-4">
                <Calendar className="h-12 w-12 mx-auto" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No Events Found</h2>
              <p className="text-gray-600 mb-4">
                We couldn't find any featured festival events for your Spotify artists.
              </p>
              <Button asChild>
                <a href="/spotify-login">Connect Spotify</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Your Festival Events
          </h1>
          <p className="text-gray-600">
            {events.length} events with {events.reduce((sum, event) => sum + event.artists.length, 0)} artist matches
          </p>
        </div>

        {/* Controls */}
        <div className="mb-6 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Sort by:</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="date">Date & Time</option>
              <option value="venue">Venue</option>
              <option value="artists">Artist</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Filter by:</label>
            <select 
              value={filterBy} 
              onChange={(e) => setFilterBy(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Matches</option>
              <option value="liked">Liked Songs</option>
              <option value="followed">Followed Artists</option>
              <option value="top_artist">Top Artists</option>
              <option value="recently_played">Recently Played</option>
            </select>
          </div>
        </div>

        {/* Events Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead className="w-[100px]">Time</TableHead>
                  <TableHead className="w-[250px]">Event</TableHead>
                  <TableHead className="w-[300px]">Artists</TableHead>
                  <TableHead className="w-[200px]">Venue</TableHead>
                  <TableHead className="w-[100px]">Matches</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => (
                  <TableRow key={`event-${event.id}`} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      {formatDate(event.start_date)}
                    </TableCell>
                    <TableCell>
                      {event.start_time ? formatTime(event.start_time) : '-'}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">{event.title}</div>
                        {event.subtitle && (
                          <div className="text-xs text-gray-500">{event.subtitle}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        {event.artists.map((artist, index) => {
                          const matchInfo = getMatchReasonInfo(artist.matchReason);
                          const MatchIcon = matchInfo.icon;
                          
                          return (
                            <div key={`${event.id}-artist-${artist.id}-${index}`} className="flex items-center gap-2">
                              {artist.image_url ? (
                                <img 
                                  src={artist.image_url} 
                                  alt={artist.title}
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                                  <Music className="h-3 w-3 text-gray-500" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">{artist.title}</div>
                                {artist.subtitle && (
                                  <div className="text-xs text-gray-500 truncate">{artist.subtitle}</div>
                                )}
                              </div>
                              <Badge variant="outline" className={`${matchInfo.color} text-xs px-1 py-0`}>
                                <MatchIcon className="h-2 w-2 mr-1" />
                                {matchInfo.label}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">{event.venue_name || '-'}</div>
                        {event.venue_address && (
                          <div className="text-xs text-gray-500">{event.venue_address}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {event.allMatchReasons.map((reason, index) => {
                          const matchInfo = getMatchReasonInfo(reason);
                          const MatchIcon = matchInfo.icon;
                          
                          return (
                            <Badge 
                              key={`${event.id}-reason-${reason}-${index}`}
                              variant="outline" 
                              className={`${matchInfo.color} text-xs px-1 py-0`}
                            >
                              <MatchIcon className="h-2 w-2 mr-1" />
                              {matchInfo.label}
                            </Badge>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`https://www.amsterdam-dance-event.nl/event/${event.ade_id}`, '_blank')}
                          className="h-8 px-2"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredEvents.length} of {events.length} events
        </div>
      </div>
    </div>
  );
}
