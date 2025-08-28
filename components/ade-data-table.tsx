'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
  ExpandedState,
  getExpandedRowModel,
} from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChevronDown,
  ChevronRight,
  Music,
  Calendar,
  MapPin,
  Users,
  Search,
  Filter,
  Globe,
  Clock,
  Columns,
  Sparkles,
  TrendingUp,
  Eye,
  Link2,
  Mic,
  Ticket,
  Star,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  Palette,
  Zap,
  Activity,
  Gauge,
  BarChart2
} from 'lucide-react';
import { format } from 'date-fns';

interface ArtistWithEvents {
  id: number;
  ade_id: number;
  title: string;
  subtitle?: string;
  country_label?: string;
  country_value?: string;
  url?: string;
  image_url?: string;
  events?: EventData[];
}

interface EventData {
  id: number;
  ade_id: number;
  title: string;
  subtitle?: string;
  start_date: string;
  end_date: string;
  venue_name?: string;
  categories?: string;
  confidence?: number;
}

interface EventWithArtists {
  id: number;
  ade_id: number;
  title: string;
  subtitle?: string;
  start_date: string;
  end_date: string;
  venue_name?: string;
  categories?: string;
  sold_out?: boolean;
  artists?: ArtistData[];
}

interface ArtistData {
  id: number;
  ade_id: number;
  title: string;
  country_label?: string;
  confidence?: number;
}

interface AdeDataTableProps {
  artists: ArtistWithEvents[];
  events: EventWithArtists[];
  artistEvents: any[];
}

export function AdeDataTable({ artists, events, artistEvents }: AdeDataTableProps) {
  const [viewMode, setViewMode] = useState<'artists' | 'events' | 'schedule' | 'studio'>('artists');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [globalFilter, setGlobalFilter] = useState('');

  // Process data to add events to artists
  const artistsWithEvents = useMemo(() => {
    return artists.map(artist => {
      const artistEventLinks = artistEvents.filter(ae => ae.artist_id === artist.id);
      const artistEventsData = artistEventLinks.map(link => {
        const event = events.find(e => e.id === link.event_id);
        return event ? { ...event, confidence: link.confidence } : null;
      }).filter(Boolean) as EventData[];
      
      return {
        ...artist,
        events: artistEventsData,
        eventCount: artistEventsData.length
      };
    });
  }, [artists, events, artistEvents]);

  // Process data to add artists to events  
  const eventsWithArtists = useMemo(() => {
    return events.map(event => {
      const eventArtistLinks = artistEvents.filter(ae => ae.event_id === event.id);
      const eventArtistsData = eventArtistLinks.map(link => {
        const artist = artists.find(a => a.id === link.artist_id);
        return artist ? { ...artist, confidence: link.confidence } : null;
      }).filter(Boolean) as ArtistData[];
      
      return {
        ...event,
        artists: eventArtistsData,
        artistCount: eventArtistsData.length,
        artistNames: eventArtistsData.map(a => a.title).join(', ')
      };
    });
  }, [artists, events, artistEvents]);

  // Process data to group events by day for schedule view
  const eventsByDay = useMemo(() => {
    const dayGroups: { [key: string]: EventWithArtists[] } = {};

    eventsWithArtists.forEach(event => {
      const dateKey = format(new Date(event.start_date), 'yyyy-MM-dd');
      if (!dayGroups[dateKey]) {
        dayGroups[dateKey] = [];
      }
      dayGroups[dateKey].push(event);
    });

    // Sort events within each day by start time
    Object.keys(dayGroups).forEach(day => {
      dayGroups[day].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    });

    // Convert to array and sort by date
    return Object.entries(dayGroups)
      .map(([date, dayEvents]) => ({
        date,
        dateObj: new Date(date),
        events: dayEvents,
        eventCount: dayEvents.length,
        artistCount: dayEvents.reduce((total, event) => total + (event.artistCount || 0), 0),
        venues: [...new Set(dayEvents.map(e => e.venue_name).filter(Boolean))]
      }))
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  }, [eventsWithArtists]);

  const artistColumns: ColumnDef<any>[] = [
    {
      id: 'expander',
      header: () => null,
      cell: ({ row }) => {
        return row.getCanExpand() && row.original.eventCount > 0 ? (
          <button
            {...{
              onClick: row.getToggleExpandedHandler(),
              style: { cursor: 'pointer' },
            }}
            className="hover:bg-secondary rounded p-1 transition-colors"
          >
            {row.getIsExpanded() ? (
              <ChevronDown className="h-4 w-4 text-purple-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-purple-500" />
            )}
          </button>
        ) : null;
      },
    },
    {
      accessorKey: 'title',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-transparent px-0"
          >
            <Mic className="h-4 w-4 mr-2 text-purple-500" />
            Artist Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="flex items-center gap-3 group/artist">
          <div className="relative">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-sm group-hover/artist:scale-105 transition-transform duration-200">
              <Music className="h-5 w-5 text-white" />
            </div>
            {row.original.eventCount > 5 && (
              <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-yellow-500 flex items-center justify-center">
                <Star className="h-2.5 w-2.5 text-white" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-sm text-foreground truncate group-hover/artist:text-primary transition-colors">
              {row.getValue('title')}
            </div>
            {row.original.subtitle && (
              <div className="text-xs text-muted-foreground truncate mt-0.5">{row.original.subtitle}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'country_label',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-transparent px-0"
          >
            <Globe className="h-4 w-4 mr-2 text-blue-500" />
            Country
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const country = row.getValue('country_label') as string;
        return country ? (
          <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 transition-colors text-xs px-2.5 py-1">
            <Globe className="h-3 w-3 mr-1.5" />
            {country}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm italic">Unknown</span>
        );
      },
    },
    {
      accessorKey: 'eventCount',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-transparent px-0"
          >
            <Calendar className="h-4 w-4 mr-2 text-green-500" />
            Events
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const count = row.getValue('eventCount') as number;
        if (count === 0) {
          return <span className="text-muted-foreground text-sm italic">No events</span>;
        }

        const getVariant = () => {
          if (count >= 10) return 'default';
          if (count >= 5) return 'secondary';
          return 'outline';
        };

        const getIntensity = () => {
          if (count >= 10) return 'from-green-500 to-emerald-500';
          if (count >= 5) return 'from-orange-500 to-amber-500';
          return 'from-blue-500 to-cyan-500';
        };

        return (
          <div className="flex items-center gap-2">
            <Badge
              variant={getVariant()}
              className={`min-w-[85px] justify-center text-xs px-3 py-1.5 transition-all duration-200 hover:scale-105 ${
                count >= 10 ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-sm' :
                count >= 5 ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm' :
                'border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20'
              }`}
            >
              <Sparkles className="h-3 w-3 mr-1.5" />
              {count} {count === 1 ? 'Event' : 'Events'}
            </Badge>
            {count >= 10 && <Star className="h-4 w-4 text-yellow-500 animate-pulse" />}
            {count >= 5 && count < 10 && <Star className="h-3.5 w-3.5 text-yellow-500" />}
          </div>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        if (row.original.url) {
          return (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => window.open(row.original.url, '_blank')}
              className="hover:bg-purple-500/10"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          );
        }
        return null;
      },
    },
  ];

  const eventColumns: ColumnDef<any>[] = [
    {
      id: 'expander',
      header: () => null,
      cell: ({ row }) => {
        return row.getCanExpand() && row.original.artistCount > 0 ? (
          <button
            {...{
              onClick: row.getToggleExpandedHandler(),
              style: { cursor: 'pointer' },
            }}
            className="hover:bg-secondary rounded p-1 transition-colors"
          >
            {row.getIsExpanded() ? (
              <ChevronDown className="h-4 w-4 text-blue-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-blue-500" />
            )}
          </button>
        ) : null;
      },
    },
    {
      accessorKey: 'title',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-transparent px-0"
          >
            <Ticket className="h-4 w-4 mr-2 text-blue-500" />
            Event Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="flex items-center gap-3 group/event">
          <div className="relative">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-sm group-hover/event:scale-105 transition-transform duration-200">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            {row.original.sold_out && (
              <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">!</span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-sm text-foreground truncate group-hover/event:text-primary transition-colors">
              {row.getValue('title')}
            </div>
            {row.original.subtitle && (
              <div className="text-xs text-muted-foreground truncate mt-0.5">{row.original.subtitle}</div>
            )}
          </div>
          {row.original.sold_out && (
            <Badge variant="destructive" className="ml-2 text-xs px-2 py-1">
              Sold Out
            </Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'venue_name',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-transparent px-0"
          >
            <MapPin className="h-4 w-4 mr-2 text-orange-500" />
            Venue
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const venue = row.getValue('venue_name') as string;
        return venue ? (
          <Badge variant="outline" className="border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 transition-colors text-xs px-2.5 py-1 max-w-[180px]">
            <MapPin className="h-3 w-3 mr-1.5" />
            <span className="truncate">{venue}</span>
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm italic">TBA</span>
        );
      },
    },
    {
      accessorKey: 'start_date',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-transparent px-0"
          >
            <Clock className="h-4 w-4 mr-2 text-green-500" />
            Date & Time
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const startDate = row.getValue('start_date') as string;
        const endDate = row.original.end_date;

        const isToday = new Date(startDate).toDateString() === new Date().toDateString();
        const isTomorrow = new Date(startDate).toDateString() === new Date(Date.now() + 86400000).toDateString();

        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge
                variant={isToday ? "default" : "secondary"}
                className={`text-xs px-2.5 py-1 ${isToday ? 'bg-green-500 hover:bg-green-600 animate-pulse' : ''}`}
              >
                {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : format(new Date(startDate), 'MMM dd')}
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
        if (!categories) return <span className="text-muted-foreground text-sm italic">-</span>;

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
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-transparent px-0"
          >
            <Users className="h-4 w-4 mr-2 text-purple-500" />
            Lineup
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const artists = row.original.artists as ArtistData[];
        const artistCount = row.original.artistCount as number;

        if (!artists || artists.length === 0) {
          return <span className="text-muted-foreground text-sm italic">No lineup yet</span>;
        }

        const displayArtists = artists.slice(0, 3);
        const remainingCount = artists.length - 3;

        return (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {displayArtists.map((artist, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="text-xs px-2 py-0.5 bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20 transition-colors cursor-default group/artist-badge"
                >
                  <Music className="h-3 w-3 mr-1.5 group-hover/artist-badge:scale-110 transition-transform" />
                  <span className="truncate max-w-[120px]">{artist.title}</span>
                  {artist.confidence && (
                    <span className="ml-1 text-xs opacity-70">
                      ({Math.round(artist.confidence * 100)}%)
                    </span>
                  )}
                </Badge>
              ))}
              {remainingCount > 0 && (
                <Badge variant="outline" className="text-xs px-2 py-0.5 border-dashed hover:bg-muted/50 transition-colors cursor-default">
                  +{remainingCount} more
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs px-2.5 py-1 bg-gradient-to-r from-blue-500 to-cyan-500 shadow-sm">
                <TrendingUp className="h-3 w-3 mr-1.5" />
                {artistCount} artist{(artistCount !== 1) ? 's' : ''}
              </Badge>
            </div>
          </div>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        if (row.original.url) {
          return (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => window.open(row.original.url, '_blank')}
              className="hover:bg-blue-500/10"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          );
        }
        return null;
      },
    },
  ];

  const scheduleColumns: ColumnDef<any>[] = [
    {
      id: 'expander',
      header: () => null,
      cell: ({ row }) => {
        return row.getCanExpand() && row.original.eventCount > 0 ? (
          <button
            {...{
              onClick: row.getToggleExpandedHandler(),
              style: { cursor: 'pointer' },
            }}
            className="hover:bg-secondary rounded p-1 transition-colors"
          >
            {row.getIsExpanded() ? (
              <ChevronDown className="h-4 w-4 text-purple-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-purple-500" />
            )}
          </button>
        ) : null;
      },
    },
    {
      accessorKey: 'date',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-transparent px-0"
          >
            <Calendar className="h-4 w-4 mr-2 text-purple-500" />
            Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const date = row.getValue('date') as string;
        const dateObj = row.original.dateObj;
        const isToday = new Date().toDateString() === dateObj.toDateString();
        const isTomorrow = new Date(Date.now() + 86400000).toDateString() === dateObj.toDateString();

        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge
                variant={isToday ? "default" : "secondary"}
                className={`text-sm px-3 py-1.5 ${isToday ? 'bg-green-500 hover:bg-green-600 animate-pulse' : ''}`}
              >
                {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : format(dateObj, 'MMM dd, yyyy')}
              </Badge>
              {isToday && <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
            </div>
            <div className="text-sm text-muted-foreground">
              {format(dateObj, 'EEEE')}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'eventCount',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-transparent px-0"
          >
            <Ticket className="h-4 w-4 mr-2 text-blue-500" />
            Events
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const count = row.getValue('eventCount') as number;
        return (
          <div className="flex items-center gap-2">
            <Badge
              variant="default"
              className="text-sm px-3 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 shadow-sm"
            >
              <Ticket className="h-3 w-3 mr-1.5" />
              {count} event{(count !== 1) ? 's' : ''}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: 'artistCount',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-transparent px-0"
          >
            <Users className="h-4 w-4 mr-2 text-purple-500" />
            Artists
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const count = row.getValue('artistCount') as number;
        return (
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="text-sm px-3 py-1.5 bg-purple-500/10 border-purple-500/30"
            >
              <Users className="h-3 w-3 mr-1.5" />
              {count} artist{(count !== 1) ? 's' : ''}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: 'venues',
      header: 'Venues',
      cell: ({ row }) => {
        const venues = row.getValue('venues') as string[];
        if (!venues || venues.length === 0) {
          return <span className="text-muted-foreground text-sm italic">No venues</span>;
        }

        return (
          <div className="flex flex-wrap gap-1.5">
            {venues.slice(0, 3).map((venue, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className="text-xs px-2 py-0.5 border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 transition-colors"
              >
                <MapPin className="h-3 w-3 mr-1" />
                <span className="truncate max-w-[100px]">{venue}</span>
              </Badge>
            ))}
            {venues.length > 3 && (
              <Badge variant="outline" className="text-xs px-2 py-0.5 border-dashed">
                +{venues.length - 3} more
              </Badge>
            )}
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: viewMode === 'artists' ? artistsWithEvents :
          viewMode === 'events' ? eventsWithArtists :
          eventsByDay,
    columns: viewMode === 'artists' ? artistColumns :
             viewMode === 'events' ? eventColumns :
             scheduleColumns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      expanded,
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
  });

  // Set initial page size
  useEffect(() => {
    table.setPageSize(50);
  }, [table]);

  return (
    <div className="space-y-6">
      {/* Enhanced Header Section */}
      <div className="bg-gradient-to-r from-background via-background to-background/95 border-b">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg">
                  {viewMode === 'artists' ? <Music className="h-7 w-7 text-white" /> :
                   viewMode === 'events' ? <Calendar className="h-7 w-7 text-white" /> :
                   viewMode === 'schedule' ? <Clock className="h-7 w-7 text-white" /> :
                   <Palette className="h-7 w-7 text-white" />}
                </div>
                <div>
                  <div                   className="text-foreground">
                    {viewMode === 'artists' ? 'Artists Database' :
                     viewMode === 'events' ? 'Events Database' :
                     viewMode === 'schedule' ? 'Festival Schedule' :
                     'Artist Studio'}
                  </div>
                  <div className="text-sm font-medium text-muted-foreground mt-1">
                    {viewMode === 'artists' ? 'Discover Amsterdam Dance Event Artists' :
                     viewMode === 'events' ? 'Explore ADE 2025 Events' :
                     viewMode === 'schedule' ? 'Day-by-day Festival Schedule' :
                     'Beautiful Artist Cards with Events & Spotify Data'}
                  </div>
                </div>
              </h1>
              <p className="text-muted-foreground text-sm max-w-md">
                Explore {artists.length.toLocaleString()} artists and {events.length.toLocaleString()} events
                {viewMode === 'schedule' && ` across ${eventsByDay.length} days`}
                {globalFilter && ` • ${table.getFilteredRowModel().rows.length} results found`}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto min-w-0">
              <div className="relative flex-1 lg:w-80">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 transition-colors" />
                <Input
                  placeholder={`Search ${viewMode === 'artists' ? 'artists, countries...' :
                                viewMode === 'events' ? 'events, venues, artists...' :
                                viewMode === 'schedule' ? 'dates, venues...' :
                                'artists, events, countries...'}`}
                  value={globalFilter ?? ''}
                  onChange={(event) => setGlobalFilter(event.target.value)}
                  className="pl-12 pr-4 py-3 bg-background/80 backdrop-blur-sm border-border/40 hover:border-border focus:border-border rounded-xl shadow-sm transition-all duration-200 focus:ring-2 focus:ring-ring/20 focus:shadow-lg"
                />
                {globalFilter && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setGlobalFilter('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
                  >
                    ×
                  </Button>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-border/40 hover:border-border hover:bg-accent/50 rounded-xl shadow-sm transition-all duration-200 min-w-[120px]"
                  >
                    <Columns className="h-4 w-4 mr-2" />
                    Columns
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-lg border-border/40">
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Visible Columns
                  </div>
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => {
                      return (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          className="capitalize rounded-lg py-2 px-3 my-0.5"
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) =>
                            column.toggleVisibility(!!value)
                          }
                        >
                          {column.id.replace(/([A-Z])/g, ' $1').toLowerCase()}
                        </DropdownMenuCheckboxItem>
                      );
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
      
      {/* Enhanced Table Section */}
      <div className="max-w-7xl mx-auto px-6">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-full">
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
              <TabsTrigger
                value="schedule"
                className="flex items-center gap-2 px-6 py-3 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
              >
                <Clock className="h-4 w-4" />
                <span className="font-medium">Schedule</span>
                <Badge variant="secondary" className="ml-1 bg-muted-foreground/10 text-muted-foreground">
                  {eventsByDay.length.toLocaleString()} days
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="studio"
                className="flex items-center gap-2 px-6 py-3 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
              >
                <Palette className="h-4 w-4" />
                <span className="font-medium">Artist Studio</span>
                <Badge variant="secondary" className="ml-1 bg-muted-foreground/10 text-muted-foreground">
                  Cards
                </Badge>
              </TabsTrigger>
            </TabsList>

            {/* Results summary */}
            {globalFilter && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span>
                  {table.getFilteredRowModel().rows.length.toLocaleString()} of {table.getFilteredRowModel().rows.length.toLocaleString()} results
                </span>
              </div>
            )}
          </div>
          
          <TabsContent value={viewMode} className="mt-0">
            <div className="bg-background/50 backdrop-blur-sm rounded-2xl border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id} className="border-b bg-muted/30 hover:bg-muted/40">
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id} className="px-6 py-4 text-left font-semibold text-foreground/90">
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
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <React.Fragment key={row.id}>
                          <TableRow
                            data-state={row.getIsSelected() && 'selected'}
                            className="group hover:bg-muted/30 transition-all duration-200 border-b border-border/40 hover:shadow-sm"
                          >
                            {row.getVisibleCells().map((cell) => (
                              <TableCell key={cell.id} className="px-6 py-4">
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                          {row.getIsExpanded() && (
                            <TableRow className="bg-muted/10">
                              <TableCell colSpan={row.getVisibleCells().length} className="px-6 py-6">
                                <div className="bg-gradient-to-r from-background/80 to-background/60 backdrop-blur-sm rounded-xl p-6 border shadow-sm">
                                  {viewMode === 'artists' && row.original.events && (
                                    <div className="space-y-4">
                                      <div className="flex items-center gap-3 mb-4">
                                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                                          <Calendar className="h-4 w-4 text-purple-500" />
                                        </div>
                                        <h4 className="text-lg font-semibold text-foreground">
                                          Events featuring {row.original.title}
                                        </h4>
                                        <Badge variant="secondary" className="ml-auto">
                                          {row.original.events.length} event{(row.original.events.length !== 1) ? 's' : ''}
                                        </Badge>
                                      </div>
                                      <div className="grid gap-3">
                                        {row.original.events.map((event: EventData) => (
                                          <div key={event.id} className="group/event flex items-center justify-between p-4 bg-background/60 rounded-lg hover:bg-background/80 transition-all duration-200 hover:shadow-sm border border-border/20">
                                            <div className="flex items-center gap-4">
                                              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                                                <Ticket className="h-5 w-5 text-blue-500" />
                                              </div>
                                              <div className="space-y-1">
                                                <div className="font-medium text-foreground group-hover/event:text-primary transition-colors">
                                                  {event.title}
                                                </div>
                                                <div className="text-sm text-muted-foreground flex items-center gap-3">
                                                  <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {format(new Date(event.start_date), 'MMM dd, HH:mm')}
                                                  </span>
                                                  {event.venue_name && (
                                                    <>
                                                      <span>•</span>
                                                      <span className="flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" />
                                                        {event.venue_name}
                                                      </span>
                                                    </>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                            {event.confidence && (
                                              <Badge
                                                variant={event.confidence > 0.8 ? 'default' : 'secondary'}
                                                className="min-w-[80px] justify-center"
                                              >
                                                {Math.round(event.confidence * 100)}% match
                                              </Badge>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {viewMode === 'events' && row.original.artists && (
                                    <div className="space-y-4">
                                      <div className="flex items-center gap-3 mb-4">
                                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                                          <Users className="h-4 w-4 text-purple-500" />
                                        </div>
                                        <h4 className="text-lg font-semibold text-foreground">
                                          Full Lineup for {row.original.title}
                                        </h4>
                                        <Badge variant="secondary" className="ml-auto">
                                          {row.original.artists.length} artist{(row.original.artists.length !== 1) ? 's' : ''}
                                        </Badge>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {row.original.artists.map((artist: ArtistData) => (
                                          <div key={artist.id} className="group/artist flex items-center justify-between p-4 bg-background/60 rounded-lg hover:bg-background/80 transition-all duration-200 hover:shadow-sm border border-border/20">
                                            <div className="flex items-center gap-3">
                                              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-sm">
                                                <Music className="h-5 w-5 text-white" />
                                              </div>
                                              <div className="space-y-1">
                                                <div className="font-medium text-foreground group-hover/artist:text-primary transition-colors">
                                                  {artist.title}
                                                </div>
                                                {artist.country_label && (
                                                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                                                    <Globe className="h-3 w-3" />
                                                    {artist.country_label}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                            {artist.confidence && (
                                              <Badge
                                                variant={artist.confidence > 0.8 ? 'default' : 'secondary'}
                                                className="min-w-[70px] justify-center"
                                              >
                                                {Math.round(artist.confidence * 100)}%
                                              </Badge>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                                                  )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                        {row.getIsExpanded() && viewMode === 'schedule' && (
                          <TableRow className="bg-muted/10">
                            <TableCell colSpan={row.getVisibleCells().length} className="px-6 py-6">
                              <div className="bg-gradient-to-r from-background/80 to-background/60 backdrop-blur-sm rounded-xl p-6 border shadow-sm">
                                <div className="space-y-6">
                                  <div className="flex items-center gap-3 mb-4">
                                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                                      <Clock className="h-4 w-4 text-purple-500" />
                                    </div>
                                    <h4 className="text-lg font-semibold text-foreground">
                                      {format(row.original.dateObj, 'EEEE, MMMM dd, yyyy')} Schedule
                                    </h4>
                                    <Badge variant="secondary" className="ml-auto">
                                      {row.original.eventCount} event{(row.original.eventCount !== 1) ? 's' : ''}
                                    </Badge>
                                  </div>

                                  <div className="grid gap-4">
                                    {row.original.events.map((event: EventWithArtists, eventIdx: number) => (
                                      <div key={event.id} className="group/event bg-background/60 rounded-lg border border-border/20 hover:bg-background/80 transition-all duration-200 hover:shadow-sm">
                                        <div className="p-4">
                                          <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                                                <Ticket className="h-5 w-5 text-blue-500" />
                                              </div>
                                              <div>
                                                <div className="font-semibold text-foreground group-hover/event:text-primary transition-colors">
                                                  {event.title}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                  {event.subtitle}
                                                </div>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              {event.sold_out && (
                                                <Badge variant="destructive" className="text-xs">
                                                  Sold Out
                                                </Badge>
                                              )}
                                              <div className="text-right">
                                                <div className="flex items-center gap-2 text-sm font-medium">
                                                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                                  {format(new Date(event.start_date), 'HH:mm')} - {format(new Date(event.end_date), 'HH:mm')}
                                                </div>
                                                {event.venue_name && (
                                                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                                    <MapPin className="h-3 w-3" />
                                                    {event.venue_name}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </div>

                                          {/* Event Details */}
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-13">
                                            {/* Categories */}
                                            {event.categories && (
                                              <div>
                                                <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                                                  Categories
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                  {event.categories.split('/').filter(Boolean).slice(0, 4).map((cat, idx) => (
                                                    <Badge
                                                      key={idx}
                                                      variant="outline"
                                                      className="text-xs px-2 py-0.5 border-purple-500/30 bg-purple-500/10"
                                                    >
                                                      {cat.trim()}
                                                    </Badge>
                                                  ))}
                                                </div>
                                              </div>
                                            )}

                                            {/* Lineup */}
                                            <div>
                                              <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                                                Lineup ({event.artistCount || 0} artists)
                                              </div>
                                              {event.artists && event.artists.length > 0 ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                  {event.artists.slice(0, 8).map((artist: ArtistData) => (
                                                    <div key={artist.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-md hover:bg-muted/50 transition-colors">
                                                      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                                                        <Music className="h-3 w-3 text-white" />
                                                      </div>
                                                      <div className="min-w-0">
                                                        <div className="font-medium text-sm truncate">{artist.title}</div>
                                                        <div className="text-xs text-muted-foreground">{artist.country_label}</div>
                                                      </div>
                                                      {artist.confidence && (
                                                        <Badge variant="outline" className="text-xs ml-auto">
                                                          {Math.round(artist.confidence * 100)}%
                                                        </Badge>
                                                      )}
                                                    </div>
                                                  ))}
                                                  {event.artists.length > 8 && (
                                                    <div className="text-xs text-muted-foreground text-center py-2">
                                                      +{event.artists.length - 8} more artists
                                                    </div>
                                                  )}
                                                </div>
                                              ) : (
                                                <div className="text-sm text-muted-foreground italic">Lineup not available</div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))
                  ) : (
                      <TableRow>
                        <TableCell
                          colSpan={viewMode === 'artists' ? artistColumns.length :
                                   viewMode === 'events' ? eventColumns.length :
                                   viewMode === 'schedule' ? scheduleColumns.length :
                                   artistColumns.length}
                          className="h-32 text-center"
                        >
                          <div className="flex flex-col items-center justify-center space-y-3">
                            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center">
                              <Search className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div className="space-y-1">
                              <h3 className="text-lg font-medium text-foreground">
                                {globalFilter ? 'No results found' : 'No data available'}
                              </h3>
                              <p className="text-sm text-muted-foreground max-w-md">
                                {globalFilter
                                  ? 'Try adjusting your search terms or clearing the filter to see all results.'
                                  : 'Data will appear here once it\'s loaded from the ADE database.'
                                }
                              </p>
                            </div>
                            {globalFilter && (
                              <Button
                                variant="outline"
                                onClick={() => setGlobalFilter('')}
                                className="mt-2"
                              >
                                Clear search
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            
              {/* Enhanced Pagination */}
              <div className="flex items-center justify-between px-6 py-5 border-t bg-gradient-to-r from-background/50 to-background/30">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">Rows per page</span>
                    <select
                      value={table.getState().pagination.pageSize}
                      onChange={(e) => table.setPageSize(Number(e.target.value))}
                      className="text-sm bg-background border border-border/40 rounded-lg px-3 py-1.5 hover:border-border focus:border-border focus:outline-none focus:ring-2 focus:ring-ring/20 transition-colors"
                    >
                      {[25, 50, 100, 200].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>
                      Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
                      {Math.min(
                        (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                        table.getFilteredRowModel().rows.length
                      )}{' '}
                      of {table.getFilteredRowModel().rows.length.toLocaleString()} entries
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Page</span>
                    <span className="font-medium text-foreground">
                      {table.getState().pagination.pageIndex + 1}
                    </span>
                    <span>of</span>
                    <span className="font-medium text-foreground">
                      {table.getPageCount()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => table.setPageIndex(0)}
                      disabled={!table.getCanPreviousPage()}
                      className="h-9 w-9 rounded-lg border-border/40 hover:border-border hover:bg-accent/50 transition-all duration-200"
                      title="First page"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                      className="h-9 w-9 rounded-lg border-border/40 hover:border-border hover:bg-accent/50 transition-all duration-200"
                      title="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                      className="h-9 w-9 rounded-lg border-border/40 hover:border-border hover:bg-accent/50 transition-all duration-200"
                      title="Next page"
                    >
                      <ChevronRightIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                      disabled={!table.getCanNextPage()}
                      className="h-9 w-9 rounded-lg border-border/40 hover:border-border hover:bg-accent/50 transition-all duration-200"
                      title="Last page"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Artist Studio View */}
          <TabsContent value="studio" className="mt-0">
            <div className="space-y-6">
              {/* Studio Header */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-foreground">Artist Studio Cards</h3>
                  <p className="text-sm text-muted-foreground">
                    Beautiful artist cards showing their events and Spotify data
                  </p>
                </div>
                <Badge variant="secondary" className="px-3 py-1">
                  {artistsWithEvents.filter(artist =>
                    !globalFilter ||
                    artist.title.toLowerCase().includes(globalFilter.toLowerCase()) ||
                    artist.country_label?.toLowerCase().includes(globalFilter.toLowerCase()) ||
                    artist.events?.some(event =>
                      event.title.toLowerCase().includes(globalFilter.toLowerCase()) ||
                      event.venue_name?.toLowerCase().includes(globalFilter.toLowerCase())
                    )
                  ).length} artists
                </Badge>
              </div>

              {/* Artist Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {artistsWithEvents
                  .filter(artist =>
                    !globalFilter ||
                    artist.title.toLowerCase().includes(globalFilter.toLowerCase()) ||
                    artist.country_label?.toLowerCase().includes(globalFilter.toLowerCase()) ||
                    artist.events?.some(event =>
                      event.title.toLowerCase().includes(globalFilter.toLowerCase()) ||
                      event.venue_name?.toLowerCase().includes(globalFilter.toLowerCase())
                    )
                  )
                  .slice(0, 20) // Show first 20 artists for performance
                  .map((artist) => (
                    <Card key={artist.id} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 bg-gradient-to-br from-background to-background/80 backdrop-blur-sm">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
                                <Music className="h-6 w-6 text-white" />
                              </div>
                              {artist.eventCount > 5 && (
                                <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-yellow-500 flex items-center justify-center">
                                  <Star className="h-2.5 w-2.5 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <CardTitle className="text-base font-semibold truncate group-hover:text-primary transition-colors">
                                {artist.title}
                              </CardTitle>
                              {artist.subtitle && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">{artist.subtitle}</p>
                              )}
                            </div>
                          </div>
                          {artist.url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(artist.url, '_blank')}
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-3">
                          {artist.country_label && (
                            <Badge variant="outline" className="text-xs border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 transition-colors">
                              <Globe className="h-3 w-3 mr-1" />
                              {artist.country_label}
                            </Badge>
                          )}

                          <div className="flex items-center gap-1">
                            {artist.eventCount >= 10 ? (
                              <Badge className="text-xs bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-sm">
                                <Sparkles className="h-3 w-3 mr-1" />
                                {artist.eventCount} events
                              </Badge>
                            ) : artist.eventCount >= 5 ? (
                              <Badge className="text-xs bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm">
                                <Calendar className="h-3 w-3 mr-1" />
                                {artist.eventCount} events
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs border-purple-500/30 bg-purple-500/10">
                                <Ticket className="h-3 w-3 mr-1" />
                                {artist.eventCount} event{artist.eventCount !== 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* Spotify Data Section */}
                        {artist.spotify_id && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/20 flex items-center justify-center">
                                <svg className="h-4 w-4 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                                </svg>
                              </div>
                              <span className="text-sm font-medium text-green-500">Spotify Connected</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {artist.followers && (
                                <div className="flex items-center gap-1">
                                  <Users className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-muted-foreground">{artist.followers.toLocaleString()}</span>
                                </div>
                              )}
                              {artist.popularity !== undefined && (
                                <div className="flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-muted-foreground">{artist.popularity}%</span>
                                </div>
                              )}
                            </div>

                            {artist.primary_genres && (
                              <div className="flex flex-wrap gap-1">
                                {artist.primary_genres.split(' | ').slice(0, 2).map((genre, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs px-1.5 py-0.5 border-purple-500/30 text-purple-600">
                                    {genre}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Audio Features */}
                        {artist.energy_mean && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Activity className="h-4 w-4 text-orange-500" />
                              <span className="text-sm font-medium">Audio Features</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1">
                                  <Zap className="h-3 w-3 text-yellow-500" />
                                  <span className="text-muted-foreground">Energy</span>
                                </div>
                                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-gradient-to-r from-yellow-500 to-orange-500" style={{ width: `${artist.energy_mean * 100}%` }} />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-1">
                                  <Activity className="h-3 w-3 text-pink-500" />
                                  <span className="text-muted-foreground">Dance</span>
                                </div>
                                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-gradient-to-r from-pink-500 to-purple-500" style={{ width: `${artist.danceability_mean * 100}%` }} />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 text-green-500" />
                                  <span className="text-muted-foreground">Valence</span>
                                </div>
                                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-gradient-to-r from-green-500 to-blue-500" style={{ width: `${artist.valence_mean * 100}%` }} />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Events Section */}
                        {artist.events && artist.events.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-blue-500" />
                              <span className="text-sm font-medium">Performing at</span>
                            </div>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {artist.events.slice(0, 3).map((event, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 bg-muted/30 rounded-md hover:bg-muted/50 transition-colors">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">{event.title}</div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                      <Clock className="h-3 w-3" />
                                      {format(new Date(event.start_date), 'MMM dd, HH:mm')}
                                      {event.venue_name && (
                                        <>
                                          <span>•</span>
                                          <MapPin className="h-3 w-3" />
                                          <span className="truncate">{event.venue_name}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  {event.confidence && (
                                    <Badge variant={event.confidence > 0.8 ? 'default' : 'secondary'} className="text-xs ml-2">
                                      {Math.round(event.confidence * 100)}%
                                    </Badge>
                                  )}
                                </div>
                              ))}
                              {artist.events.length > 3 && (
                                <div className="text-xs text-muted-foreground text-center py-1">
                                  +{artist.events.length - 3} more events
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
              </div>

              {/* Load More Button */}
              {artistsWithEvents.length > 20 && (
                <div className="text-center pt-4">
                  <Button variant="outline" className="px-8">
                    Load More Artists
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}