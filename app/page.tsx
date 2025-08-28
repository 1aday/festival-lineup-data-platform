'use client';

import { useEffect, useState, useRef, useMemo, MouseEvent, useCallback } from 'react';
import { motion, useScroll, useTransform, AnimatePresence, useInView } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { WorldMap } from '@/components/world-map';
import { getFlagFromCountryName } from '@/lib/country-mapping';
import { 
  Sparkles, 
  Users, 
  Calendar, 
  Globe2,
  MapPin,
  Music2,
  Clock,
  TrendingUp,
  Play,
  Headphones,
  Mic2,
  Radio,
  Disc3,
  PartyPopper,
  Star,
  Heart,
  Zap,
  ChevronRight,
  ArrowUpRight,
  Volume2,
  Activity,
  Search,
  Filter,
  X,
  Shuffle,
  CalendarDays,
  SlidersHorizontal,
  Sparkle
} from 'lucide-react';
import type { DBArtist, DBEvent } from '@/lib/types';

interface Statistics {
  totalArtists: number;
  totalEvents: number;
  totalLinks: number;
  totalCountries: number;
  topVenues: { venue: string; count: number; type?: string }[];
  eventsByDate: { date: string; count: number }[];
  allArtists: DBArtist[];
  allEvents: DBEvent[];
  allArtistEvents: any[];
  latestEvents: DBEvent[];
  upcomingEvents: DBEvent[];
  genres: string[];
  countries: string[];
}

// Generate stable particle positions
const generateParticles = (count: number) => {
  // Use a stable seed-based approach
  const particles = [];
  for (let i = 0; i < count; i++) {
    // Use deterministic positioning based on index
    const angle = (i * 137.5) % 360; // Golden angle
    const radius = (i * 30) % 100;
    const x = 50 + radius * Math.cos(angle * Math.PI / 180) * 0.5;
    const y = 50 + radius * Math.sin(angle * Math.PI / 180) * 0.5;
    
    // Round to 4 decimal places to avoid hydration mismatches
    const leftValue = Math.round(x * 10000) / 10000;
    const topValue = Math.round(y * 10000) / 10000;
    
    particles.push({
      id: i,
      left: `${leftValue}%`,
      top: `${topValue}%`,
      delay: (i * 0.3) % 5,
      duration: 5 + (i % 3) * 2
    });
  }
  return particles;
};

// Animated Background Component
const AnimatedBackground = () => {
  const particles = useMemo(() => generateParticles(20), []);
  
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Gradient Orbs */}
      <motion.div
        className="absolute -top-48 -left-48 w-96 h-96 rounded-full bg-gradient-to-br from-primary/30 via-secondary/20 to-transparent blur-3xl"
        animate={{
          x: [0, 50, 0],
          y: [0, 30, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute top-1/2 -right-48 w-96 h-96 rounded-full bg-gradient-to-bl from-accent/30 via-primary/20 to-transparent blur-3xl"
        animate={{
          x: [0, -50, 0],
          y: [0, -30, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute -bottom-48 left-1/2 w-96 h-96 rounded-full bg-gradient-to-t from-secondary/30 via-accent/20 to-transparent blur-3xl"
        animate={{
          x: [0, 30, -30, 0],
          y: [0, -50, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      {/* Animated Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black_40%,transparent_100%)]" />
      
      {/* Floating Particles with stable positions */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute w-1 h-1 bg-primary/40 rounded-full"
          style={{
            left: particle.left,
            top: particle.top,
          }}
          animate={{
            y: [-20, -100],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeOut"
          }}
        />
      ))}
    </div>
  );
};

// Stats Counter Animation
const AnimatedCounter = ({ value, duration = 2 }: { value: number; duration?: number }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (inView) {
      let start = 0;
      const end = value;
      const increment = end / (duration * 60);
      
      const timer = setInterval(() => {
        start += increment;
        if (start >= end) {
          setCount(end);
          clearInterval(timer);
        } else {
          setCount(Math.floor(start));
        }
      }, 1000 / 60);
      
      return () => clearInterval(timer);
    }
  }, [value, duration, inView]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
};

// Extract genres from text using pattern matching
const extractGenresFromText = (text: string): string[] => {
  const foundGenres: string[] = [];
  const textLower = text.toLowerCase();
  
  // Comprehensive genre mapping - compound genres first, then simple ones
  const genrePatterns = [
    // Compound techno genres (check these first!)
    { pattern: /\b(melodic[\s-]?techno)\b/i, genres: ['MELODIC-TECHNO'] },
    { pattern: /\b(hard[\s-]?techno)\b/i, genres: ['HARD-TECHNO'] },
    { pattern: /\b(minimal[\s-]?techno)\b/i, genres: ['MINIMAL-TECHNO'] },
    { pattern: /\b(acid[\s-]?techno)\b/i, genres: ['ACID-TECHNO'] },
    { pattern: /\b(detroit[\s-]?techno)\b/i, genres: ['DETROIT-TECHNO'] },
    { pattern: /\b(berlin[\s-]?techno)\b/i, genres: ['BERLIN-TECHNO'] },
    { pattern: /\b(raw[\s-]?techno)\b/i, genres: ['RAW-TECHNO'] },
    { pattern: /\b(dub[\s-]?techno)\b/i, genres: ['DUB-TECHNO'] },
    
    // Compound house genres
    { pattern: /\b(deep[\s-]?house)\b/i, genres: ['DEEP-HOUSE'] },
    { pattern: /\b(tech[\s-]?house)\b/i, genres: ['TECH-HOUSE'] },
    { pattern: /\b(progressive[\s-]?house)\b/i, genres: ['PROGRESSIVE-HOUSE'] },
    { pattern: /\b(afro[\s-]?house)\b/i, genres: ['AFRO-HOUSE'] },
    { pattern: /\b(latin[\s-]?house)\b/i, genres: ['LATIN-HOUSE'] },
    { pattern: /\b(disco[\s-]?house)\b/i, genres: ['DISCO-HOUSE'] },
    { pattern: /\b(acid[\s-]?house)\b/i, genres: ['ACID-HOUSE'] },
    { pattern: /\b(chicago[\s-]?house)\b/i, genres: ['CHICAGO-HOUSE'] },
    { pattern: /\b(tribal[\s-]?house)\b/i, genres: ['TRIBAL-HOUSE'] },
    { pattern: /\b(electro[\s-]?house)\b/i, genres: ['ELECTRO-HOUSE'] },
    { pattern: /\b(future[\s-]?house)\b/i, genres: ['FUTURE-HOUSE'] },
    { pattern: /\b(bass[\s-]?house)\b/i, genres: ['BASS-HOUSE'] },
    { pattern: /\b(organic[\s-]?house)\b/i, genres: ['ORGANIC-HOUSE'] },
    
    // Simple genres (check after compound ones)
    { pattern: /\b(techno)\b/i, genres: ['TECHNO'] },
    { pattern: /\b(house)\b/i, genres: ['HOUSE'] },
    
    // Compound trance genres (check before simple trance)
    { pattern: /\b(progressive[\s-]?trance)\b/i, genres: ['PROGRESSIVE-TRANCE'] },
    { pattern: /\b(uplifting[\s-]?trance)\b/i, genres: ['UPLIFTING-TRANCE'] },
    { pattern: /\b(psy[\s-]?trance|psytrance)\b/i, genres: ['PSYTRANCE'] },
    
    // Bass music
    { pattern: /\b(drum[\s&-]?(and|n)[\s-]?bass|dnb|d&b)\b/i, genres: ['DNB'] },
    { pattern: /\b(liquid[\s-]?dnb|liquid[\s-]?drum[\s&-]?(?:and|n)[\s-]?bass)\b/i, genres: ['LIQUID-DNB'] },
    { pattern: /\b(neurofunk)\b/i, genres: ['NEUROFUNK'] },
    { pattern: /\b(dubstep)\b/i, genres: ['DUBSTEP'] },
    { pattern: /\b(uk[\s-]?garage|2[\s-]?step)\b/i, genres: ['UK-GARAGE'] },
    { pattern: /\b(jungle)\b/i, genres: ['JUNGLE'] },
    { pattern: /\b(breakbeat|breaks)\b/i, genres: ['BREAKBEAT'] },
    { pattern: /\b(footwork|juke)\b/i, genres: ['FOOTWORK'] },
    
    // Simple trance
    { pattern: /\b(trance)\b/i, genres: ['TRANCE'] },
    { pattern: /\b(psy|goa)\b/i, genres: ['PSYTRANCE'] },
    
    // Hardcore styles
    { pattern: /\b(hardcore)\b/i, genres: ['HARDCORE'] },
    { pattern: /\b(hardstyle)\b/i, genres: ['HARDSTYLE'] },
    { pattern: /\b(gabber)\b/i, genres: ['GABBER'] },
    { pattern: /\b(hard[\s-]?dance)\b/i, genres: ['HARD-DANCE'] },
    
    // Other electronic
    { pattern: /\b(ambient)\b/i, genres: ['AMBIENT'] },
    { pattern: /\b(experimental)\b/i, genres: ['EXPERIMENTAL'] },
    { pattern: /\b(industrial)\b/i, genres: ['INDUSTRIAL'] },
    { pattern: /\b(idm|intelligent)\b/i, genres: ['IDM'] },
    { pattern: /\b(downtempo)\b/i, genres: ['DOWNTEMPO'] },
    { pattern: /\b(trip[\s-]?hop)\b/i, genres: ['TRIP-HOP'] },
    { pattern: /\b(electro)(?![\s-]?house)\b/i, genres: ['ELECTRO'] },
    { pattern: /\b(disco)(?![\s-]?house)\b/i, genres: ['DISCO'] },
    { pattern: /\b(italo[\s-]?disco|italo)\b/i, genres: ['ITALO-DISCO'] },
    { pattern: /\b(acid)(?![\s-]?house|[\s-]?techno)\b/i, genres: ['ACID'] },
    { pattern: /\b(dub)(?![\s-]?step|[\s-]?techno)\b/i, genres: ['DUB'] },
    { pattern: /\b(trap)\b/i, genres: ['TRAP'] },
    { pattern: /\b(future)(?![\s-]?house)\b/i, genres: ['FUTURE'] },
    { pattern: /\b(synth[\s-]?wave|new[\s-]?wave|dark[\s-]?wave|wave)\b/i, genres: ['WAVE'] },
    { pattern: /\b(minimal)(?![\s-]?techno)\b/i, genres: ['MINIMAL'] },
    { pattern: /\b(progressive)(?![\s-]?house|[\s-]?trance)\b/i, genres: ['PROGRESSIVE'] },
    { pattern: /\b(melodic)(?![\s-]?techno)\b/i, genres: ['MELODIC'] },
    { pattern: /\b(organic)(?![\s-]?house)\b/i, genres: ['ORGANIC'] },
    { pattern: /\b(dark)(?![\s-]?wave)\b/i, genres: ['DARK'] },
    { pattern: /\b(bass)(?![\s-]?house)\b/i, genres: ['BASS'] },
    
    // Non-electronic genres
    { pattern: /\b(jazz)\b/i, genres: ['JAZZ'] },
    { pattern: /\b(classical)\b/i, genres: ['CLASSICAL'] },
    { pattern: /\b(rock)\b/i, genres: ['ROCK'] },
    { pattern: /\b(pop)\b/i, genres: ['POP'] },
    { pattern: /\b(soul)\b/i, genres: ['SOUL'] },
    { pattern: /\b(funk)\b/i, genres: ['FUNK'] },
    { pattern: /\b(hip[\s-]?hop|rap)\b/i, genres: ['HIP-HOP'] },
    { pattern: /\b(r&b|rnb|rhythm)\b/i, genres: ['R&B'] },
    { pattern: /\b(reggae|dub)\b/i, genres: ['REGGAE'] },
    { pattern: /\b(world)\b/i, genres: ['WORLD'] },
    { pattern: /\b(folk)\b/i, genres: ['FOLK'] },
    { pattern: /\b(blues)\b/i, genres: ['BLUES'] },
    { pattern: /\b(metal)\b/i, genres: ['METAL'] },
    { pattern: /\b(punk)\b/i, genres: ['PUNK'] },
    { pattern: /\b(indie)\b/i, genres: ['INDIE'] },
    { pattern: /\b(alternative|alt)\b/i, genres: ['ALTERNATIVE'] },
    { pattern: /\b(electronic)\b/i, genres: ['ELECTRONIC'] }
  ];
  
  // Check each pattern against the text
  for (const { pattern, genres } of genrePatterns) {
    if (pattern.test(textLower)) {
      for (const genre of genres) {
        if (!foundGenres.includes(genre)) {
          foundGenres.push(genre);
        }
      }
    }
  }
  
  return foundGenres;
};

// Extract genres from artist subtitle (fallback approach)
const extractGenres = (subtitle: string | null): string[] => {
  if (!subtitle) return ['ELECTRONIC'];
  
  const genres = extractGenresFromText(subtitle);
  
  if (genres.length === 0) {
    return ['ELECTRONIC'];
  }
  
  return genres.slice(0, 4);
};

// Extract genres from artist's events (categories, event_type, and subtitle)
const extractGenresFromEvents = (artistsEvents: DBEvent[]): string[] => {
  if (!artistsEvents || artistsEvents.length === 0) return ['ELECTRONIC'];
  
  // Combine all text fields that might contain genre information
  const allText: string[] = [];
  for (const event of artistsEvents) {
    if (event.categories) allText.push(event.categories);
    if (event.event_type) allText.push(event.event_type);
    if (event.subtitle) allText.push(event.subtitle);
    if (event.title) allText.push(event.title);
  }
  
  const combinedText = allText.join(' ');
  if (!combinedText) return ['ELECTRONIC'];
  
  // Use the shared genre extraction function
  const genres = extractGenresFromText(combinedText);
  
  if (genres.length === 0) {
    return ['ELECTRONIC'];
  }
  
  return genres.slice(0, 4);
};

// Artist Card Component
const ArtistCard = ({ artist, index, events, artistEvents }: { 
  artist: DBArtist; 
  index: number;
  events: DBEvent[];
  artistEvents: any[];
}) => {
  const flag = getFlagFromCountryName(artist.country_label || '');
  const [expanded, setExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Find artist's events
  const artistEventIds = artistEvents
    .filter(ae => ae.artist_id === artist.id)
    .map(ae => ae.event_id);
  
  const artistsEvents = events
    .filter(event => artistEventIds.includes(event.id))
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  
  // Use all_genres from artist table, or primary_genres as fallback, or extract from events
  let allGenres: string[] = [];
  if (artist.all_genres && artist.all_genres.length > 0) {
    allGenres = artist.all_genres.split(' | ').slice(0, 3);
  } else if (artist.primary_genres) {
    allGenres = artist.primary_genres.split(' | ').slice(0, 3);
  } else {
    // Fallback to extracting from events
    allGenres = extractGenresFromEvents(artistsEvents);
    // If only got ELECTRONIC from events, try artist subtitle as fallback
    if (allGenres.length === 1 && allGenres[0] === 'ELECTRONIC' && artist.subtitle) {
      const subtitleGenres = extractGenres(artist.subtitle);
      if (subtitleGenres.length > 0 && subtitleGenres[0] !== 'ELECTRONIC') {
        allGenres = subtitleGenres;
      }
    }
  }
  
  // Parse sound descriptors
  const soundDescriptors = useMemo(() => {
    if (artist.sound_descriptor) {
      return artist.sound_descriptor.split(', ').slice(0, 4);
    }
    return [];
  }, [artist.sound_descriptor]);
  
  const hasEvents = artistsEvents.length > 0;
  const earliestEvent = artistsEvents[0];
  const eventCount = artistsEvents.length;
  
  const togglePlay = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        // Pause all other audio elements
        document.querySelectorAll('audio').forEach(audio => {
          if (audio !== audioRef.current) {
            audio.pause();
          }
        });
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const handleEnded = () => setIsPlaying(false);
      const handlePause = () => setIsPlaying(false);
      const handlePlay = () => setIsPlaying(true);
      
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('play', handlePlay);
      
      return () => {
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('play', handlePlay);
      };
    }
  }, []);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        delay: index * 0.02,
        duration: 0.3,
      }}
      className="group"
    >
      <div className="space-y-2">
        {/* Terminal-style card with double border */}
        <div className="aspect-square bg-black border-2 border-primary/30 group-hover:border-primary transition-all duration-200 relative p-1">
          <div className="w-full h-full border border-primary/20 group-hover:border-primary/50 overflow-hidden relative bg-black">
            {/* Terminal header bar */}
            <div className="absolute top-0 left-0 right-0 h-4 bg-primary/30 border-b border-primary/40 z-10 flex items-center px-2 gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-[7px] font-mono text-primary ml-2 uppercase">SYS://ARTIST.DB</span>
            </div>
            
            {/* Scan lines effect */}
            <div className="absolute inset-0 bg-[linear-gradient(0deg,transparent_24%,rgba(32,255,77,0.1)_25%,rgba(32,255,77,0.1)_26%,transparent_27%,transparent_74%,rgba(32,255,77,0.1)_75%,rgba(32,255,77,0.1)_76%,transparent_77%,transparent)] bg-[length:100%_8px] group-hover:bg-[length:100%_6px] transition-all pointer-events-none" />
            
            {/* Terminal grid overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(32,255,77,0.02)_1px,transparent_1px),linear-gradient(rgba(32,255,77,0.02)_1px,transparent_1px)] bg-[size:10px_10px] pointer-events-none" />
          
            {artist.image_url ? (
              <div className="relative w-full h-full pt-4">
                <img 
                  src={artist.image_url} 
                  alt={artist.title}
                  className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-200 grayscale-[20%] group-hover:grayscale-0"
                />
                {/* Terminal overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent mix-blend-overlay pointer-events-none" />
                {/* CRT TV effect overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_0%,rgba(0,0,0,0.4)_100%)] pointer-events-none" />
              </div>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-black to-primary/10 flex items-center justify-center pt-4">
                <Mic2 className="h-16 w-16 text-primary/30 group-hover:text-primary/50 transition-colors duration-200" />
              </div>
            )}
            
            {/* Terminal status indicator */}
            <div className="absolute bottom-2 left-2 z-10">
              <span className="text-[8px] text-primary/50 group-hover:text-primary font-mono animate-pulse transition-colors">
                ▶ LIVE
              </span>
            </div>
            
            {/* Popularity indicator */}
            {artist.popularity && artist.popularity > 0 && (
              <div className="absolute top-2 right-2 z-10 bg-black/80 backdrop-blur-sm border border-primary/40 px-2 py-1">
                <span className="text-[10px] text-primary font-mono">
                  ♦ {artist.popularity}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Combined info section below image - terminal style */}
        <div className="bg-black border-2 border-primary/30 group-hover:border-primary transition-colors relative">
          {/* Artist info */}
          <div className="p-2 border-b border-primary/30">
            <h3 className="font-mono text-xs text-primary line-clamp-1 uppercase tracking-wide">
              &gt; {artist.title}
            </h3>
            {artist.country_label && (
              <p className="font-mono text-[10px] text-primary/80 mt-1 flex items-center">
                {flag && <span className="mr-1">{flag}</span>}
                <span className="uppercase">{artist.country_label}</span>
              </p>
            )}
            {/* Genre tags section - always visible */}
            <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-primary/20">
              <span className="text-[8px] text-primary/60 font-mono uppercase mr-1">&gt;_</span>
              {allGenres.map((genre, i) => (
                <span 
                  key={i}
                  className="text-[9px] px-2 py-1 bg-black border border-primary text-primary font-mono uppercase tracking-wide group-hover:bg-primary/20 transition-all"
                >
                  {genre}
                </span>
              ))}
            </div>
            
            {/* Audio Player - Minimal Terminal Style */}
            {artist.top_track_player_url && (
              <div className="mt-2 pt-2 border-t border-primary/20">
                {/* Hidden audio element */}
                <audio ref={audioRef} src={artist.top_track_player_url} preload="none" />
                
                {/* Player UI */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={togglePlay}
                    className="flex items-center justify-center w-7 h-7 border border-primary bg-black hover:bg-primary/20 transition-all group/play"
                  >
                    {isPlaying ? (
                      <svg 
                        className="w-3 h-3 text-primary" 
                        fill="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <rect x="6" y="4" width="4" height="16" />
                        <rect x="14" y="4" width="4" height="16" />
                      </svg>
                    ) : (
                      <svg 
                        className="w-3 h-3 text-primary" 
                        fill="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>
                  
                  <div className="flex-1">
                    <div className="h-3 bg-black border border-primary/30 relative overflow-hidden">
                      {/* Waveform animation when playing */}
                      {isPlaying && (
                        <div className="absolute inset-0 flex items-center justify-center gap-[1px]">
                          {[...Array(12)].map((_, i) => (
                            <motion.div
                              key={i}
                              className="w-[2px] bg-primary/80"
                              animate={{
                                height: ['40%', '100%', '60%', '80%', '40%'],
                              }}
                              transition={{
                                repeat: Infinity,
                                duration: 1 + i * 0.1,
                                ease: "linear",
                              }}
                            />
                          ))}
                        </div>
                      )}
                      {/* Static waveform when paused */}
                      {!isPlaying && (
                        <div className="absolute inset-0 flex items-center justify-center gap-[1px]">
                          {[...Array(12)].map((_, i) => (
                            <div
                              key={i}
                              className="w-[2px] bg-primary/30"
                              style={{ height: `${30 + (i % 3) * 20}%` }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {artist.top_track_name && (
                      <p className="text-[7px] text-primary/60 font-mono mt-1 uppercase truncate">
                        {isPlaying ? '▶ ' : ''}{artist.top_track_name}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Sound Descriptors as Tags */}
                {soundDescriptors.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="text-[7px] text-primary/50 font-mono uppercase">▼</span>
                    {soundDescriptors.map((descriptor: string, i: number) => (
                      <span 
                        key={i}
                        className="text-[8px] px-1.5 py-0.5 bg-primary/10 border border-primary/30 text-primary/70 font-mono lowercase"
                      >
                        {descriptor}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Event info - integrated into same box */}
          {hasEvents ? (
            <>
              {/* First event */}
              <div className="p-2 bg-black">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-mono text-[10px] text-primary uppercase">
                      <Clock className="inline h-3 w-3 mr-1" />
                      {new Date(earliestEvent.start_date).toLocaleDateString('en', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                      {' • '}
                      {new Date(earliestEvent.start_date).toLocaleTimeString('en', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      })}
                    </p>
                    <p className="font-mono text-[9px] text-primary/90 mt-0.5 line-clamp-1">
                      <MapPin className="inline h-3 w-3 mr-1" />
                      {earliestEvent.venue_name || 'TBA'}
                    </p>
                  </div>
                  {eventCount > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpanded(!expanded);
                      }}
                      className="text-[9px] px-2 py-1 bg-primary/20 text-primary font-mono uppercase border border-primary hover:bg-primary/30 transition-all"
                    >
                      {expanded ? '[-]' : `[+${eventCount - 1}]`}
                    </button>
                  )}
                </div>
              </div>
              
              {/* Expanded events */}
              <AnimatePresence>
                {expanded && eventCount > 1 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden border-t border-primary/30"
                  >
                    <div className="p-2 space-y-2 bg-black">
                      {artistsEvents.slice(1).map((event, i) => (
                        <div key={event.id} className="text-[9px] font-mono border-l-2 border-primary pl-2">
                          <p className="text-primary">
                            {new Date(event.start_date).toLocaleDateString('en', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            })}
                            {' • '}
                            {new Date(event.start_date).toLocaleTimeString('en', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false
                            })}
                          </p>
                          <p className="text-primary/90 line-clamp-1">
                            @ {event.venue_name || 'TBA'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            /* No events status */
            <div className="p-2 bg-black">
              <span className="text-primary/70 font-mono text-[9px]">
                &gt;_ NO EVENTS SCHEDULED
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Main Homepage Component  
export default function HomePage() {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [selectedVenue, setSelectedVenue] = useState<string>('all');
  const [selectedEventType, setSelectedEventType] = useState<string>('all');
  const [minPopularity, setMinPopularity] = useState<number>(0);
  const [maxPopularity, setMaxPopularity] = useState<number>(100);
  const [minBpm, setMinBpm] = useState<number>(60);
  const [maxBpm, setMaxBpm] = useState<number>(200);
  const [showOnlyWithEvents, setShowOnlyWithEvents] = useState(false);
  const [showOnlyWithSpotify, setShowOnlyWithSpotify] = useState(false);
  const [sortBy, setSortBy] = useState<'popularity' | 'name' | 'events' | 'date'>('popularity');
  
  // Search states for dropdowns
  const [genreSearch, setGenreSearch] = useState('');
  const [venueSearch, setVenueSearch] = useState('');
  const [eventTypeSearch, setEventTypeSearch] = useState('');
  const [dateSearch, setDateSearch] = useState('');
  const [displayedArtists, setDisplayedArtists] = useState<DBArtist[]>([]);
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  const [availableVenues, setAvailableVenues] = useState<string[]>([]);
  const [availableEventTypes, setAvailableEventTypes] = useState<string[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [artistsOffset, setArtistsOffset] = useState(0);
  const [hasMoreArtists, setHasMoreArtists] = useState(true);
  const [isFilteredMode, setIsFilteredMode] = useState(false);

  const ARTISTS_PER_BATCH = 24;
  
  const { scrollYProgress } = useScroll();
  const headerY = useTransform(scrollYProgress, [0, 0.1], [0, -50]);
  const headerOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Load more artists when scrolling or clicking Load More
  const loadMoreArtists = useCallback(async () => {
    if (!isSupabaseConfigured() || loadingMore || !hasMoreArtists || isFilteredMode) {
      return;
    }

    setLoadingMore(true);
    try {
      const { data: moreArtists, count } = await supabase
        .from('artists')
        .select('*', { count: 'exact' })
        .order('popularity', { ascending: false, nullsFirst: false })
        .order('first_seen_at', { ascending: false })
        .range(artistsOffset, artistsOffset + ARTISTS_PER_BATCH - 1);
      
      if (moreArtists && moreArtists.length > 0) {
        // Update statistics with new artists
        setStatistics(prev => {
          if (!prev) return prev;
          
          // Extract genres and countries from new artists
          const newGenres = new Set(prev.genres);
          const newCountries = new Set(prev.countries);
          
          moreArtists.forEach(artist => {
            if (artist.subtitle) {
              const possibleGenres = artist.subtitle.toLowerCase().split(/[,\s]+/);
              possibleGenres.forEach((g: string) => {
                if (g.length > 3) newGenres.add(g);
              });
            }
            if (artist.country_label) {
              newCountries.add(artist.country_label);
            }
          });
          
          return {
            ...prev,
            allArtists: [...prev.allArtists, ...moreArtists],
            genres: Array.from(newGenres).slice(0, 20),
            countries: Array.from(newCountries).sort(),
            totalCountries: newCountries.size
          };
        });
        
        // Add to displayed artists
        setDisplayedArtists(prev => [...prev, ...moreArtists]);
        setArtistsOffset(prev => prev + ARTISTS_PER_BATCH);
        
        // Check if there are more to load
        const totalCount = count || 0;
        setHasMoreArtists(artistsOffset + ARTISTS_PER_BATCH < totalCount);
      } else {
        setHasMoreArtists(false);
      }
    } catch (error) {
      console.error('Error loading more artists:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMoreArtists, isFilteredMode, artistsOffset]);

  useEffect(() => {
    loadAllData();
  }, []);

  // Intersection Observer for auto-loading more artists on scroll
  useEffect(() => {
    if (!loadMoreRef.current || isFilteredMode || !hasMoreArtists) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) {
          loadMoreArtists();
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    observer.observe(loadMoreRef.current);
    
    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [hasMoreArtists, loadingMore, isFilteredMode, loadMoreArtists]);

  const loadAllData = async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      // Load INITIAL batch of artists with lazy loading
      const { data: initialArtists, count: totalArtistsCount } = await supabase
        .from('artists')
        .select('*', { count: 'exact' })
        .order('popularity', { ascending: false, nullsFirst: false })
        .order('first_seen_at', { ascending: false })
        .range(0, ARTISTS_PER_BATCH - 1);
      
      const allArtists = initialArtists || [];
      setArtistsOffset(ARTISTS_PER_BATCH);
      setHasMoreArtists(allArtists.length === ARTISTS_PER_BATCH && (totalArtistsCount || 0) > ARTISTS_PER_BATCH);

      // Load ALL events
      let allEvents: DBEvent[] = [];
      let eventsOffset = 0;
      const eventsLimit = 1000;
      let hasMoreEvents = true;
      
      while (hasMoreEvents) {
        const { data: batch } = await supabase
          .from('events')
          .select('*')
          .order('start_date', { ascending: true })
          .range(eventsOffset, eventsOffset + eventsLimit - 1);
        
        if (batch && batch.length > 0) {
          allEvents = [...allEvents, ...batch];
          eventsOffset += eventsLimit;
          if (batch.length < eventsLimit) hasMoreEvents = false;
        } else {
          hasMoreEvents = false;
        }
      }

      // Load ALL artist-event relationships
      let allArtistEvents: any[] = [];
      let aeOffset = 0;
      const aeLimit = 1000;
      let hasMoreAE = true;
      
      while (hasMoreAE) {
        const { data: batch } = await supabase
          .from('artist_events')
          .select('*')
          .range(aeOffset, aeOffset + aeLimit - 1);
        
        if (batch && batch.length > 0) {
          allArtistEvents = [...allArtistEvents, ...batch];
          aeOffset += aeLimit;
          if (batch.length < aeLimit) hasMoreAE = false;
        } else {
          hasMoreAE = false;
        }
      }

      // Load latest events
      const latestEvents = [...allEvents]
        .sort((a, b) => new Date(b.first_seen_at || b.start_date).getTime() - new Date(a.first_seen_at || a.start_date).getTime())
        .slice(0, 12);

      // Load upcoming events
      const now = new Date().toISOString();
      const upcomingEvents = allEvents
        .filter(event => event.start_date >= now)
        .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
        .slice(0, 8);

      // Get statistics from loaded data
      const artistCount = allArtists.length;
      const eventCount = allEvents.length;
      const linkCount = allArtistEvents.length;

      // Get venues
      // Calculate top venues from loaded events
      const venueCount = new Map<string, { count: number; type?: string }>();
      allEvents.forEach(event => {
          if (event.venue_name) {
          const existing = venueCount.get(event.venue_name) || { count: 0, type: event.event_type || undefined };
          venueCount.set(event.venue_name, {
            count: existing.count + 1,
            type: event.event_type || undefined
          });
          }
        });
        
        const topVenues = Array.from(venueCount.entries())
        .map(([venue, data]) => ({ venue, ...data }))
          .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      // Extract unique genres from initial artists (simplified approach)
      const genres = new Set<string>();
      allArtists.forEach(artist => {
        if (artist.subtitle) {
          // Simple genre extraction - you might want to improve this
          const possibleGenres = artist.subtitle.toLowerCase().split(/[,\s]+/);
          possibleGenres.forEach((g: string) => {
            if (g.length > 3) genres.add(g);
          });
        }
      });

      // Get unique countries from initial batch (we'll get more as we load)
      const countries = new Set(allArtists.map(a => a.country_label).filter((c): c is string => Boolean(c)));

      // Get events by date
      const { data: eventDates } = await supabase
        .from('events')
        .select('start_date')
        .order('start_date')
        .limit(7);

        const dateCount = new Map<string, number>();
      eventDates?.forEach(event => {
          const date = new Date(event.start_date).toLocaleDateString();
          dateCount.set(date, (dateCount.get(date) || 0) + 1);
        });
        
        const eventsByDate = Array.from(dateCount.entries())
        .map(([date, count]) => ({ date, count }));

        // Extract all unique genres from artists
      const allUniqueGenres = new Set<string>();
      allArtists.forEach(artist => {
        const artistEventIds = allArtistEvents
          .filter(ae => ae.artist_id === artist.id)
          .map(ae => ae.event_id);
        const artistsEvents = allEvents.filter(event => artistEventIds.includes(event.id));
        const artistGenres = extractGenresFromEvents(artistsEvents);
        
        // If only ELECTRONIC, try subtitle
        if (artistGenres.length === 1 && artistGenres[0] === 'ELECTRONIC' && artist.subtitle) {
          const subtitleGenres = extractGenres(artist.subtitle);
          if (subtitleGenres.length > 0) {
            subtitleGenres.forEach((g: string) => allUniqueGenres.add(g));
          } else {
            artistGenres.forEach((g: string) => allUniqueGenres.add(g));
          }
        } else {
          artistGenres.forEach((g: string) => allUniqueGenres.add(g));
        }
      });

      setAvailableGenres(Array.from(allUniqueGenres).sort());

      // Extract unique venues, event types, and dates
      const uniqueVenues = new Set<string>();
      const uniqueEventTypes = new Set<string>();
      const uniqueDates = new Set<string>();
      
      allEvents.forEach(event => {
        if (event.venue_name) uniqueVenues.add(event.venue_name);
        if (event.event_type) uniqueEventTypes.add(event.event_type);
        const eventDate = new Date(event.start_date).toLocaleDateString('en-CA');
        uniqueDates.add(eventDate);
      });
      
      setAvailableVenues(Array.from(uniqueVenues).sort());
      setAvailableEventTypes(Array.from(uniqueEventTypes).sort());
      setAvailableDates(Array.from(uniqueDates).sort());

      // Debug: Log popularity distribution
      // Artists are already sorted by the database
      const popularityStats = allArtists.reduce((acc, artist) => {
        if (artist.popularity !== null && artist.popularity !== undefined) {
          acc.withPopularity++;
          acc.maxPopularity = Math.max(acc.maxPopularity, artist.popularity);
          acc.minPopularity = Math.min(acc.minPopularity, artist.popularity);
        } else {
          acc.withoutPopularity++;
        }
        return acc;
      }, { withPopularity: 0, withoutPopularity: 0, maxPopularity: 0, minPopularity: 100 });
      
      console.log('=== ARTIST SORTING DEBUG ===');
      console.log('Popularity Stats:', popularityStats);
      console.log('Total artists loaded:', allArtists.length);
      console.log('First 30 artists (as returned by DB):', allArtists.slice(0, 30).map(a => ({ 
        name: a.title, 
        popularity: a.popularity 
      })));
      console.log('Artists should be sorted by: popularity DESC (nulls last), then first_seen_at DESC');

      setStatistics({
        totalArtists: totalArtistsCount || artistCount || 0,
        totalEvents: eventCount || 0,
        totalLinks: linkCount || 0,
          totalCountries: countries.size,
          topVenues,
        eventsByDate,
        allArtists,  // Initial batch only for lazy loading
        allEvents,
        allArtistEvents,
        latestEvents: latestEvents || [],
        upcomingEvents: upcomingEvents || [],
        genres: Array.from(genres).slice(0, 20),
        countries: Array.from(countries).sort()
      });

      // Display initial artists (already in sorted order from DB)
      setDisplayedArtists(allArtists);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle filtering - when filters change, load filtered results from DB
  useEffect(() => {
    if (!statistics) return;
    
    // Check if any filters are active
    const hasFilters = searchTerm || 
                      selectedCountry !== 'all' || 
                      selectedGenre !== 'all' || 
                      selectedDate !== 'all' ||
                      selectedVenue !== 'all' ||
                      selectedEventType !== 'all' ||
                      minPopularity > 0 ||
                      maxPopularity < 100 ||
                      minBpm !== 60 ||
                      maxBpm !== 200 ||
                      showOnlyWithEvents ||
                      showOnlyWithSpotify ||
                      sortBy !== 'popularity';
    
    if (!hasFilters) {
      // No filters - use loaded artists
      setIsFilteredMode(false);
      setDisplayedArtists(statistics.allArtists);
      setHasMoreArtists(statistics.totalArtists > statistics.allArtists.length);
    } else {
      // Perform server-side filtering for better search experience
      loadFilteredArtists();
    }
  }, [searchTerm, selectedCountry, selectedGenre, selectedDate, selectedVenue, selectedEventType, 
      minPopularity, maxPopularity, minBpm, maxBpm, showOnlyWithEvents, showOnlyWithSpotify, sortBy, statistics]);

  // Load filtered artists from database
  const loadFilteredArtists = async () => {
    if (!isSupabaseConfigured() || !statistics) return;
    
    setIsFilteredMode(true);
    setLoadingMore(true);
    
    try {
      // Build query with filters
      let query = supabase
        .from('artists')
        .select('*', { count: 'exact' })
        .order('popularity', { ascending: false, nullsFirst: false })
        .order('first_seen_at', { ascending: false });
      
      // Apply search filter
      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,subtitle.ilike.%${searchTerm}%`);
      }
      
      // Apply country filter
      if (selectedCountry !== 'all') {
        query = query.eq('country_label', selectedCountry);
      }
      
      // For genre and date filters, we need to handle them differently
      // since they require joining with events data
      
      const { data: filteredArtists, count } = await query.limit(100);
      
      if (filteredArtists) {
        let finalFiltered = filteredArtists;
        
        // Apply genre filter (client-side for now, since it requires event data)
        if (selectedGenre !== 'all') {
          finalFiltered = finalFiltered.filter(artist => {
            // Check all_genres field first
            if (artist.all_genres) {
              const genres = artist.all_genres.split(' | ');
              if (genres.some((g: string) => g.toUpperCase() === selectedGenre.toUpperCase())) {
                return true;
              }
            }
            
            // Then check primary_genres
            if (artist.primary_genres) {
              const genres = artist.primary_genres.split(' | ');
              if (genres.some((g: string) => g.toUpperCase() === selectedGenre.toUpperCase())) {
                return true;
              }
            }
            
            // Fall back to event-based genre extraction
            const artistEventIds = statistics.allArtistEvents
              .filter(ae => ae.artist_id === artist.id)
              .map(ae => ae.event_id);
            const artistsEvents = statistics.allEvents.filter(event => artistEventIds.includes(event.id));
            let artistGenres = extractGenresFromEvents(artistsEvents);
            
            if (artistGenres.length === 1 && artistGenres[0] === 'ELECTRONIC' && artist.subtitle) {
              const subtitleGenres = extractGenres(artist.subtitle);
              if (subtitleGenres.length > 0) {
                artistGenres = subtitleGenres;
              }
            }
            
            return artistGenres.includes(selectedGenre);
          });
        }
        
        // Apply date filter (client-side for now)
        if (selectedDate !== 'all') {
          finalFiltered = finalFiltered.filter(artist => {
            const artistEventIds = statistics.allArtistEvents
              .filter(ae => ae.artist_id === artist.id)
              .map(ae => ae.event_id);
            const artistsEvents = statistics.allEvents.filter(event => artistEventIds.includes(event.id));
            
            if (artistsEvents.length === 0) return false;
            
            return artistsEvents.some(event => {
              const eventDate = new Date(event.start_date).toLocaleDateString('en-CA');
              return eventDate === selectedDate;
            });
          });
        }
        
        // Apply venue filter
        if (selectedVenue !== 'all') {
          finalFiltered = finalFiltered.filter(artist => {
            const artistEventIds = statistics.allArtistEvents
              .filter(ae => ae.artist_id === artist.id)
              .map(ae => ae.event_id);
            const artistsEvents = statistics.allEvents.filter(event => artistEventIds.includes(event.id));
            
            return artistsEvents.some(event => event.venue_name === selectedVenue);
          });
        }
        
        // Apply event type filter
        if (selectedEventType !== 'all') {
          finalFiltered = finalFiltered.filter(artist => {
            const artistEventIds = statistics.allArtistEvents
              .filter(ae => ae.artist_id === artist.id)
              .map(ae => ae.event_id);
            const artistsEvents = statistics.allEvents.filter(event => artistEventIds.includes(event.id));
            
            return artistsEvents.some(event => event.event_type === selectedEventType);
          });
        }
        
        // Apply popularity filter
        if (minPopularity > 0 || maxPopularity < 100) {
          finalFiltered = finalFiltered.filter(artist => {
            const popularity = artist.popularity || 0;
            return popularity >= minPopularity && popularity <= maxPopularity;
          });
        }
        
        // Apply BPM filter
        if (minBpm !== 60 || maxBpm !== 200) {
          finalFiltered = finalFiltered.filter(artist => {
            const bpm = artist.tempo_bpm_mean;
            if (!bpm) return false; // Exclude artists without BPM data when BPM filter is active
            return bpm >= minBpm && bpm <= maxBpm;
          });
        }
        
        // Filter by "has events"
        if (showOnlyWithEvents) {
          finalFiltered = finalFiltered.filter(artist => {
            const artistEventIds = statistics.allArtistEvents
              .filter(ae => ae.artist_id === artist.id)
              .map(ae => ae.event_id);
            return artistEventIds.length > 0;
          });
        }
        
        // Filter by "has Spotify"
        if (showOnlyWithSpotify) {
          finalFiltered = finalFiltered.filter(artist => 
            artist.spotify_id && artist.top_track_player_url
          );
        }
        
        // Apply sorting
        if (sortBy === 'name') {
          finalFiltered.sort((a, b) => a.title.localeCompare(b.title));
        } else if (sortBy === 'events') {
          finalFiltered.sort((a, b) => {
            const aEvents = statistics.allArtistEvents.filter(ae => ae.artist_id === a.id).length;
            const bEvents = statistics.allArtistEvents.filter(ae => ae.artist_id === b.id).length;
            return bEvents - aEvents;
          });
        } else if (sortBy === 'date') {
          finalFiltered.sort((a, b) => {
            const aEventIds = statistics.allArtistEvents
              .filter(ae => ae.artist_id === a.id)
              .map(ae => ae.event_id);
            const bEventIds = statistics.allArtistEvents
              .filter(ae => ae.artist_id === b.id)
              .map(ae => ae.event_id);
            
            const aEvents = statistics.allEvents.filter(event => aEventIds.includes(event.id));
            const bEvents = statistics.allEvents.filter(event => bEventIds.includes(event.id));
            
            const aEarliest = aEvents.length > 0 ? 
              Math.min(...aEvents.map(e => new Date(e.start_date).getTime())) : 
              Infinity;
            const bEarliest = bEvents.length > 0 ? 
              Math.min(...bEvents.map(e => new Date(e.start_date).getTime())) : 
              Infinity;
            
            return aEarliest - bEarliest;
          });
        }
        
        setDisplayedArtists(finalFiltered);
        setHasMoreArtists(false); // Disable load more in filtered mode
      }
    } catch (error) {
      console.error('Error loading filtered artists:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleShuffle = () => {
    if (!statistics) return;
    setIsFilteredMode(true); // Shuffle mode is essentially a filter
    const shuffled = [...statistics.allArtists].sort(() => Math.random() - 0.5);
    setDisplayedArtists(shuffled);
    setHasMoreArtists(false); // Disable load more in shuffle mode
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background relative">
        <AnimatedBackground />
        <div className="relative z-10 container mx-auto px-4 py-8">
          <div className="space-y-8">
            <Skeleton className="h-96 w-full" />
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[...Array(12)].map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Database Not Configured</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Please configure your Supabase credentials to view the data.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <AnimatedBackground />
      
      {/* Hero Section with Artists */}
      <section className="relative z-10 min-h-screen px-2 sm:px-4 lg:px-6 pt-20 pb-12">
        <div className="w-full max-w-[1600px] mx-auto">
          {/* Header */}
      <motion.div 
            style={{
              y: headerY,
              opacity: headerOpacity
            }}
            className="text-center mb-12"
          >
        <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-6"
            >
              {/* Logo */}
              <div className="flex items-center justify-center gap-4 mb-6">
                <Disc3 className="h-12 w-12 text-primary animate-spin-slow" />
                <div>
                  <h1 className="text-6xl md:text-7xl font-black bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent animate-gradient">
                    ADE 2025
                  </h1>
                  <p className="text-lg md:text-xl text-muted-foreground">
                    Amsterdam Dance Event
                  </p>
                </div>
                <Disc3 className="h-12 w-12 text-secondary animate-spin-slow" />
          </div>

              {/* Stats Bar */}
        {statistics && (
                <div className="flex flex-wrap justify-center gap-6 text-sm md:text-base">
                  <div className="flex items-center gap-2">
                    <Music2 className="h-5 w-5 text-primary" />
                    <span className="font-bold text-primary">
                      <AnimatedCounter value={statistics.totalArtists} />
                    </span>
                    <span className="text-muted-foreground">Artists</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-accent" />
                    <span className="font-bold text-accent">
                      <AnimatedCounter value={statistics.totalEvents} />
                    </span>
                    <span className="text-muted-foreground">Events</span>
                </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-secondary" />
                    <span className="font-bold text-secondary">
                      <AnimatedCounter value={statistics.topVenues.length} />
                    </span>
                    <span className="text-muted-foreground">Venues</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe2 className="h-5 w-5 text-chart-2" />
                    <span className="font-bold text-chart-2">
                      <AnimatedCounter value={statistics.totalCountries} />
                    </span>
                    <span className="text-muted-foreground">Countries</span>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>

          {/* Filters Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8 space-y-4"
          >
            {/* Main Filter Row */}
            <div className="flex flex-col md:flex-row gap-4 items-center">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/60" />
                <Input
                  type="text"
                  placeholder="&gt;_ SEARCH DATABASE..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-black/50 backdrop-blur-sm border-primary/30 focus:border-primary/60 font-mono text-xs uppercase tracking-wider placeholder:text-primary/30 text-primary hover:border-primary/50 transition-colors"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <X className="h-4 w-4 text-primary/60 hover:text-primary" />
                  </button>
                )}
              </div>

              {/* Genre Filter with Search */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-[180px] bg-black/50 backdrop-blur-sm border-primary/30 font-mono text-xs uppercase tracking-wider hover:border-primary/50 justify-start"
                  >
                    <Music2 className="h-4 w-4 mr-2 text-primary" />
                    {selectedGenre === 'all' ? 'All Genres' : selectedGenre}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[180px] p-0 bg-black border-primary/30">
                  <div className="p-2 border-b border-primary/20">
                    <Input
                      placeholder="Search genres..."
                      value={genreSearch}
                      onChange={(e) => setGenreSearch(e.target.value)}
                      className="h-8 bg-black/50 border-primary/30 font-mono text-xs"
                    />
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    <button
                      onClick={() => {
                        setSelectedGenre('all');
                        setGenreSearch('');
                      }}
                      className="w-full px-2 py-1.5 text-left hover:bg-primary/10 font-mono text-xs uppercase text-primary"
                    >
                      All Genres
                    </button>
                    {availableGenres
                      .filter(genre => genre.toLowerCase().includes(genreSearch.toLowerCase()))
                      .map(genre => (
                        <button
                          key={genre}
                          onClick={() => {
                            setSelectedGenre(genre);
                            setGenreSearch('');
                          }}
                          className="w-full px-2 py-1.5 text-left hover:bg-primary/10 font-mono text-xs uppercase"
                        >
                          {genre}
                        </button>
                      ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Country Filter */}
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="w-[180px] bg-black/50 backdrop-blur-sm border-primary/30 font-mono text-xs uppercase tracking-wider hover:border-primary/50">
                  <Globe2 className="h-4 w-4 mr-2 text-primary" />
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent className="bg-black border-primary/30 max-h-[300px]">
                  <SelectItem value="all" className="font-mono text-xs uppercase">
                    <span className="text-primary">All Countries</span>
                  </SelectItem>
                  {statistics?.countries.map(country => {
                    const flag = getFlagFromCountryName(country);
                    return (
                      <SelectItem key={country} value={country} className="font-mono text-xs">
                        <span className="flex items-center gap-2">
                          {flag && <span>{flag}</span>}
                          <span className="uppercase">{country}</span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {/* Advanced Filters Toggle */}
              <Button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                variant="outline"
                className="border-primary/20 hover:bg-primary/10"
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Advanced
                {showAdvancedFilters ? <X className="h-4 w-4 ml-2" /> : <ChevronRight className="h-4 w-4 ml-2" />}
              </Button>

              {/* Shuffle Button */}
              <Button
                onClick={handleShuffle}
                variant="outline"
                className="border-primary/20 hover:bg-primary/10"
              >
                <Shuffle className="h-4 w-4 mr-2" />
                Shuffle
              </Button>
            </div>

            {/* Advanced Filters Panel */}
            <AnimatePresence>
              {showAdvancedFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 bg-black/30 backdrop-blur-sm border border-primary/20 rounded-lg space-y-4">
                    {/* Row 1: Venue, Event Type, Date */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Venue Filter with Search */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline" 
                            className="w-full bg-black/50 border-primary/30 font-mono text-xs uppercase hover:border-primary/50 justify-start"
                          >
                            <MapPin className="h-4 w-4 mr-2 text-primary flex-shrink-0" />
                            <span className="truncate">
                              {selectedVenue === 'all' ? 'All Venues' : selectedVenue}
                            </span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0 bg-black border-primary/30">
                          <div className="p-2 border-b border-primary/20">
                            <Input
                              placeholder="Search venues..."
                              value={venueSearch}
                              onChange={(e) => setVenueSearch(e.target.value)}
                              className="h-8 bg-black/50 border-primary/30 font-mono text-xs"
                            />
                          </div>
                          <div className="max-h-[300px] overflow-y-auto">
                            <button
                              onClick={() => {
                                setSelectedVenue('all');
                                setVenueSearch('');
                              }}
                              className="w-full px-2 py-1.5 text-left hover:bg-primary/10 font-mono text-xs uppercase text-primary"
                            >
                              All Venues
                            </button>
                            {availableVenues
                              .filter(venue => venue.toLowerCase().includes(venueSearch.toLowerCase()))
                              .map(venue => (
                                <button
                                  key={venue}
                                  onClick={() => {
                                    setSelectedVenue(venue);
                                    setVenueSearch('');
                                  }}
                                  className="w-full px-2 py-1.5 text-left hover:bg-primary/10 font-mono text-xs truncate"
                                  title={venue}
                                >
                                  {venue}
                                </button>
                              ))}
                          </div>
                        </PopoverContent>
                      </Popover>

                      {/* Event Type Filter */}
                      <Select value={selectedEventType} onValueChange={setSelectedEventType}>
                        <SelectTrigger className="bg-black/50 border-primary/30 font-mono text-xs uppercase hover:border-primary/50">
                          <PartyPopper className="h-4 w-4 mr-2 text-primary" />
                          <SelectValue placeholder="All Event Types" />
                        </SelectTrigger>
                        <SelectContent className="bg-black border-primary/30">
                          <SelectItem value="all" className="font-mono text-xs uppercase">
                            <span className="text-primary">All Event Types</span>
                          </SelectItem>
                          {availableEventTypes.map((type: string) => (
                            <SelectItem key={type} value={type} className="font-mono text-xs">
                              <span className="uppercase">{type}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Date Filter */}
                      <Select value={selectedDate} onValueChange={setSelectedDate}>
                        <SelectTrigger className="bg-black/50 border-primary/30 font-mono text-xs uppercase hover:border-primary/50">
                          <CalendarDays className="h-4 w-4 mr-2 text-primary" />
                          <SelectValue placeholder="All Dates" />
                        </SelectTrigger>
                        <SelectContent className="bg-black border-primary/30 max-h-[300px]">
                          <SelectItem value="all" className="font-mono text-xs uppercase">
                            <span className="text-primary">All Dates</span>
                          </SelectItem>
                          {availableDates.map((date: string) => (
                            <SelectItem key={date} value={date} className="font-mono text-xs">
                              <span>{new Date(date).toLocaleDateString('en', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric'
                              })}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Row 2: Sort By and Toggles */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      {/* Sort By */}
                      <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                        <SelectTrigger className="bg-black/50 border-primary/30 font-mono text-xs uppercase hover:border-primary/50">
                          <TrendingUp className="h-4 w-4 mr-2 text-primary" />
                          <SelectValue placeholder="Sort By" />
                        </SelectTrigger>
                        <SelectContent className="bg-black border-primary/30">
                          <SelectItem value="popularity" className="font-mono text-xs uppercase">
                            <span className="text-primary">By Popularity</span>
                          </SelectItem>
                          <SelectItem value="name" className="font-mono text-xs uppercase">
                            <span className="text-primary">By Name</span>
                          </SelectItem>
                          <SelectItem value="events" className="font-mono text-xs uppercase">
                            <span className="text-primary">By Event Count</span>
                          </SelectItem>
                          <SelectItem value="date" className="font-mono text-xs uppercase">
                            <span className="text-primary">By Event Date</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Toggle Switches */}
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="has-events"
                          checked={showOnlyWithEvents}
                          onCheckedChange={setShowOnlyWithEvents}
                          className="data-[state=checked]:bg-primary"
                        />
                        <Label 
                          htmlFor="has-events" 
                          className="font-mono text-xs uppercase text-primary/80 cursor-pointer"
                        >
                          Has Events
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="has-spotify"
                          checked={showOnlyWithSpotify}
                          onCheckedChange={setShowOnlyWithSpotify}
                          className="data-[state=checked]:bg-primary"
                        />
                        <Label 
                          htmlFor="has-spotify" 
                          className="font-mono text-xs uppercase text-primary/80 cursor-pointer"
                        >
                          Has Spotify
                        </Label>
                      </div>
                    </div>

                    {/* Row 3: Popularity Range */}
                    <div className="space-y-2">
                      <label className="font-mono text-xs uppercase text-primary/80">
                        Popularity Range: {minPopularity} - {maxPopularity}
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={minPopularity}
                          onChange={(e) => setMinPopularity(parseInt(e.target.value))}
                          className="flex-1 accent-primary"
                        />
                        <span className="font-mono text-xs text-primary w-10 text-center">{minPopularity}</span>
                        <span className="font-mono text-xs text-primary">to</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={maxPopularity}
                          onChange={(e) => setMaxPopularity(parseInt(e.target.value))}
                          className="flex-1 accent-primary"
                        />
                        <span className="font-mono text-xs text-primary w-10 text-center">{maxPopularity}</span>
                      </div>
                    </div>

                    {/* Row 4: BPM Range */}
                    <div className="space-y-2">
                      <label className="font-mono text-xs uppercase text-primary/80">
                        BPM Range: {minBpm} - {maxBpm}
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="60"
                          max="200"
                          value={minBpm}
                          onChange={(e) => setMinBpm(parseInt(e.target.value))}
                          className="flex-1 accent-primary"
                        />
                        <span className="font-mono text-xs text-primary w-10 text-center">{minBpm}</span>
                        <span className="font-mono text-xs text-primary">to</span>
                        <input
                          type="range"
                          min="60"
                          max="200"
                          value={maxBpm}
                          onChange={(e) => setMaxBpm(parseInt(e.target.value))}
                          className="flex-1 accent-primary"
                        />
                        <span className="font-mono text-xs text-primary w-10 text-center">{maxBpm}</span>
                      </div>
                    </div>

                    {/* Clear All Filters Button */}
                    <div className="flex justify-end">
                      <Button
                        onClick={() => {
                          setSearchTerm('');
                          setSelectedGenre('all');
                          setSelectedCountry('all');
                          setSelectedDate('all');
                          setSelectedVenue('all');
                          setSelectedEventType('all');
                          setMinPopularity(0);
                          setMaxPopularity(100);
                          setMinBpm(60);
                          setMaxBpm(200);
                          setShowOnlyWithEvents(false);
                          setShowOnlyWithSpotify(false);
                          setSortBy('popularity');
                          setGenreSearch('');
                          setVenueSearch('');
                          setEventTypeSearch('');
                          setDateSearch('');
                        }}
                        variant="outline"
                        className="border-primary/20 hover:bg-primary/10 font-mono text-xs uppercase"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Clear All Filters
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Active Filters */}
            {(searchTerm || selectedCountry !== 'all' || selectedGenre !== 'all' || 
              selectedVenue !== 'all' || selectedEventType !== 'all' || selectedDate !== 'all' ||
              minPopularity > 0 || maxPopularity < 100 || minBpm !== 60 || maxBpm !== 200 || 
              showOnlyWithEvents || showOnlyWithSpotify || sortBy !== 'popularity') && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                {searchTerm && (
                  <Badge variant="secondary" className="gap-1 cursor-default">
                    Search: {searchTerm}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchTerm('');
                      }}
                      className="hover:opacity-70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {selectedGenre !== 'all' && (
                  <Badge variant="secondary" className="gap-1 cursor-default">
                    Genre: {selectedGenre}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedGenre('all');
                      }}
                      className="hover:opacity-70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {selectedCountry !== 'all' && (
                  <Badge variant="secondary" className="gap-1 cursor-default">
                    {selectedCountry}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCountry('all');
                      }}
                      className="hover:opacity-70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {selectedVenue !== 'all' && (
                  <Badge variant="secondary" className="gap-1 cursor-default">
                    Venue: {selectedVenue.substring(0, 20)}...
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedVenue('all');
                      }}
                      className="hover:opacity-70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {selectedEventType !== 'all' && (
                  <Badge variant="secondary" className="gap-1 cursor-default">
                    Type: {selectedEventType}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEventType('all');
                      }}
                      className="hover:opacity-70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {selectedDate !== 'all' && (
                  <Badge variant="secondary" className="gap-1 cursor-default">
                    Date: {new Date(selectedDate).toLocaleDateString('en', {
                      month: 'short',
                      day: 'numeric'
                    })}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDate('all');
                      }}
                      className="hover:opacity-70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {(minPopularity > 0 || maxPopularity < 100) && (
                  <Badge variant="secondary" className="gap-1 cursor-default">
                    Popularity: {minPopularity}-{maxPopularity}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMinPopularity(0);
                        setMaxPopularity(100);
                      }}
                      className="hover:opacity-70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {showOnlyWithEvents && (
                  <Badge variant="secondary" className="gap-1 cursor-default">
                    Has Events
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowOnlyWithEvents(false);
                      }}
                      className="hover:opacity-70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {showOnlyWithSpotify && (
                  <Badge variant="secondary" className="gap-1 cursor-default">
                    Has Spotify
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowOnlyWithSpotify(false);
                      }}
                      className="hover:opacity-70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {sortBy !== 'popularity' && (
                  <Badge variant="secondary" className="gap-1 cursor-default">
                    Sort: {sortBy}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSortBy('popularity');
                      }}
                      className="hover:opacity-70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {(minBpm !== 60 || maxBpm !== 200) && (
                  <Badge variant="secondary" className="gap-1 cursor-default">
                    BPM: {minBpm}-{maxBpm}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMinBpm(60);
                        setMaxBpm(200);
                      }}
                      className="hover:opacity-70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>
            )}
          </motion.div>

          {/* Results Counter */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-primary/60 uppercase">
                Showing
              </span>
              <span className="font-mono text-lg text-primary font-bold">
                {displayedArtists.length}
              </span>
              <span className="font-mono text-sm text-primary/60 uppercase">
                {isFilteredMode 
                  ? 'filtered results' 
                  : `of ${statistics?.totalArtists || 0} Artists`}
              </span>
            </div>
            {/* Loading indicator for infinite scroll */}
            {loadingMore && !isFilteredMode && (
              <div className="flex items-center gap-2 text-primary/60">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="font-mono text-xs uppercase">Loading more...</span>
              </div>
            )}
          </motion.div>

          {/* Artists Grid or Empty State */}
          {displayedArtists.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-3 md:gap-4 lg:gap-5"
            >
              <AnimatePresence mode="popLayout">
                {displayedArtists.map((artist, index) => (
                  <ArtistCard 
                    key={artist.id} 
                    artist={artist} 
                    index={index} 
                    events={statistics?.allEvents || []}
                    artistEvents={statistics?.allArtistEvents || []}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col items-center justify-center py-20 px-4"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 blur-3xl"></div>
                <div className="relative bg-black/60 backdrop-blur-lg border-2 border-primary/40 p-8 text-center space-y-4 max-w-md">
                  <Disc3 className="h-16 w-16 text-primary/60 mx-auto animate-spin-slow" />
                  <h3 className="font-mono text-lg uppercase text-primary">
                    No Artists Found
                  </h3>
                  <p className="font-mono text-sm text-primary/60">
                    Try adjusting your filters or search terms
                  </p>
                  <Button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedGenre('all');
                      setSelectedCountry('all');
                      setSelectedDate('all');
                    }}
                    className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 hover:border-primary/60 font-mono text-xs uppercase"
                  >
                    Clear All Filters
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Loading skeleton for infinite scroll */}
          {loadingMore && !isFilteredMode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-3 md:gap-4 lg:gap-5 mt-4"
            >
              {[...Array(10)].map((_, i) => (
                <div key={`skeleton-${i}`} className="space-y-2">
                  <Skeleton className="aspect-square" />
                  <Skeleton className="h-20" />
                </div>
              ))}
            </motion.div>
          )}

          {/* Load More or Filter Notice */}
          {hasMoreArtists && !isFilteredMode ? (
            <motion.div
              ref={loadMoreRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-12 text-center"
            >
              {!loadingMore && (
                <Button
                  onClick={loadMoreArtists}
                  disabled={loadingMore}
                  size="lg"
                  className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 disabled:opacity-50"
                >
                  Load More Artists
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
              {/* Invisible trigger for infinite scroll */}
              <div className="h-20" />
            </motion.div>
          ) : isFilteredMode && statistics && displayedArtists.length > 0 && displayedArtists.length < statistics.allArtists.length && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-12 text-center"
            >
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg px-4 py-2">
                <Filter className="h-4 w-4" />
                <span>Showing filtered results. Clear filters to load more artists.</span>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Events Section */}
      {statistics && statistics.latestEvents.length > 0 && (
        <motion.section
          className="relative z-10 py-24 px-2 sm:px-4 lg:px-6 bg-gradient-to-b from-background to-background/80"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <div className="w-full max-w-[1600px] mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Latest Events
              </h2>
              <p className="text-lg text-muted-foreground">
                Hot off the press - newest additions to ADE 2025
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {statistics.latestEvents.slice(0, 8).map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <Card className="h-full bg-card/80 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-300">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                          {event.event_type || 'Event'}
                        </Badge>
                        {event.sold_out && (
                          <Badge variant="destructive">Sold Out</Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg line-clamp-2">
                        {event.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground line-clamp-1">
                          {event.venue_name || 'Venue TBA'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-accent" />
                        <span className="text-muted-foreground">
                          {new Date(event.start_date).toLocaleDateString('en', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
        </div>
              </CardContent>
            </Card>
          </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="mt-12 text-center"
            >
              <Button
                size="lg"
                variant="outline"
                className="border-primary/30 hover:bg-primary/10"
                onClick={() => window.location.href = '/data'}
              >
                View All Events
                <ArrowUpRight className="h-4 w-4 ml-2" />
              </Button>
            </motion.div>
          </div>
        </motion.section>
        )}

        {/* Top Venues */}
        {statistics && statistics.topVenues.length > 0 && (
        <motion.section
          className="relative z-10 py-24 px-2 sm:px-4 lg:px-6"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <div className="w-full max-w-[1600px] mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
                  Top Venues
              </h2>
              <p className="text-lg text-muted-foreground">
                The hottest spots hosting the most events
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {statistics.topVenues.map((venue, index) => (
                <motion.div
                  key={venue.venue}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <Card className="h-full bg-gradient-to-br from-card to-card/80 border-border/50 hover:border-accent/50 transition-all">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <MapPin className="h-8 w-8 text-accent" />
                        <Badge className="bg-accent/10 text-accent">
                          {venue.count} Events
                    </Badge>
                </div>
                      <h3 className="text-lg font-semibold mb-2 line-clamp-2">
                        {venue.venue}
                      </h3>
              </CardContent>
            </Card>
          </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* Quick Actions */}
      <motion.section
        className="relative z-10 py-24 px-2 sm:px-4 lg:px-6 bg-gradient-to-t from-background/80 to-background"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <div className="w-full max-w-[1600px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div whileHover={{ scale: 1.02 }}>
              <Card className="h-full bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 hover:border-primary/40 transition-all cursor-pointer">
                <CardContent className="p-8 text-center">
                  <Headphones className="h-12 w-12 text-primary mb-4 mx-auto" />
                  <h3 className="text-xl font-semibold mb-2">Artist Studio</h3>
                  <p className="text-muted-foreground mb-4">
                    Explore artist profiles with Spotify integration
                  </p>
                  <Button 
                    className="w-full bg-primary hover:bg-primary/90"
                    onClick={() => window.location.href = '/artist-studio'}
                  >
                    Open Studio
                    <ArrowUpRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
        </motion.div>

            <motion.div whileHover={{ scale: 1.02 }}>
              <Card className="h-full bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20 hover:border-secondary/40 transition-all cursor-pointer">
                <CardContent className="p-8 text-center">
                  <Radio className="h-12 w-12 text-secondary mb-4 mx-auto" />
                  <h3 className="text-xl font-semibold mb-2">Genre Explorer</h3>
                  <p className="text-muted-foreground mb-4">
                    Discover events by musical genres
                  </p>
                  <Button 
                    className="w-full bg-secondary hover:bg-secondary/90"
                    onClick={() => window.location.href = '/genres'}
                  >
                    Explore Genres
                    <ArrowUpRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
        </motion.div>

            <motion.div whileHover={{ scale: 1.02 }}>
              <Card className="h-full bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20 hover:border-accent/40 transition-all cursor-pointer">
                <CardContent className="p-8 text-center">
                  <Activity className="h-12 w-12 text-accent mb-4 mx-auto" />
                  <h3 className="text-xl font-semibold mb-2">Analytics</h3>
                  <p className="text-muted-foreground mb-4">
                    Deep dive into ADE data
                  </p>
                  <Button 
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                    onClick={() => window.location.href = '/data'}
                  >
                    View Analytics
                    <ArrowUpRight className="h-4 w-4 ml-2" />
                  </Button>
              </CardContent>
            </Card>
          </motion.div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}