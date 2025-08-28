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
import { DBArtist } from "@/lib/types";
import { isSupabaseConfigured } from "@/lib/supabase";
import { format } from "date-fns";
import { Search, ExternalLink, User, Calendar, MapPin, RefreshCw, Sparkles, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { toast } from "sonner";

export function ArtistList({ refreshTrigger = 0 }: { refreshTrigger?: number }) {
  const [artists, setArtists] = useState<DBArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredArtists, setFilteredArtists] = useState<DBArtist[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [enrichingArtist, setEnrichingArtist] = useState<number | null>(null);
  const [isReEnrichingAll, setIsReEnrichingAll] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    const fetchArtists = async () => {
      if (!isSupabaseConfigured()) {
        console.log('Supabase not configured, skipping artist fetch');
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching artists from database...');
        const data = await dbService.getArtists(100); // Get first 100 artists
        console.log(`Fetched ${data.length} artists`);
        setArtists(data);
        setFilteredArtists(data);
      } catch (error) {
        console.error('Error fetching artists:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchArtists();
  }, [refreshTrigger]); // Re-fetch when refreshTrigger changes

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      console.log('Manually refreshing artists...');
      const data = await dbService.getArtists(100);
      console.log(`Refreshed: ${data.length} artists`);
      setArtists(data);
      setFilteredArtists(data);
    } catch (error) {
      console.error('Error refreshing artists:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const enrichArtist = async (artist: DBArtist, forceOverride = false) => {
    setEnrichingArtist(artist.id);
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
        toast.success(`Enriched ${artist.title}!`);
        // Update the artist in our local state
        const updatedArtists = artists.map(a =>
          a.id === artist.id
            ? { ...a, spotify_id: data.enrichedData.spotify_id, image_url: data.enrichedData.image_url }
            : a
        );
        setArtists(updatedArtists);
        setFilteredArtists(updatedArtists);
      } else {
        if (data.error === 'Artist already enriched') {
          toast.info(`${artist.title} already enriched`);
        } else {
          toast.error(`Failed to enrich ${artist.title}: ${data.error}`);
        }
      }
    } catch (error) {
      toast.error(`Error enriching ${artist.title}`);
      console.error('Error enriching artist:', error);
    } finally {
      setEnrichingArtist(null);
    }
  };

  const reEnrichAll = async () => {
    if (!confirm(`This will re-enrich ${filteredArtists.length} artists with improved Spotify matching.\n\nThis may take several minutes.\n\nContinue?`)) {
      return;
    }

    setIsReEnrichingAll(true);
    setEnrichProgress({ current: 0, total: filteredArtists.length });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < filteredArtists.length; i++) {
      const artist = filteredArtists[i];
      setEnrichProgress({ current: i + 1, total: filteredArtists.length });

      try {
        const response = await fetch('/api/spotify/enrich', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            artistId: artist.id,
            artistName: artist.title,
            forceOverride: true,
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        errorCount++;
        console.error(`Error enriching ${artist.title}:`, error);
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setIsReEnrichingAll(false);
    setEnrichProgress({ current: 0, total: 0 });

    toast.success(`Re-enrichment complete! Success: ${successCount}, Failed: ${errorCount}`);
    handleRefresh(); // Refresh the list
  };

  useEffect(() => {
    const searchArtists = async () => {
      if (!searchQuery.trim()) {
        setFilteredArtists(artists);
        return;
      }

      if (!isSupabaseConfigured()) {
        // Local filtering
        const filtered = artists.filter(artist =>
          artist.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredArtists(filtered);
        return;
      }

      try {
        const results = await dbService.searchArtists(searchQuery);
        setFilteredArtists(results);
      } catch (error) {
        console.error('Error searching artists:', error);
      }
    };

    const debounceTimer = setTimeout(searchArtists, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, artists]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Artists Database
            {artists.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {artists.length}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              onClick={reEnrichAll}
              disabled={isReEnrichingAll || loading || filteredArtists.length === 0}
              size="sm"
              variant="outline"
              className="border-purple-500/20 hover:bg-purple-500/10"
            >
              {isReEnrichingAll ? (
                <>
                  <Sparkles className="w-4 h-4 mr-1 animate-spin" />
                  {enrichProgress.current}/{enrichProgress.total}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-1" />
                  Re-enrich All
                </>
              )}
            </Button>
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
                placeholder="Search artists..."
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
              Configure Supabase to view artists database
            </p>
          </div>
        ) : loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : filteredArtists.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {searchQuery ? 'No artists found matching your search' : 'No artists in database yet'}
            </p>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Artist</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>First Seen</TableHead>
                  <TableHead>Spotify</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArtists.slice(0, 20).map((artist, index) => (
                  <motion.tr
                    key={artist.ade_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="group hover:bg-muted/50 transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {artist.image_url ? (
                          <img
                            src={artist.image_url}
                            alt={artist.title}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <User className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{artist.title}</p>
                          {artist.subtitle && (
                            <p className="text-xs text-muted-foreground">
                              {artist.subtitle}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {artist.country_label ? (
                        <Badge variant="outline" className="gap-1">
                          <MapPin className="w-3 h-3" />
                          {artist.country_label}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(artist.first_seen_at), 'MMM dd, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      {artist.spotify_id ? (
                        <Badge variant="outline" className="gap-1 border-green-500/30 bg-green-500/10">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span className="text-xs">Enriched</span>
                        </Badge>
                      ) : (
                        <Button
                          onClick={() => enrichArtist(artist)}
                          disabled={enrichingArtist === artist.id || isReEnrichingAll}
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                        >
                          {enrichingArtist === artist.id ? (
                            <>
                              <Sparkles className="w-3 h-3 mr-1 animate-spin" />
                              Enriching...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3 mr-1" />
                              Enrich
                            </>
                          )}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {artist.url && (
                          <a
                            href={artist.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            ADE
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {artist.spotify_id && (
                          <a
                            href={`https://open.spotify.com/artist/${artist.spotify_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-green-600 hover:underline"
                          >
                            Spotify
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {filteredArtists.length > 20 && (
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Showing 20 of {filteredArtists.length} artists
          </div>
        )}
      </CardContent>
    </Card>
  );
}
