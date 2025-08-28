'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFacetedMinMaxValues,
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  ExpandedState,
  PaginationState,
  RowSelectionState,
  flexRender,
} from '@tanstack/react-table';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sparkles,
  Music,
  Globe,
  ExternalLink,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns,
  Download,
  Filter,
  Loader2,
  Check,
  X,
  TrendingUp,
  Users,
  Heart,
  Disc,
  Star,
  RefreshCw,
  ArrowUpDown,
  Eye,
  EyeOff,
  MoreHorizontal,
  Database
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface Artist {
  id: number;
  ade_id: number;
  title: string;
  subtitle?: string;
  country_label?: string;
  country_value?: string;
  url?: string;
  image_url?: string;
  spotify_id?: string;
  spotify_url?: string;
  genres?: string[];
  popularity?: number;
  followers?: number;
  spotify_image?: string;
  enriched_at?: string;
  spotify_data?: any;
  created_at?: string;
  updated_at?: string;
}

interface EnrichmentStatus {
  artistId: number;
  status: 'loading' | 'success' | 'error';
  message?: string;
}

export default function ArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    ade_id: false,
    country_value: false,
    created_at: false,
    updated_at: false,
  });
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [enrichmentStatus, setEnrichmentStatus] = useState<Map<number, EnrichmentStatus>>(new Map());
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  });
  const [isReEnriching, setIsReEnriching] = useState(false);
  const [reEnrichProgress, setReEnrichProgress] = useState({ current: 0, total: 0 });
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [checkingStorage, setCheckingStorage] = useState(false);

  useEffect(() => {
    loadArtists();
    checkStorageSetup();
  }, []);

  const checkStorageSetup = async () => {
    // This is just a UI indicator - the actual check happens server-side
    setIsStorageReady(true);
  };

  const setupStorage = async () => {
    setCheckingStorage(true);
    try {
      const response = await fetch('/api/setup-storage', {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Storage bucket ready for artist images!');
        setIsStorageReady(true);
      } else {
        toast.error('Failed to setup storage: ' + data.error);
      }
    } catch (error) {
      toast.error('Error setting up storage');
      console.error('Storage setup error:', error);
    } finally {
      setCheckingStorage(false);
    }
  };

  const loadArtists = async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      // Load ALL artists
      let allArtists: Artist[] = [];
      let offset = 0;
      const limit = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('artists')
          .select('*')
          .order('title', { ascending: true })
          .range(offset, offset + limit - 1);

        if (error) {
          console.error('Error loading artists:', error);
          hasMore = false;
        } else if (data && data.length > 0) {
          allArtists = [...allArtists, ...data];
          offset += limit;
          if (data.length < limit) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      setArtists(allArtists);
      console.log(`Loaded ${allArtists.length} artists`);
    } catch (error) {
      console.error('Error loading artists:', error);
    } finally {
      setLoading(false);
    }
  };

  const enrichArtist = async (artist: Artist, forceOverride = false) => {
    const statusMap = new Map(enrichmentStatus);
    statusMap.set(artist.id, { artistId: artist.id, status: 'loading' });
    setEnrichmentStatus(statusMap);

    try {
      const response = await fetch('/api/spotify/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistId: artist.id,
          artistName: artist.title,
          forceOverride: forceOverride,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        statusMap.set(artist.id, {
          artistId: artist.id,
          status: 'success',
          message: 'Enriched successfully!',
        });

        // Update the artist in our local state
        setArtists(prev =>
          prev.map(a =>
            a.id === artist.id
              ? {
                  ...a,
                  ...data.enrichedData,
                  spotify_data: data.enrichedData,
                }
              : a
          )
        );
      } else {
        statusMap.set(artist.id, {
          artistId: artist.id,
          status: 'error',
          message: data.error || 'Failed to enrich',
        });
      }
    } catch (error) {
      statusMap.set(artist.id, {
        artistId: artist.id,
        status: 'error',
        message: 'Network error',
      });
    }

    setEnrichmentStatus(statusMap);

    // Clear status after 3 seconds
    setTimeout(() => {
      const newStatusMap = new Map(enrichmentStatus);
      newStatusMap.delete(artist.id);
      setEnrichmentStatus(newStatusMap);
    }, 3000);
  };

  const enrichSelectedArtists = async () => {
    const selectedArtists = artists.filter((_, index) => rowSelection[index]);
    for (const artist of selectedArtists) {
      await enrichArtist(artist, false);
      // Add delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const reEnrichAllArtists = async () => {
    if (!confirm('This will re-enrich ALL artists with the improved Spotify matching algorithm.\n\nThis will override existing data and may take several minutes.\n\nContinue?')) {
      return;
    }

    setIsReEnriching(true);
    setReEnrichProgress({ current: 0, total: artists.length });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < artists.length; i++) {
      const artist = artists[i];
      setReEnrichProgress({ current: i + 1, total: artists.length });

      try {
        const response = await fetch('/api/spotify/enrich', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            artistId: artist.id,
            artistName: artist.title,
            forceOverride: true,  // Force override existing data
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          successCount++;
          // Update the artist in our local state
          setArtists(prev =>
            prev.map(a =>
              a.id === artist.id
                ? {
                    ...a,
                    ...data.enrichedData,
                    spotify_data: data.enrichedData,
                  }
                : a
            )
          );
        } else {
          errorCount++;
          console.error(`Failed to re-enrich ${artist.title}:`, data.error);
        }
      } catch (error) {
        errorCount++;
        console.error(`Error re-enriching ${artist.title}:`, error);
      }

      // Add delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setIsReEnriching(false);
    setReEnrichProgress({ current: 0, total: 0 });

    // Show summary
    alert(`Re-enrichment complete!\n\nSuccessful: ${successCount}\nFailed: ${errorCount}\nTotal: ${artists.length}`);
    
    // Reload artists to get fresh data
    await loadArtists();
  };

  const columns: ColumnDef<Artist>[] = useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'title',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-transparent px-0"
          >
            <Music className="h-4 w-4 mr-2 text-purple-500" />
            Artist Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const artist = row.original;
          const enrichmentState = enrichmentStatus.get(artist.id);
          
          return (
            <div className="flex items-center gap-3">
              <div className="relative">
                {artist.spotify_image || artist.image_url ? (
                  <img
                    src={artist.spotify_image || artist.image_url}
                    alt={artist.title}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Music className="h-5 w-5 text-white" />
                  </div>
                )}
                {artist.spotify_id && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center bg-green-500">
                    <Check className="h-3 w-3" />
                  </Badge>
                )}
              </div>
              <div>
                <div className="font-semibold flex items-center gap-2">
                  {artist.title}
                  {enrichmentState?.status === 'loading' && (
                    <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                  )}
                  {enrichmentState?.status === 'success' && (
                    <Check className="h-3 w-3 text-green-500" />
                  )}
                  {enrichmentState?.status === 'error' && (
                    <X className="h-3 w-3 text-red-500" />
                  )}
                </div>
                {artist.subtitle && (
                  <div className="text-xs text-muted-foreground">{artist.subtitle}</div>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'country_label',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-transparent px-0"
          >
            <Globe className="h-4 w-4 mr-2 text-blue-500" />
            Country
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const country = row.getValue('country_label') as string;
          return country ? (
            <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10">
              <Globe className="h-3 w-3 mr-1" />
              {country}
            </Badge>
          ) : (
            <span className="text-muted-foreground text-sm">Unknown</span>
          );
        },
        filterFn: 'includesString',
      },
      {
        accessorKey: 'genres',
        header: 'Genres',
        cell: ({ row }) => {
          const genres = row.getValue('genres') as string[] | undefined;
          if (!genres || genres.length === 0) return <span className="text-muted-foreground text-sm">-</span>;
          
          return (
            <div className="flex flex-wrap gap-1 max-w-[200px]">
              {genres.slice(0, 3).map((genre, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs bg-purple-500/10">
                  {genre}
                </Badge>
              ))}
              {genres.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{genres.length - 3}
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'popularity',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-transparent px-0"
          >
            <TrendingUp className="h-4 w-4 mr-2 text-green-500" />
            Popularity
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const popularity = row.getValue('popularity') as number | undefined;
          if (popularity === undefined) return <span className="text-muted-foreground text-sm">-</span>;
          
          const getColor = () => {
            if (popularity >= 70) return 'bg-green-500';
            if (popularity >= 50) return 'bg-yellow-500';
            if (popularity >= 30) return 'bg-orange-500';
            return 'bg-red-500';
          };
          
          return (
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${getColor()} transition-all`}
                  style={{ width: `${popularity}%` }}
                />
              </div>
              <span className="text-sm font-medium">{popularity}</span>
            </div>
          );
        },
        sortingFn: 'basic',
      },
      {
        accessorKey: 'followers',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-transparent px-0"
          >
            <Users className="h-4 w-4 mr-2 text-purple-500" />
            Followers
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const followers = row.getValue('followers') as number | undefined;
          if (followers === undefined || followers === null) return <span className="text-muted-foreground text-sm">-</span>;
          
          return (
            <Badge variant="secondary" className="bg-purple-500/10">
              <Heart className="h-3 w-3 mr-1" />
              {followers.toLocaleString()}
            </Badge>
          );
        },
        sortingFn: 'basic',
      },
      {
        accessorKey: 'spotify_id',
        header: 'Spotify',
        cell: ({ row }) => {
          const spotifyId = row.getValue('spotify_id') as string | undefined;
          const spotifyUrl = row.original.spotify_url;
          
          if (spotifyId && spotifyUrl) {
            return (
              <Button
                size="sm"
                variant="outline"
                className="h-8 border-green-500/30 hover:bg-green-500/10"
                onClick={() => window.open(spotifyUrl, '_blank')}
              >
                <Disc className="h-3 w-3 mr-1 text-green-500" />
                Open
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            );
          }
          
          return <span className="text-muted-foreground text-sm">Not linked</span>;
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const artist = row.original;
          const enrichmentState = enrichmentStatus.get(artist.id);
          
          return (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => enrichArtist(artist)}
                disabled={enrichmentState?.status === 'loading'}
                className={`
                  ${artist.spotify_id 
                    ? 'border-blue-500/30 hover:bg-blue-500/10' 
                    : 'border-purple-500/30 hover:bg-purple-500/10'}
                `}
              >
                {enrichmentState?.status === 'loading' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-1" />
                    {artist.spotify_id ? 'Refresh' : 'Enrich'}
                  </>
                )}
              </Button>
              
              {artist.url && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => window.open(artist.url, '_blank')}
                  className="h-8 w-8"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    onClick={() => enrichArtist(artist)}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Enrich with Spotify
                  </DropdownMenuCheckboxItem>
                  {artist.url && (
                    <DropdownMenuCheckboxItem
                      onClick={() => window.open(artist.url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View on ADE
                    </DropdownMenuCheckboxItem>
                  )}
                  {artist.spotify_url && (
                    <DropdownMenuCheckboxItem
                      onClick={() => window.open(artist.spotify_url, '_blank')}
                    >
                      <Disc className="h-4 w-4 mr-2" />
                      View on Spotify
                    </DropdownMenuCheckboxItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [enrichmentStatus, rowSelection]
  );

  const table = useReactTable({
    data: artists,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
      expanded,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    onExpandedChange: setExpanded,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
  });

  const selectedCount = Object.keys(rowSelection).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background p-6">
        <div className="max-w-[1600px] mx-auto space-y-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-[600px] w-full" />
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
          <div className="max-w-[1600px] mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 bg-clip-text text-transparent mb-4">
                  Artist Database
                </h1>
                <p className="text-lg text-muted-foreground">
                  Enrich artist data with Spotify insights
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="px-4 py-2 border-purple-500/30 bg-purple-500/10">
                  <Users className="h-4 w-4 mr-2 text-purple-500" />
                  {artists.length} Artists
                </Badge>
                <Badge variant="outline" className="px-4 py-2 border-green-500/30 bg-green-500/10">
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  {artists.filter(a => a.spotify_id).length} Enriched
                </Badge>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-8">
        <div className="max-w-[1600px] mx-auto">
          <Card className="border-0 shadow-xl bg-gradient-to-br from-background to-background/80">
            <CardHeader className="bg-gradient-to-r from-purple-500/10 to-blue-500/10">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <CardTitle className="text-2xl font-bold flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                    <Music className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div>All Artists</div>
                    {selectedCount > 0 && (
                      <div className="text-sm font-normal text-muted-foreground">
                        {selectedCount} selected
                      </div>
                    )}
                  </div>
                </CardTitle>
                
                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                  <div className="relative flex-1 lg:w-96">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search artists..."
                      value={globalFilter ?? ''}
                      onChange={(event) => setGlobalFilter(event.target.value)}
                      className="pl-10 bg-background/50 backdrop-blur-sm border-purple-500/20 focus:border-purple-500/50"
                    />
                  </div>
                  
                  {selectedCount > 0 && (
                    <Button
                      onClick={enrichSelectedArtists}
                      className="bg-gradient-to-r from-purple-500 to-blue-500 text-white"
                      disabled={isReEnriching}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Enrich {selectedCount} Selected
                    </Button>
                  )}
                  
                  <Button
                    onClick={reEnrichAllArtists}
                    variant="outline"
                    className="border-orange-500/50 hover:bg-orange-500/10"
                    disabled={isReEnriching || artists.length === 0}
                  >
                    {isReEnriching ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Re-enriching ({reEnrichProgress.current}/{reEnrichProgress.total})
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Re-enrich All ({artists.length})
                      </>
                    )}
                  </Button>
                  
                  {!isStorageReady && (
                    <Button
                      onClick={setupStorage}
                      variant="outline"
                      className="border-blue-500/50 hover:bg-blue-500/10"
                      disabled={checkingStorage}
                    >
                      {checkingStorage ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Setting up...
                        </>
                      ) : (
                        <>
                          <Database className="h-4 w-4 mr-2" />
                          Setup Image Storage
                        </>
                      )}
                    </Button>
                  )}
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="border-purple-500/20">
                        <Columns className="h-4 w-4 mr-2" />
                        Columns
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {table
                        .getAllColumns()
                        .filter((column) => column.getCanHide())
                        .map((column) => {
                          return (
                            <DropdownMenuCheckboxItem
                              key={column.id}
                              className="capitalize"
                              checked={column.getIsVisible()}
                              onCheckedChange={(value) =>
                                column.toggleVisibility(!!value)
                              }
                            >
                              {column.id}
                            </DropdownMenuCheckboxItem>
                          );
                        })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  <Button
                    onClick={loadArtists}
                    variant="outline"
                    className="border-blue-500/20"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              <div className="relative overflow-x-auto">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id} className="bg-muted/50">
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
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && 'selected'}
                          className="hover:bg-muted/50 transition-colors"
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="h-24 text-center"
                        >
                          <div className="text-muted-foreground">
                            {globalFilter ? 'No results found.' : 'No artists available.'}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
                    {Math.min(
                      (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                      table.getFilteredRowModel().rows.length
                    )}{' '}
                    of {table.getFilteredRowModel().rows.length} entries
                  </span>
                  <Badge variant="secondary" className="ml-2">
                    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => table.setPageIndex(0)}
                    disabled={!table.getCanPreviousPage()}
                    className="hover:bg-purple-500/10"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="hover:bg-purple-500/10"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="hover:bg-purple-500/10"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                    disabled={!table.getCanNextPage()}
                    className="hover:bg-purple-500/10"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
