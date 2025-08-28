'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Ticket,
  Clock,
  MapPin,
  Users,
  Mic,
  ExternalLink,
  Star,
  Play,
  Headphones,
  Globe,
  TrendingUp,
  Zap,
  Music2,
  Heart,
} from 'lucide-react';
import { format } from 'date-fns';

interface Artist {
  id: string;
  ade_id: number;
  title: string;
  country_label?: string;
  confidence?: number;
  
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
  
  // Top track
  top_track_id?: string;
  top_track_name?: string;
  top_track_popularity?: number;
  top_track_player_url?: string;
  
  // Preview metadata
  preview_available?: boolean;
}

interface Event {
  id: string;
  ade_id: number;
  title: string;
  subtitle?: string;
  start_date: string;
  end_date: string;
  venue_name?: string;
  categories?: string;
  sold_out?: boolean;
  url?: string;
  artists?: Artist[];
  artistCount?: number;
}

interface EventCardProps {
  event: Event;
  index: number;
}

export function EventCard({ event, index }: EventCardProps) {
  // Safe date parsing with validation
  const startDate = event.start_date ? new Date(event.start_date) : null;
  const isValidStartDate = startDate && !isNaN(startDate.getTime());
  
  const endDate = event.end_date ? new Date(event.end_date) : null;
  const isValidEndDate = endDate && !isNaN(endDate.getTime());
  
  const isToday = isValidStartDate ? new Date().toDateString() === startDate.toDateString() : false;
  const isTomorrow = isValidStartDate ? new Date(Date.now() + 86400000).toDateString() === startDate.toDateString() : false;
  const artists = event.artists || [];
  const categories = event.categories ? event.categories.split('/').filter(Boolean) : [];
  
  return (
    <motion.div
      key={event.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="group"
    >
      <Card className="relative overflow-hidden border-blue-500/20 bg-gradient-to-br from-background via-background to-blue-500/5 hover:border-blue-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1">
        {/* Event Header */}
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-sm">
                  <Ticket className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg font-bold truncate group-hover:text-blue-600 transition-colors">
                    {event.title}
                  </CardTitle>
                  {event.subtitle && (
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {event.subtitle}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Date & Time */}
              <div className="flex items-center gap-3 mb-3">
                <Badge
                  variant={isToday ? "default" : "secondary"}
                  className={`text-xs px-3 py-1.5 ${
                    isToday 
                      ? 'bg-green-500 hover:bg-green-600 animate-pulse shadow-sm' 
                      : 'bg-blue-500/10 border-blue-500/30 text-blue-700'
                  }`}
                >
                  {isToday ? '🔴 Today' : isTomorrow ? '🟡 Tomorrow' : isValidStartDate ? format(startDate, 'MMM dd, yyyy') : 'Date TBA'}
                </Badge>
                {isToday && <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
              </div>
              
              <div className="flex items-center gap-4 text-sm mb-3">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium tabular-nums">
                    {isValidStartDate ? format(startDate, 'HH:mm') : '--:--'}
                  </span>
                  <span className="text-muted-foreground">-</span>
                  <span className="tabular-nums">
                    {isValidEndDate ? format(endDate, 'HH:mm') : '--:--'}
                  </span>
                </div>
              </div>

              {/* Venue */}
              {event.venue_name && (
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className="border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 transition-colors text-xs px-3 py-1.5">
                    <MapPin className="h-3 w-3 mr-1.5" />
                    <span className="truncate max-w-[200px]">{event.venue_name}</span>
                  </Badge>
                </div>
              )}

              {/* Categories */}
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {categories.slice(0, 3).map((cat, idx) => {
                    const colors = [
                      'border-purple-500/30 bg-purple-500/10 text-purple-700',
                      'border-green-500/30 bg-green-500/10 text-green-700',
                      'border-orange-500/30 bg-orange-500/10 text-orange-700'
                    ];
                    return (
                      <Badge
                        key={idx}
                        variant="outline"
                        className={`text-xs px-2 py-0.5 hover:scale-105 transition-transform cursor-default ${colors[idx % colors.length]}`}
                      >
                        {cat.trim()}
                      </Badge>
                    );
                  })}
                  {categories.length > 3 && (
                    <Badge variant="outline" className="text-xs px-2 py-0.5 border-gray-500/30 bg-gray-500/10 text-gray-600">
                      +{categories.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Action Button */}
            <div className="flex items-start gap-2">
              {event.sold_out && (
                <Badge variant="destructive" className="text-xs whitespace-nowrap">
                  Sold Out
                </Badge>
              )}
              {event.url && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => window.open(event.url, '_blank')}
                  className="h-8 w-8 hover:bg-blue-500/10 hover:text-blue-500 shrink-0"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Artist Lineup */}
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-500" />
                Artist Lineup
                <Badge variant="default" className="text-xs px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 shadow-sm">
                  {event.artistCount || artists.length}
                </Badge>
              </h4>
            </div>

                            {artists.length > 0 ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto custom-scrollbar">
                      {artists.slice(0, 6).map((artist, idx) => {
                        const hasSpotifyData = artist.spotify_id;
                        const artistImage = artist.spotify_image || artist.image_url;
                        const primaryGenres = artist.primary_genres ? artist.primary_genres.split(',').slice(0, 2) : [];
                        const hasAudioFeatures = artist.energy_mean !== undefined;
                        
                        return (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: idx * 0.1 }}
                            className="relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-blue-500/5 border border-purple-500/10 hover:border-purple-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-0.5 group/artist"
                          >
                            {/* Artist Header */}
                            <div className="p-4 pb-3">
                              <div className="flex items-start gap-3">
                                {/* Artist Image */}
                                <div className="relative">
                                  {artistImage ? (
                                    <div className="h-16 w-16 rounded-xl overflow-hidden shadow-lg group-hover/artist:shadow-xl transition-shadow">
                                      <img 
                                        src={artistImage} 
                                        alt={artist.title}
                                        className="w-full h-full object-cover group-hover/artist:scale-110 transition-transform duration-300"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.style.display = 'none';
                                          target.nextElementSibling?.classList.remove('hidden');
                                        }}
                                      />
                                      <div className="hidden h-full w-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                        <Music2 className="h-8 w-8 text-white" />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg group-hover/artist:shadow-xl transition-shadow">
                                      <Music2 className="h-8 w-8 text-white" />
                                    </div>
                                  )}
                                  
                                  {/* Spotify Badge */}
                                  {hasSpotifyData && (
                                    <div className="absolute -top-1 -right-1 h-6 w-6 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
                                      <Headphones className="h-3 w-3 text-white" />
                                    </div>
                                  )}
                                </div>

                                {/* Artist Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h5 className="font-bold text-sm truncate group-hover/artist:text-purple-600 transition-colors">
                                      {artist.title}
                                    </h5>
                                    {artist.popularity && (
                                      <div className="flex items-center gap-1">
                                        <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                        <span className="text-xs font-medium text-yellow-600">
                                          {artist.popularity}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {artist.country_label && (
                                    <div className="flex items-center gap-1 mb-2">
                                      <Globe className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-xs text-muted-foreground">
                                        {artist.country_label}
                                      </span>
                                    </div>
                                  )}

                                  {/* Followers */}
                                  {artist.followers && (
                                    <div className="flex items-center gap-1 mb-2">
                                      <Users className="h-3 w-3 text-blue-500" />
                                      <span className="text-xs font-medium text-blue-600">
                                        {artist.followers >= 1000000 
                                          ? `${(artist.followers / 1000000).toFixed(1)}M` 
                                          : artist.followers >= 1000 
                                            ? `${(artist.followers / 1000).toFixed(1)}K`
                                            : artist.followers.toLocaleString()
                                        } followers
                                      </span>
                                    </div>
                                  )}

                                  {/* Genres */}
                                  {primaryGenres.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-2">
                                      {primaryGenres.map((genre, genreIdx) => (
                                        <Badge 
                                          key={genreIdx}
                                          variant="secondary" 
                                          className="text-xs px-2 py-0.5 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-500/20 text-indigo-700 hover:scale-105 transition-transform"
                                        >
                                          {genre.trim()}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}

                                  {/* Sound Descriptor */}
                                  {artist.sound_descriptor && (
                                    <div className="flex items-center gap-1 mb-2">
                                      <Zap className="h-3 w-3 text-orange-500" />
                                      <span className="text-xs text-orange-600 font-medium">
                                        {artist.sound_descriptor}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-1">
                                  {artist.spotify_url && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 hover:bg-green-500/10 hover:text-green-600"
                                      onClick={() => window.open(artist.spotify_url, '_blank')}
                                    >
                                      <Headphones className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {artist.top_track_player_url && artist.preview_available && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 hover:bg-blue-500/10 hover:text-blue-600"
                                      onClick={() => window.open(artist.top_track_player_url, '_blank')}
                                    >
                                      <Play className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Audio Features Bar */}
                            {hasAudioFeatures && (
                              <div className="px-4 pb-3">
                                <div className="flex items-center gap-2 text-xs">
                                  <div className="flex items-center gap-1">
                                    <Zap className="h-3 w-3 text-red-500" />
                                    <span className="text-muted-foreground">Energy</span>
                                    <div className="h-1.5 w-8 bg-muted rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-gradient-to-r from-red-500 to-orange-500"
                                        style={{ width: `${(artist.energy_mean || 0) * 100}%` }}
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Heart className="h-3 w-3 text-pink-500" />
                                    <span className="text-muted-foreground">Mood</span>
                                    <div className="h-1.5 w-8 bg-muted rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-gradient-to-r from-pink-500 to-rose-500"
                                        style={{ width: `${(artist.valence_mean || 0) * 100}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Top Track */}
                            {artist.top_track_name && (
                              <div className="px-4 pb-3 border-t border-purple-500/10 pt-3 mt-1">
                                <div className="flex items-center gap-2">
                                  <TrendingUp className="h-3 w-3 text-green-500" />
                                  <span className="text-xs text-muted-foreground">Top Track:</span>
                                  <span className="text-xs font-medium text-green-600 truncate">
                                    {artist.top_track_name}
                                  </span>
                                  {artist.top_track_popularity && (
                                    <Badge variant="outline" className="text-xs px-1.5 py-0.5 border-green-500/30 bg-green-500/10 text-green-700">
                                      {artist.top_track_popularity}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Confidence Score */}
                            {artist.confidence && (
                              <div className="absolute top-2 right-2">
                                <div className="flex items-center gap-1 bg-black/20 backdrop-blur-sm rounded-full px-2 py-1">
                                  <div className="h-1.5 w-6 bg-black/20 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-gradient-to-r from-green-400 to-emerald-400"
                                      style={{ width: `${artist.confidence * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-white font-medium tabular-nums">
                                    {Math.round(artist.confidence * 100)}%
                                  </span>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                    
                    {artists.length > 6 && (
                      <div className="text-center pt-2">
                        <Badge variant="outline" className="text-xs px-3 py-1.5 border-dashed hover:bg-muted/50 transition-colors cursor-default">
                          +{artists.length - 6} more artists
                        </Badge>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Mic className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm italic">No lineup announced yet</p>
                  </div>
                )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
