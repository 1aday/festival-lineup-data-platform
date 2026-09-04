"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { dbService } from "@/lib/db-service";
import { DBEvent } from "@/lib/types";
import { isSupabaseConfigured } from "@/lib/supabase";
import { format } from "date-fns";
import { 
  Search, 
  ExternalLink, 
  Calendar, 
  MapPin, 
  RefreshCw, 
  Clock,
  Music,
  Tag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export function EventsList({ refreshTrigger = 0 }: { refreshTrigger?: number }) {
  const [events, setEvents] = useState<DBEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredEvents, setFilteredEvents] = useState<DBEvent[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      if (!isSupabaseConfigured()) {
        console.log('Supabase not configured, skipping events fetch');
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching events from database...');
        const data = await dbService.getEvents(200); // Get first 200 events
        console.log(`Fetched ${data.length} events`);
        setEvents(data);
        setFilteredEvents(data);
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [refreshTrigger]); // Re-fetch when refreshTrigger changes

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      console.log('Manually refreshing events...');
      const data = await dbService.getEvents(200);
      console.log(`Refreshed: ${data.length} events`);
      setEvents(data);
      setFilteredEvents(data);
    } catch (error) {
      console.error('Error refreshing events:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const filtered = events.filter(event =>
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.venue_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.categories?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredEvents(filtered);
  }, [searchQuery, events]);

  const formatEventTime = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')) {
      // Same day event
      return `${format(start, 'MMM dd')} • ${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
    } else {
      // Multi-day event
      return `${format(start, 'MMM dd HH:mm')} - ${format(end, 'MMM dd HH:mm')}`;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Music className="w-5 h-5" />
            Events Schedule
            {events.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {events.length}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
              size="sm"
              variant="outline"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!isSupabaseConfigured() ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Configure Supabase to view events
            </p>
          </div>
        ) : loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {searchQuery ? 'No events found matching your search' : 'No events in database yet'}
            </p>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Categories</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.slice(0, 50).map((event, index) => (
                  <motion.tr
                    key={event.ade_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="group hover:bg-muted/50 transition-colors"
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{event.title}</p>
                        {event.subtitle && (
                          <p className="text-xs text-muted-foreground">
                            {event.subtitle}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {event.venue_name ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm">{event.venue_name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        {formatEventTime(event.start_date, event.end_date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {event.categories ? (
                        <div className="flex flex-wrap gap-1">
                          {event.categories.split('/').slice(0, 2).map((cat, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {cat.trim()}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {event.sold_out ? (
                        <Badge variant="destructive" className="text-xs">
                          Sold Out
                        </Badge>
                      ) : (
                        <Badge variant="default" className="text-xs">
                          Available
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {event.url && (
                        <a
                          href={event.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          View
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {filteredEvents.length > 50 && (
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Showing 50 of {filteredEvents.length} events
          </div>
        )}
      </CardContent>
    </Card>
  );
}
