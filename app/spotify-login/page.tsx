'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Music2, 
  Users, 
  Heart, 
  Calendar, 
  MapPin, 
  ExternalLink,
  Play,
  Headphones,
  Star,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Navigation } from '@/components/navigation';
import { getFlagFromCountryName } from '@/lib/country-mapping';
import type { DBArtist, DBEvent } from '@/lib/types';

interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  country: string;
  followers: {
    total: number;
  };
  images: Array<{
    url: string;
    height: number;
    width: number;
  }>;
}

interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  followers: {
    total: number;
  };
  images: Array<{
    url: string;
    height: number;
    width: number;
  }>;
  external_urls: {
    spotify: string;
  };
}

interface MatchedArtist extends DBArtist {
  matchReason: 'liked' | 'followed' | 'top_artist' | 'recently_played';
  spotifyData?: SpotifyArtist;
  events: DBEvent[];
}

export default function SpotifyLoginPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [matchedArtists, setMatchedArtists] = useState<MatchedArtist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalMatches: 0,
    likedMatches: 0,
    followedMatches: 0,
    topArtistMatches: 0,
    recentlyPlayedMatches: 0
  });

  // Check if user is already logged in
  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const response = await fetch('/api/spotify/me');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setIsLoggedIn(true);
        // Auto-fetch matches if already logged in
        fetchMatches();
      }
    } catch (error) {
      console.log('Not logged in');
    }
  };

  const handleSpotifyLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
    const redirectUri = encodeURIComponent(`${window.location.origin}/api/spotify/callback`);
    const scopes = [
      'user-read-private',
      'user-read-email', 
      'user-top-read',
      'user-library-read',
      'user-follow-read',
      'playlist-read-private',
      'user-read-recently-played'
    ].join(' ');

    const authUrl = `https://accounts.spotify.com/authorize?` +
      `client_id=${clientId}&` +
      `response_type=code&` +
      `redirect_uri=${redirectUri}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `show_dialog=true`;

    window.location.href = authUrl;
  };

  const fetchMatches = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/spotify/matches');
      if (!response.ok) {
        throw new Error('Failed to fetch matches');
      }
      
      const data = await response.json();
      setMatchedArtists(data.matches || []);
      setStats(data.stats || {
        totalMatches: 0,
        likedMatches: 0,
        followedMatches: 0,
        topArtistMatches: 0,
        recentlyPlayedMatches: 0
      });
    } catch (error) {
      console.error('Error fetching matches:', error);
      setError('Failed to load your matches. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/spotify/logout', { method: 'POST' });
      setIsLoggedIn(false);
      setUser(null);
      setMatchedArtists([]);
      setStats({
        totalMatches: 0,
        likedMatches: 0,
        followedMatches: 0,
        topArtistMatches: 0,
        recentlyPlayedMatches: 0
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background relative">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 via-black to-green-800/20" />
        
        <div className="relative z-10 container mx-auto px-4 py-8">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center gap-4 mb-6">
              <Music2 className="h-12 w-12 text-green-500" />
              <div>
                <h1 className="text-6xl md:text-7xl font-black bg-gradient-to-r from-green-500 via-green-400 to-green-600 bg-clip-text text-transparent">
                  SPOTIFY MATCH
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground">
                  Find Festival Artists You'll Love
                </p>
              </div>
              <Music2 className="h-12 w-12 text-green-500" />
            </div>

            <div className="flex justify-center mb-8">
              <Navigation />
            </div>
          </motion.div>

          {/* Login Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="max-w-2xl mx-auto"
          >
            <Card className="bg-card/80 backdrop-blur-sm border-green-500/30">
              <CardHeader className="text-center">
                <CardTitle className="text-3xl font-bold text-green-500 mb-4">
                  Connect Your Spotify
                </CardTitle>
                <p className="text-muted-foreground text-lg">
                  We'll analyze your music taste and find featured festival artists you'll love to see live.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg">
                    <Heart className="h-5 w-5 text-green-500" />
                    <span>Your Liked Songs</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg">
                    <Users className="h-5 w-5 text-green-500" />
                    <span>Followed Artists</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    <span>Top Artists</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg">
                    <Play className="h-5 w-5 text-green-500" />
                    <span>Recently Played</span>
                  </div>
                </div>

                <Button 
                  onClick={handleSpotifyLogin}
                  className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-6"
                  size="lg"
                >
                  <Music2 className="h-6 w-6 mr-3" />
                  Login with Spotify
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  We only read your music data to find matches. We never modify your playlists or account.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 via-black to-green-800/20" />
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-4 mb-6">
            <Music2 className="h-10 w-10 text-green-500" />
            <div>
              <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-green-500 via-green-400 to-green-600 bg-clip-text text-transparent">
                Your Festival Matches
              </h1>
              <p className="text-muted-foreground">
                Welcome back, {user?.display_name}!
              </p>
            </div>
            <Music2 className="h-10 w-10 text-green-500" />
          </div>

          <div className="flex justify-center mb-6">
            <Navigation />
          </div>

          {/* User Info */}
          <Card className="max-w-md mx-auto bg-card/80 backdrop-blur-sm border-green-500/30 mb-8">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {user?.images?.[0] && (
                  <img 
                    src={user.images[0].url} 
                    alt={user.display_name}
                    className="w-12 h-12 rounded-full"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-bold text-green-500">{user?.display_name}</h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <p className="text-xs text-muted-foreground">{user?.country}</p>
                </div>
                <Button 
                  onClick={logout}
                  variant="outline"
                  size="sm"
                  className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                >
                  Logout
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats */}
        {stats.totalMatches > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8"
          >
            <Card className="bg-green-500/10 border-green-500/30">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-500">{stats.totalMatches}</div>
                <div className="text-sm text-muted-foreground">Total Matches</div>
              </CardContent>
            </Card>
            <Card className="bg-red-500/10 border-red-500/30">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-500">{stats.likedMatches}</div>
                <div className="text-sm text-muted-foreground">Liked Songs</div>
              </CardContent>
            </Card>
            <Card className="bg-blue-500/10 border-blue-500/30">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-500">{stats.followedMatches}</div>
                <div className="text-sm text-muted-foreground">Followed</div>
              </CardContent>
            </Card>
            <Card className="bg-purple-500/10 border-purple-500/30">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-500">{stats.topArtistMatches}</div>
                <div className="text-sm text-muted-foreground">Top Artists</div>
              </CardContent>
            </Card>
            <Card className="bg-orange-500/10 border-orange-500/30">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-500">{stats.recentlyPlayedMatches}</div>
                <div className="text-sm text-muted-foreground">Recent</div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Refresh Button */}
        <div className="text-center mb-8">
          <Button 
            onClick={fetchMatches}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Finding Matches...
              </>
            ) : (
              <>
                <Music2 className="h-4 w-4 mr-2" />
                Refresh Matches
              </>
            )}
          </Button>
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto mb-8"
          >
            <Card className="bg-red-500/10 border-red-500/30">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="text-red-500">{error}</span>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Matches Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="bg-card/80 backdrop-blur-sm">
                <CardContent className="p-4">
                  <Skeleton className="w-full h-48 mb-4" />
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : matchedArtists.length > 0 ? (
          <div className="space-y-6">
            {/* View Events Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <Button 
                asChild
                size="lg"
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-8 py-3"
              >
                <a href="/spotify-events">
                  <Calendar className="h-5 w-5 mr-2" />
                  View My Event Schedule
                </a>
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                See all events organized by day for your matched artists
              </p>
            </motion.div>

            {/* Matched Artists Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {matchedArtists.map((artist, index) => (
              <motion.div
                key={artist.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group"
              >
                <Card className="h-full bg-card/80 backdrop-blur-sm border-border/50 hover:border-green-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10">
                  <CardContent className="p-0">
                    {/* Artist Image */}
                    <div className="relative aspect-square overflow-hidden">
                      {artist.image_url ? (
                        <img 
                          src={artist.image_url} 
                          alt={artist.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-green-900/20 to-green-800/20 flex items-center justify-center">
                          <Music2 className="h-16 w-16 text-green-500/50" />
                        </div>
                      )}
                      
                      {/* Match Badge */}
                      <div className="absolute top-2 left-2">
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${
                            artist.matchReason === 'liked' ? 'bg-red-500/20 text-red-500 border-red-500/30' :
                            artist.matchReason === 'followed' ? 'bg-blue-500/20 text-blue-500 border-blue-500/30' :
                            artist.matchReason === 'top_artist' ? 'bg-purple-500/20 text-purple-500 border-purple-500/30' :
                            'bg-orange-500/20 text-orange-500 border-orange-500/30'
                          }`}
                        >
                          {artist.matchReason === 'liked' ? 'Liked' :
                           artist.matchReason === 'followed' ? 'Followed' :
                           artist.matchReason === 'top_artist' ? 'Top Artist' :
                           'Recent'}
                        </Badge>
                      </div>

                      {/* Spotify Link */}
                      {artist.spotify_url && (
                        <div className="absolute top-2 right-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
                            onClick={() => window.open(artist.spotify_url, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Artist Info */}
                    <div className="p-4">
                      <h3 className="font-bold text-lg mb-2 line-clamp-1">{artist.title}</h3>
                      
                      {artist.country_label && (
                        <p className="text-sm text-muted-foreground mb-2 flex items-center">
                          {getFlagFromCountryName(artist.country_label) && (
                            <span className="mr-2">{getFlagFromCountryName(artist.country_label)}</span>
                          )}
                          {artist.country_label}
                        </p>
                      )}

                      {/* Genres - from Spotify data */}
                      {artist.spotifyData?.genres && artist.spotifyData.genres.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {artist.spotifyData.genres.slice(0, 3).map((genre, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {genre}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Events */}
                      {artist.events && artist.events.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-green-500">
                            <Calendar className="h-4 w-4" />
                            <span className="font-medium">{artist.events.length} Event{artist.events.length > 1 ? 's' : ''}</span>
                          </div>
                          
                          {artist.events.slice(0, 2).map((event, i) => (
                            <div key={event.id} className="text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span className="line-clamp-1">{event.venue_name || 'TBA'}</span>
                              </div>
                              <div className="text-xs text-muted-foreground/70 line-clamp-1">
                                {new Date(event.start_date).toLocaleDateString('en', {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Audio Player */}
                      {artist.top_track_player_url && (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground truncate">
                                {artist.top_track_name || 'Preview'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Card className="max-w-md mx-auto bg-card/80 backdrop-blur-sm">
              <CardContent className="p-8">
                <Music2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">No Matches Found</h3>
                <p className="text-muted-foreground mb-4">
                  We couldn't find any featured festival artists that match your Spotify taste.
                </p>
                <Button onClick={fetchMatches} variant="outline">
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
// @ts-nocheck
