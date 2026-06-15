"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  Download,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Clock,
  Activity,
  AlertCircle,
  CheckCircle,
  Info,
  X,
  Zap,
  Database,
  Users,
  Calendar,
  Link2,
  Music,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Maximize2,
  Minimize2,
  Globe,
  MapPin,
  Calendar as CalendarIcon,
  Headphones,
  Mic,
  Disc,
  Radio,
  Volume2,
  Heart,
  Star,
  Sparkles,
  Target,
  Network,
  Layers,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Instagram,
  Twitter,
  Facebook,
  Youtube,
  Cloud
} from "lucide-react";

interface VisualLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error' | 'debug';
  category: 'sync' | 'parse' | 'enrich' | 'link' | 'analysis' | 'system';
  message: string;
  visualData?: {
    type: 'artists' | 'events' | 'lineups' | 'connections' | 'social' | 'music' | 'stats';
    items: Array<{
      id: string;
      name: string;
      image?: string;
      subtitle?: string;
      metadata?: any;
    }>;
    count: number;
    total?: number;
  };
  progress?: number;
  duration?: number;
  metadata?: any;
}

interface VisualLoggingSystemProps {
  logs: VisualLogEntry[];
  isRunning: boolean;
  onClearLogs?: () => void;
  onExportLogs?: () => void;
  className?: string;
}

const categoryConfig = {
  sync: { 
    color: 'text-blue-600', 
    bg: 'bg-blue-600/10', 
    icon: Database, 
    label: 'Sync',
    gradient: 'from-blue-500/20 to-blue-600/20'
  },
  parse: { 
    color: 'text-purple-600', 
    bg: 'bg-purple-600/10', 
    icon: Search, 
    label: 'Parse',
    gradient: 'from-purple-500/20 to-purple-600/20'
  },
  enrich: { 
    color: 'text-pink-600', 
    bg: 'bg-pink-600/10', 
    icon: Music, 
    label: 'Enrich',
    gradient: 'from-pink-500/20 to-pink-600/20'
  },
  link: { 
    color: 'text-orange-600', 
    bg: 'bg-orange-600/10', 
    icon: Link2, 
    label: 'Link',
    gradient: 'from-orange-500/20 to-orange-600/20'
  },
  analysis: { 
    color: 'text-indigo-600', 
    bg: 'bg-indigo-600/10', 
    icon: BarChart3, 
    label: 'Analysis',
    gradient: 'from-indigo-500/20 to-indigo-600/20'
  },
  system: { 
    color: 'text-gray-600', 
    bg: 'bg-gray-600/10', 
    icon: Activity, 
    label: 'System',
    gradient: 'from-gray-500/20 to-gray-600/20'
  }
};

const levelConfig = {
  info: { color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Info },
  success: { color: 'text-green-500', bg: 'bg-green-500/10', icon: CheckCircle },
  warning: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: AlertCircle },
  error: { color: 'text-red-500', bg: 'bg-red-500/10', icon: X },
  debug: { color: 'text-purple-500', bg: 'bg-purple-500/10', icon: Activity }
};

export function VisualLoggingSystem({ logs, isRunning, onClearLogs, onExportLogs, className }: VisualLoggingSystemProps) {
  const [autoScroll, setAutoScroll] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [displayedLogs, setDisplayedLogs] = useState<VisualLogEntry[]>([]);
  const [liveArtists, setLiveArtists] = useState<Map<string, any>>(new Map());
  const [liveEvents, setLiveEvents] = useState<Map<string, any>>(new Map());
  const [stats, setStats] = useState({
    artists: 0,
    events: 0,
    connections: 0,
    enriched: 0,
    socialLinks: 0
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  // Extract live data from logs and update stats
  useEffect(() => {
    if (logs.length === 0) {
      setDisplayedLogs([]);
      setLiveArtists(new Map());
      setLiveEvents(new Map());
      setStats({ artists: 0, events: 0, connections: 0, enriched: 0, socialLinks: 0 });
    } else {
      // Process all logs to extract live data
      const newArtists = new Map(liveArtists);
      const newEvents = new Map(liveEvents);
      let newStats = { ...stats };

      logs.forEach(log => {
        if (log.visualData) {
          const { type, items, count } = log.visualData;
          
          switch (type) {
            case 'artists':
              items.forEach(item => {
                if (item.id && item.name) {
                  newArtists.set(item.id, {
                    ...item,
                    status: 'discovered',
                    timestamp: log.timestamp,
                    category: log.category
                  });
                }
              });
              // Only update stats if this is a total count, not a page count
              if (log.message.includes('Total artists') || log.message.includes('artists fetched') || log.message.includes('sync complete')) {
                newStats.artists = count;
              }
              break;
              
            case 'events':
              items.forEach(item => {
                if (item.id && item.name) {
                  newEvents.set(item.id, {
                    ...item,
                    status: 'synced',
                    timestamp: log.timestamp,
                    category: log.category
                  });
                }
              });
              newStats.events = Math.max(newStats.events, count);
              break;
              
            case 'connections':
              newStats.connections = Math.max(newStats.connections, count);
              break;
              
            case 'music':
              newStats.enriched = Math.max(newStats.enriched, count);
              // Update artist status to enriched
              items.forEach(item => {
                if (item.id && newArtists.has(item.id)) {
                  newArtists.set(item.id, {
                    ...newArtists.get(item.id),
                    status: 'enriched',
                    genres: item.metadata?.genres || [],
                    audioFeatures: item.metadata?.audioFeatures
                  });
                }
              });
              break;
              
            case 'social':
              newStats.socialLinks = Math.max(newStats.socialLinks, count);
              // Update artist status to social found
              items.forEach(item => {
                if (item.id && newArtists.has(item.id)) {
                  newArtists.set(item.id, {
                    ...newArtists.get(item.id),
                    status: 'social',
                    socialPlatforms: item.metadata?.platforms || []
                  });
                }
              });
              break;
          }
        }
      });

      // Use actual collected artists count as fallback, but prioritize total counts
      if (newStats.artists === 0 && newArtists.size > 0) {
        newStats.artists = newArtists.size;
      }
      
      // Ensure we show the most recent total count
      const totalCountLogs = logs.filter(log => 
        log.visualData?.type === 'artists' && 
        (log.message.includes('Total artists') || log.message.includes('sync complete'))
      );
      
      if (totalCountLogs.length > 0) {
        const latestTotalLog = totalCountLogs[totalCountLogs.length - 1];
        newStats.artists = latestTotalLog.visualData?.count || newStats.artists;
      }
      
      setLiveArtists(newArtists);
      setLiveEvents(newEvents);
      setStats(newStats);
      
      // Update displayed logs - new logs at the top
      if (logs.length > displayedLogs.length) {
        const newLogs = logs.slice(displayedLogs.length);
        setDisplayedLogs(prev => [...newLogs, ...prev]);
      }
    }
  }, [logs, displayedLogs.length]);

  // Auto-scroll to top when new logs arrive (newest first)
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [displayedLogs, autoScroll]);


  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const getSocialIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'spotify': return Music;
      case 'instagram': return Instagram;
      case 'twitter': return Twitter;
      case 'facebook': return Facebook;
      case 'youtube': return Youtube;
      case 'soundcloud': return Cloud;
      default: return ExternalLink;
    }
  };

  const renderVisualData = (log: VisualLogEntry) => {
    if (!log.visualData) return null;

    const { type, items = [], count = 0, total } = log.visualData;
    const displayItems = Array.isArray(items) ? items.slice(0, 6) : []; // Show max 6 items
    const remainingCount = Math.max(0, count - displayItems.length);

    switch (type) {
      case 'artists':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {count.toLocaleString()} {count === 1 ? 'Artist' : 'Artists'}
                  </div>
                  {total && (
                    <div className="text-sm text-gray-500">
                      of {total.toLocaleString()} total
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">
                  {count}
                </div>
                <div className="text-xs text-gray-500">discovered</div>
              </div>
            </div>
            
            {displayItems.length > 0 && (
              <div className="grid grid-cols-6 gap-3">
                {displayItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ 
                      delay: index * 0.1,
                      type: "spring",
                      stiffness: 200,
                      damping: 20
                    }}
                    className="group cursor-pointer"
                  >
                    <div className="relative">
                      <Avatar className="w-12 h-12 ring-2 ring-blue-200 group-hover:ring-blue-400 transition-all duration-300">
                        <AvatarImage src={item.image} className="object-cover" />
                        <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white font-semibold">
                          {item.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
                    </div>
                    <div className="mt-2 text-center">
                      <div className="text-xs font-medium text-gray-900 dark:text-white truncate" title={item.name}>
                        {item.name}
                      </div>
                      {item.subtitle && (
                        <div className="text-xs text-gray-500 truncate">
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
                {remainingCount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: displayItems.length * 0.1 }}
                    className="flex flex-col items-center justify-center"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center group-hover:from-gray-200 group-hover:to-gray-300 transition-all duration-300">
                      <span className="text-lg font-bold text-gray-600 dark:text-gray-300">
                        +{remainingCount}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 font-medium">
                      more
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        );

      case 'events':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {count.toLocaleString()} {count === 1 ? 'Event' : 'Events'}
                  </div>
                  {total && (
                    <div className="text-sm text-gray-500">
                      of {total.toLocaleString()} total
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">
                  {count}
                </div>
                <div className="text-xs text-gray-500">synced</div>
              </div>
            </div>
            
            {displayItems.length > 0 && (
              <div className="space-y-3">
                {displayItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ 
                      delay: index * 0.1,
                      type: "spring",
                      stiffness: 200,
                      damping: 20
                    }}
                    className="group cursor-pointer p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center flex-shrink-0">
                        <CalendarIcon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-base font-semibold text-gray-900 dark:text-white truncate group-hover:text-green-700 dark:group-hover:text-green-300 transition-colors">
                          {item.name}
                        </div>
                        {item.subtitle && (
                          <div className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                            {item.subtitle}
                          </div>
                        )}
                        {item.metadata?.venue && (
                          <div className="flex items-center gap-1 mt-2">
                            <MapPin className="w-3 h-3 text-green-600" />
                            <span className="text-xs text-green-700 dark:text-green-300 font-medium">
                              {item.metadata.venue}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {remainingCount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: displayItems.length * 0.1 }}
                    className="text-center py-4"
                  >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800">
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                        +{remainingCount} more events
                      </span>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        );

      case 'lineups':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium">
                {count} {count === 1 ? 'Artist' : 'Artists'} in lineup
              </span>
            </div>
            {displayItems.length > 0 ? (
              <div className="flex flex-wrap gap-1">
              {displayItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center space-x-1 px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-xs"
                >
                  <Avatar className="w-4 h-4">
                    <AvatarImage src={item.image} />
                    <AvatarFallback className="text-xs">
                      {item.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span>{item.name}</span>
                </motion.div>
              ))}
              {remainingCount > 0 && (
                <Badge variant="outline" className="text-xs">
                  +{remainingCount} more
                </Badge>
              )}
            </div>
            ) : (
              <div className="text-center text-sm text-gray-500 py-4">
                No lineup data available
              </div>
            )}
          </div>
        );

      case 'connections':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium">
                {count} {count === 1 ? 'Connection' : 'Connections'} created
              </span>
            </div>
            {displayItems.length > 0 ? (
              <div className="space-y-2">
              {displayItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center space-x-2 p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20"
                >
                  <div className="flex items-center space-x-1">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={item.image} />
                      <AvatarFallback className="text-xs">
                        {item.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <Link2 className="w-3 h-3 text-orange-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">{item.subtitle}</span>
                  {item.metadata?.confidence && (
                    <Badge variant="outline" className="text-xs">
                      {Math.round(item.metadata.confidence * 100)}%
                    </Badge>
                  )}
                </motion.div>
              ))}
              {remainingCount > 0 && (
                <div className="text-center text-sm text-gray-500 py-2">
                  +{remainingCount} more connections
                </div>
              )}
            </div>
            ) : (
              <div className="text-center text-sm text-gray-500 py-4">
                No connection data available
              </div>
            )}
          </div>
        );

      case 'social':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-pink-500" />
              <span className="text-sm font-medium">
                Found social links for {count} {count === 1 ? 'artist' : 'artists'}
              </span>
            </div>
            {displayItems.length > 0 ? (
              <div className="space-y-2">
              {displayItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center space-x-3 p-2 rounded-lg bg-pink-50 dark:bg-pink-900/20"
                >
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={item.image} />
                    <AvatarFallback className="text-xs">
                      {item.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{item.name}</div>
                    <div className="flex items-center space-x-2 mt-1">
                      {item.metadata?.platforms?.map((platform: string) => {
                        const Icon = getSocialIcon(platform);
                        return (
                          <Icon key={platform} className="w-4 h-4 text-pink-500" />
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              ))}
              {remainingCount > 0 && (
                <div className="text-center text-sm text-gray-500 py-2">
                  +{remainingCount} more artists
                </div>
              )}
            </div>
            ) : (
              <div className="text-center text-sm text-gray-500 py-4">
                No social media data available
              </div>
            )}
          </div>
        );

      case 'music':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Headphones className="w-4 h-4 text-pink-500" />
              <span className="text-sm font-medium">
                Enriched {count} {count === 1 ? 'artist' : 'artists'} with music data
              </span>
            </div>
            {displayItems.length > 0 ? (
              <div className="space-y-2">
              {displayItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center space-x-3 p-2 rounded-lg bg-pink-50 dark:bg-pink-900/20"
                >
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={item.image} />
                    <AvatarFallback className="text-xs">
                      {item.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{item.name}</div>
                    <div className="flex items-center space-x-2 mt-1">
                      {item.metadata?.genres?.slice(0, 3).map((genre: string) => (
                        <Badge key={genre} variant="outline" className="text-xs">
                          {genre}
                        </Badge>
                      ))}
                    </div>
                    {item.metadata?.audioFeatures && (
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="flex items-center space-x-1">
                          <Volume2 className="w-3 h-3" />
                          <span className="text-xs">{Math.round(item.metadata.audioFeatures.energy * 100)}%</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Heart className="w-3 h-3" />
                          <span className="text-xs">{Math.round(item.metadata.audioFeatures.danceability * 100)}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              {remainingCount > 0 && (
                <div className="text-center text-sm text-gray-500 py-2">
                  +{remainingCount} more artists
                </div>
              )}
            </div>
            ) : (
              <div className="text-center text-sm text-gray-500 py-4">
                No music data available
              </div>
            )}
          </div>
        );

      case 'stats':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-medium">Statistics</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(log.metadata || {}).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-2 rounded bg-indigo-50 dark:bg-indigo-900/20">
                  <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className="text-sm font-medium">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (isMinimized) {
    return (
      <motion.div
        initial={{ height: 'auto' }}
        animate={{ height: '60px' }}
        className="fixed bottom-4 right-4 z-50"
      >
        <Card className="w-80 shadow-2xl border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-sm font-medium">Visual Logs</span>
                <Badge variant="secondary" className="text-xs">
                  {logs.length}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsMinimized(false)}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`space-y-4 ${className}`}
    >
      {/* Header */}
      <Card className="border-primary/20 shadow-2xl bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div
                animate={{ 
                  rotate: isRunning ? 360 : 0,
                  scale: isRunning ? [1, 1.1, 1] : 1
                }}
                transition={{ 
                  duration: 2, 
                  repeat: isRunning ? Infinity : 0, 
                  ease: "linear"
                }}
                className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg"
              >
                <Sparkles className="w-6 h-6 text-white" />
              </motion.div>
              <div>
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  Live Progress Dashboard
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Real-time data pipeline visualization with stunning insights
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ scale: isRunning ? [1, 1.2, 1] : 1 }}
                transition={{ duration: 1, repeat: isRunning ? Infinity : 0 }}
              >
                <Badge 
                  variant={isRunning ? "default" : "secondary"} 
                  className={`gap-2 px-4 py-2 rounded-full font-semibold ${
                    isRunning 
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg' 
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-white animate-pulse' : 'bg-gray-400'}`} />
                  {isRunning ? 'Live' : 'Paused'}
                </Badge>
              </motion.div>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsMinimized(true)}
                className="w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Live Stats Dashboard */}
      <Card className="border-primary/10 mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-5 gap-4">
            <motion.div
              animate={{ scale: isRunning ? [1, 1.05, 1] : 1 }}
              transition={{ duration: 2, repeat: isRunning ? Infinity : 0 }}
              className="text-center p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800"
            >
              <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">{stats.artists.toLocaleString()}</div>
              <div className="text-sm text-blue-600 font-medium">Artists</div>
            </motion.div>
            
            <motion.div
              animate={{ scale: isRunning ? [1, 1.05, 1] : 1 }}
              transition={{ duration: 2, repeat: isRunning ? Infinity : 0, delay: 0.2 }}
              className="text-center p-4 rounded-xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800"
            >
              <Calendar className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">{stats.events.toLocaleString()}</div>
              <div className="text-sm text-green-600 font-medium">Events</div>
            </motion.div>
            
            <motion.div
              animate={{ scale: isRunning ? [1, 1.05, 1] : 1 }}
              transition={{ duration: 2, repeat: isRunning ? Infinity : 0, delay: 0.4 }}
              className="text-center p-4 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border border-orange-200 dark:border-orange-800"
            >
              <Link2 className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-orange-600">{stats.connections.toLocaleString()}</div>
              <div className="text-sm text-orange-600 font-medium">Connections</div>
            </motion.div>
            
            <motion.div
              animate={{ scale: isRunning ? [1, 1.05, 1] : 1 }}
              transition={{ duration: 2, repeat: isRunning ? Infinity : 0, delay: 0.6 }}
              className="text-center p-4 rounded-xl bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20 border border-pink-200 dark:border-pink-800"
            >
              <Music className="w-8 h-8 text-pink-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-pink-600">{stats.enriched.toLocaleString()}</div>
              <div className="text-sm text-pink-600 font-medium">Enriched</div>
            </motion.div>
            
            <motion.div
              animate={{ scale: isRunning ? [1, 1.05, 1] : 1 }}
              transition={{ duration: 2, repeat: isRunning ? Infinity : 0, delay: 0.8 }}
              className="text-center p-4 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-800"
            >
              <Globe className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-600">{stats.socialLinks.toLocaleString()}</div>
              <div className="text-sm text-purple-600 font-medium">Social Links</div>
            </motion.div>
          </div>
        </CardContent>
      </Card>

      {/* Live Artist Cards */}
      <Card className="border-primary/10">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold">Live Artist Discovery</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Real-time artist cards updating as data is processed
              </p>
            </div>
            <Badge variant="outline" className="text-sm">
              {Array.from(liveArtists.values()).length} Artists
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea 
            ref={scrollRef}
            className="h-96 w-full"
          >
            <div className="p-6">
              {Array.from(liveArtists.values()).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  <AnimatePresence>
                    {Array.from(liveArtists.values())
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) // Newest first
                      .map((artist, index) => (
                      <motion.div
                        key={artist.id}
                        initial={{ opacity: 0, y: -30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 30, scale: 0.95 }}
                        transition={{ 
                          delay: index * 0.05,
                          type: "spring",
                          stiffness: 300,
                          damping: 25
                        }}
                        className="group cursor-pointer"
                      >
                        <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 shadow-xl hover:shadow-2xl transition-all duration-500 group-hover:scale-[1.02] group-hover:border-blue-300 dark:group-hover:border-blue-600">
                          {/* New Artist Ribbon */}
                          {artist.isNew && (
                            <div className="absolute -top-1 -right-1 z-20">
                              <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg shadow-lg transform rotate-12">
                                ✨ NEW
                              </div>
                            </div>
                          )}
                          
                          {/* Animated Background Gradient */}
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                          
                          {/* Status Indicator with Glow */}
                          <div className="absolute top-4 right-4 z-10">
                            <div className={`relative w-4 h-4 rounded-full ${
                              artist.status === 'enriched' ? 'bg-green-500' :
                              artist.status === 'social' ? 'bg-blue-500' :
                              artist.status === 'discovered' ? 'bg-yellow-500' :
                              'bg-gray-400'
                            } ${artist.status !== 'processing' ? 'animate-pulse' : ''}`}>
                              <div className={`absolute inset-0 rounded-full ${
                                artist.status === 'enriched' ? 'bg-green-500/30 animate-ping' :
                                artist.status === 'social' ? 'bg-blue-500/30 animate-ping' :
                                artist.status === 'discovered' ? 'bg-yellow-500/30 animate-ping' :
                                ''
                              }`} />
                            </div>
                          </div>
                          
                          <div className="relative p-5">
                            {/* Artist Header */}
                            <div className="flex items-start space-x-3 mb-4">
                              <div className="relative">
                                <Avatar className="w-14 h-14 ring-3 ring-white dark:ring-gray-800 shadow-lg group-hover:ring-blue-300 dark:group-hover:ring-blue-600 transition-all duration-300">
                                  <AvatarImage src={artist.image || artist.spotifyImage} className="object-cover" />
                                  <AvatarFallback className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white font-bold text-sm">
                                    {artist.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                {/* Live indicator */}
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center">
                                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                </div>
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">
                                    {artist.name}
                                  </h3>
                                  {artist.popularity && (
                                    <div className="flex items-center gap-1">
                                      <Star className="w-3 h-3 text-yellow-500 fill-current" />
                                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                                        {Math.round(artist.popularity / 20)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                
                                {artist.subtitle && (
                                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-2">
                                    <Globe className="w-3 h-3" />
                                    <span className="truncate">{artist.subtitle}</span>
                                  </div>
                                )}
                                
                                {/* Status Badge */}
                                <div className="mb-3">
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs font-semibold px-2 py-1 rounded-full shadow-sm ${
                                      artist.status === 'enriched' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' :
                                      artist.status === 'social' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' :
                                      artist.status === 'discovered' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800' :
                                      'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800'
                                    }`}
                                  >
                                    {artist.status === 'enriched' ? '🎵 Enriched' :
                                     artist.status === 'social' ? '🌐 Social' :
                                     artist.status === 'discovered' ? '🔍 New' :
                                     '⏳ Processing'}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            
                            {/* Data Fields Grid */}
                            <div className="space-y-3">
                              {/* Genres */}
                              {artist.genres && artist.genres.length > 0 && (
                                <div>
                                  <div className="flex items-center gap-1 mb-1">
                                    <Music className="w-3 h-3 text-gray-500" />
                                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Genres</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {artist.genres.slice(0, 3).map((genre: string, idx: number) => (
                                      <Badge key={idx} variant="outline" className="text-xs px-1.5 py-0.5 rounded-full bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400">
                                        {genre}
                                      </Badge>
                                    ))}
                                    {artist.genres.length > 3 && (
                                      <Badge variant="outline" className="text-xs px-1.5 py-0.5 rounded-full bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                        +{artist.genres.length - 3}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              {/* Spotify Data */}
                              {artist.spotifyId && (
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className="flex items-center gap-1">
                                    <Music className="w-3 h-3 text-green-500" />
                                    <span className="text-gray-600 dark:text-gray-400">Spotify ID</span>
                                  </div>
                                  <div className="text-gray-900 dark:text-white font-mono truncate">
                                    {artist.spotifyId.slice(0, 8)}...
                                  </div>
                                </div>
                              )}
                              
                              {/* Audio Features */}
                              {artist.audioFeatures && (
                                <div>
                                  <div className="flex items-center gap-1 mb-1">
                                    <BarChart3 className="w-3 h-3 text-gray-500" />
                                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Audio Features</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-1 text-xs">
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Energy:</span>
                                      <span className="text-gray-900 dark:text-white">{Math.round(artist.audioFeatures.energy_mean * 100)}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Dance:</span>
                                      <span className="text-gray-900 dark:text-white">{Math.round(artist.audioFeatures.danceability_mean * 100)}%</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* Social Platforms */}
                              {artist.socialPlatforms && artist.socialPlatforms.length > 0 && (
                                <div>
                                  <div className="flex items-center gap-1 mb-1">
                                    <Globe className="w-3 h-3 text-gray-500" />
                                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Social</span>
                                  </div>
                                  <div className="flex gap-1">
                                    {artist.socialPlatforms.slice(0, 4).map((platform: string, idx: number) => {
                                      const Icon = getSocialIcon(platform);
                                      return (
                                        <div key={idx} className="p-1 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                          <Icon className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                                        </div>
                                      );
                                    })}
                                    {artist.socialPlatforms.length > 4 && (
                                      <div className="p-1 rounded bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400">
                                        +{artist.socialPlatforms.length - 4}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              {/* Events Count */}
                              {artist.eventsCount !== undefined && (
                                <div className="flex items-center gap-1 text-xs">
                                  <Calendar className="w-3 h-3 text-gray-500" />
                                  <span className="text-gray-600 dark:text-gray-400">Events:</span>
                                  <span className="text-gray-900 dark:text-white font-semibold">{artist.eventsCount}</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Footer */}
                            <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
                              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                <Clock className="w-3 h-3" />
                                <span>{formatTimestamp(artist.timestamp)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                                  <Heart className="w-3 h-3" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                                  <ExternalLink className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-16"
                >
                  <motion.div
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ 
                      duration: 3, 
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center"
                  >
                    <Sparkles className="w-10 h-10 text-primary" />
                  </motion.div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Ready to Discover Artists
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Start the scraper to see live artist cards updating in real-time
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-primary/20 border border-primary/20">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-primary">Waiting for artists...</span>
                  </div>
                </motion.div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}
