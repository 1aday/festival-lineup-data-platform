"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Toaster } from "@/components/ui/sonner";
import { VisualLoggingSystem } from "@/components/visual-logging-system";
import { motion } from "framer-motion";
import { 
  Play, 
  Pause, 
  RefreshCw, 
  Database,
  Zap,
  Shield,
  CheckCircle,
  AlertCircle,
  Clock,
  BarChart3,
  Settings,
  Sparkles,
  Users,
  Calendar,
  Link2,
  Music,
  Search,
  Activity
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MasterScraperOptions {
  syncArtists: boolean;
  syncEvents: boolean;
  parseLineups: boolean;
  linkArtists: boolean;
  scrapeArtistPages: boolean;
  enrichArtists: boolean;
  checkMissing: boolean;
  generateStats: boolean;
  forceRefresh: boolean;
  batchSize: number;
  rateLimit: number;
}

interface LogEntry {
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
  duration?: number;
  progress?: number;
  metadata?: {
    artistId?: string;
    eventId?: string;
    batchSize?: number;
    retryCount?: number;
    errorCode?: string;
  };
}

interface ScraperProgress {
  phase: string;
  progress: number;
  message: string;
  completed: boolean;
  stats: {
    artistsAdded: number;
    artistsUpdated: number;
    eventsAdded: number;
    eventsUpdated: number;
    lineupsParsed: number;
    artistsFound: number;
    linksCreated: number;
    artistsEnriched: number;
    enrichmentErrors: number;
    missingEvents: any[];
    missingArtists: any[];
    totalProcessed: number;
    errors: number;
  };
  currentItem: string;
  logs: LogEntry[];
  startTime: string;
  estimatedTimeRemaining: string;
  totalTime?: number;
  successRate?: number;
}

export default function MasterScraperPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ScraperProgress | null>(null);
  const [options, setOptions] = useState<MasterScraperOptions>({
    syncArtists: true,
    syncEvents: true,
    parseLineups: true,
    linkArtists: true,
    scrapeArtistPages: true,
    enrichArtists: true,
    checkMissing: true,
    generateStats: true,
    forceRefresh: false,
    batchSize: 10,
    rateLimit: 100
  });

  // Poll for progress updates
  useEffect(() => {
    if (sessionId && isRunning) {
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/master-scraper?sessionId=${sessionId}`);
          if (response.ok) {
            const progressData = await response.json();
            setProgress(progressData);
            
            if (progressData.completed) {
              setIsRunning(false);
              clearInterval(interval);
            }
          }
        } catch (error) {
          console.error('Failed to fetch progress:', error);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [sessionId, isRunning]);

  const startMasterScraper = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    const newSessionId = `master-scraper-${Date.now()}`;
    setSessionId(newSessionId);
    setProgress(null);
    
    try {
      const response = await fetch('/api/master-scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: newSessionId,
          options
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to start master scraper');
      }
    } catch (error) {
      console.error('Failed to start master scraper:', error);
      setIsRunning(false);
    }
  };

  const resetScraper = () => {
    setIsRunning(false);
    setSessionId(null);
    setProgress(null);
  };

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'Syncing Artists': return <Users className="w-5 h-5" />;
      case 'Syncing Events': return <Calendar className="w-5 h-5" />;
      case 'Parsing Lineups': return <Search className="w-5 h-5" />;
      case 'Linking Artists': return <Link2 className="w-5 h-5" />;
      case 'Enriching Artists': return <Music className="w-5 h-5" />;
      case 'Analyzing Data': return <BarChart3 className="w-5 h-5" />;
      case 'Generating Stats': return <Activity className="w-5 h-5" />;
      case 'Complete': return <CheckCircle className="w-5 h-5" />;
      default: return <Database className="w-5 h-5" />;
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'Complete': return 'text-green-500';
      case 'Error': return 'text-red-500';
      default: return 'text-blue-500';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <motion.div
                  animate={{ rotate: isRunning ? 360 : 0 }}
                  transition={{ duration: 2, repeat: isRunning ? Infinity : 0, ease: "linear" }}
                >
                  <Sparkles className="w-8 h-8 text-primary" />
                </motion.div>
                Master Scraper
              </h1>
              <p className="text-muted-foreground">
                Complete featured festival data pipeline - scrape, enrich, link, and analyze everything
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {!isSupabaseConfigured() && (
                <Badge variant="outline" className="gap-1">
                  <Shield className="w-3 h-3" />
                  Demo Mode
                </Badge>
              )}
              <Badge variant={isRunning ? "default" : "secondary"} className="gap-1">
                <Zap className="w-3 h-3" />
                {isRunning ? 'Running...' : 'Ready'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Configuration */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Master Scraper Configuration
            </CardTitle>
            <CardDescription>
              Configure what the master scraper should do
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Data Sources */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Data Sources</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="sync-artists">Sync Artists</Label>
                    <p className="text-xs text-muted-foreground">Fetch all artists from the featured festival API</p>
                  </div>
                  <Switch
                    id="sync-artists"
                    checked={options.syncArtists}
                    onCheckedChange={(checked) => setOptions(prev => ({ ...prev, syncArtists: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="sync-events">Sync Events</Label>
                    <p className="text-xs text-muted-foreground">Fetch all events from the featured festival API</p>
                  </div>
                  <Switch
                    id="sync-events"
                    checked={options.syncEvents}
                    onCheckedChange={(checked) => setOptions(prev => ({ ...prev, syncEvents: checked }))}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Processing */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Processing</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="parse-lineups">Parse Lineups</Label>
                    <p className="text-xs text-muted-foreground">Extract artist lineups from event pages</p>
                  </div>
                  <Switch
                    id="parse-lineups"
                    checked={options.parseLineups}
                    onCheckedChange={(checked) => setOptions(prev => ({ ...prev, parseLineups: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="link-artists">Link Artists</Label>
                    <p className="text-xs text-muted-foreground">Create artist-event connections</p>
                  </div>
                  <Switch
                    id="link-artists"
                    checked={options.linkArtists}
                    onCheckedChange={(checked) => setOptions(prev => ({ ...prev, linkArtists: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="scrape-artist-pages">Scrape Artist Pages</Label>
                    <p className="text-xs text-muted-foreground">Get Spotify URLs from featured festival artist pages</p>
                  </div>
                  <Switch
                    id="scrape-artist-pages"
                    checked={options.scrapeArtistPages}
                    onCheckedChange={(checked) => setOptions(prev => ({ ...prev, scrapeArtistPages: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enrich-artists">Enrich Artists</Label>
                    <p className="text-xs text-muted-foreground">Add Spotify data to artists</p>
                  </div>
                  <Switch
                    id="enrich-artists"
                    checked={options.enrichArtists}
                    onCheckedChange={(checked) => setOptions(prev => ({ ...prev, enrichArtists: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="check-missing">Check Missing</Label>
                    <p className="text-xs text-muted-foreground">Find missing connections</p>
                  </div>
                  <Switch
                    id="check-missing"
                    checked={options.checkMissing}
                    onCheckedChange={(checked) => setOptions(prev => ({ ...prev, checkMissing: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="force-replace">Force Replace Existing</Label>
                    <p className="text-xs text-muted-foreground">Overwrite artists/events/links instead of skipping when present</p>
                  </div>
                  <Switch
                    id="force-replace"
                    checked={options.forceRefresh}
                    onCheckedChange={(checked) => setOptions(prev => ({ ...prev, forceRefresh: checked }))}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Advanced Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Advanced Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="batch-size">Batch Size</Label>
                  <Select
                    value={options.batchSize.toString()}
                    onValueChange={(value) => setOptions(prev => ({ ...prev, batchSize: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 items</SelectItem>
                      <SelectItem value="10">10 items</SelectItem>
                      <SelectItem value="20">20 items</SelectItem>
                      <SelectItem value="50">50 items</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rate-limit">Rate Limit (ms)</Label>
                  <Select
                    value={options.rateLimit.toString()}
                    onValueChange={(value) => setOptions(prev => ({ ...prev, rateLimit: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">50ms</SelectItem>
                      <SelectItem value="100">100ms</SelectItem>
                      <SelectItem value="200">200ms</SelectItem>
                      <SelectItem value="500">500ms</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="force-refresh">Force Refresh</Label>
                    <p className="text-xs text-muted-foreground">Refresh existing data</p>
                  </div>
                  <Switch
                    id="force-refresh"
                    checked={options.forceRefresh}
                    onCheckedChange={(checked) => setOptions(prev => ({ ...prev, forceRefresh: checked }))}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button
                onClick={startMasterScraper}
                disabled={isRunning}
                size="lg"
                className="flex-1"
              >
                {isRunning ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Master Scraper
                  </>
                )}
              </Button>
              
              {progress?.completed && (
                <Button
                  onClick={resetScraper}
                  variant="outline"
                  size="lg"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Progress Display */}
        {progress && (
          <Card className={`mb-8 ${isRunning ? 'border-primary shadow-lg shadow-primary/20' : 'border-border'} transition-all duration-500`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <CardTitle className="flex items-center gap-2">
                    <motion.div
                      animate={{ 
                        rotate: isRunning ? 360 : 0,
                        scale: isRunning ? [1, 1.1, 1] : 1 
                      }}
                      transition={{ 
                        rotate: { duration: 2, repeat: isRunning ? Infinity : 0, ease: "linear" },
                        scale: { duration: 1, repeat: isRunning ? Infinity : 0 }
                      }}
                    >
                      {getPhaseIcon(progress.phase)}
                    </motion.div>
                    <span className={getPhaseColor(progress.phase)}>
                      {progress.phase}
                    </span>
                    {isRunning && (
                      <Badge className="ml-2 animate-pulse bg-primary/20 text-primary">RUNNING</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {progress.message}
                  </CardDescription>
                  {progress.currentItem && (
                    <p className="text-sm text-primary font-mono">
                      → {progress.currentItem}
                    </p>
                  )}
                </div>
                
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary">
                    {Math.round(progress.progress)}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {progress.estimatedTimeRemaining}
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Progress Bar */}
              <div className="relative h-6 bg-secondary/30 rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_100%]"
                  initial={{ x: "-100%" }}
                  animate={{ 
                    x: `${progress.progress - 100}%`,
                    backgroundPosition: isRunning ? ["0% 50%", "100% 50%"] : "0% 50%"
                  }}
                  transition={{ 
                    x: { duration: 0.5 },
                    backgroundPosition: { duration: 2, repeat: Infinity, ease: "linear" }
                  }}
                />
                <div className="relative h-full flex items-center justify-center">
                  <span className="text-xs font-medium text-foreground/80">
                    {progress.phase}
                  </span>
                </div>
              </div>

              {/* Stats Grid */}
              {progress.stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                  {[
                    {
                      label: 'New Artists',
                      value: progress.stats.artistsAdded,
                      gradient: 'from-blue-500/10 to-blue-600/10',
                      color: 'text-blue-600'
                    },
                    {
                      label: 'Updated Artists',
                      value: progress.stats.artistsUpdated,
                      gradient: 'from-indigo-500/10 to-indigo-600/10',
                      color: 'text-indigo-600'
                    },
                    {
                      label: 'New Events',
                      value: progress.stats.eventsAdded,
                      gradient: 'from-green-500/10 to-green-600/10',
                      color: 'text-green-600'
                    },
                    {
                      label: 'Updated Events',
                      value: progress.stats.eventsUpdated,
                      gradient: 'from-emerald-500/10 to-emerald-600/10',
                      color: 'text-emerald-600'
                    },
                    {
                      label: 'Lineups Parsed',
                      value: progress.stats.lineupsParsed,
                      gradient: 'from-purple-500/10 to-purple-600/10',
                      color: 'text-purple-600'
                    },
                    {
                      label: 'Artists Found',
                      value: progress.stats.artistsFound,
                      gradient: 'from-amber-500/10 to-amber-600/10',
                      color: 'text-amber-600'
                    },
                    {
                      label: 'Links Created',
                      value: progress.stats.linksCreated,
                      gradient: 'from-orange-500/10 to-orange-600/10',
                      color: 'text-orange-600'
                    },
                    {
                      label: 'Artists Enriched',
                      value: progress.stats.artistsEnriched,
                      gradient: 'from-pink-500/10 to-pink-600/10',
                      color: 'text-pink-600'
                    },
                    {
                      label: 'Total Processed',
                      value: progress.stats.totalProcessed,
                      gradient: 'from-red-500/10 to-red-600/10',
                      color: 'text-red-600'
                    }
                  ].map((stat, idx) => (
                    <motion.div
                      key={stat.label}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`bg-gradient-to-br ${stat.gradient} p-3 rounded-lg`}
                    >
                      <div className={`text-2xl font-bold ${stat.color}`}>
                        {stat.value}
                      </div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Visual Logging System */}
              {progress.logs && progress.logs.length > 0 && (
                <VisualLoggingSystem
                  logs={progress.logs}
                  isRunning={isRunning}
                  onClearLogs={() => {
                    // Clear logs by resetting the scraper
                    resetScraper();
                  }}
                  onExportLogs={() => {
                    // Export logs functionality
                    const logData = progress.logs.map(log => ({
                      timestamp: log.timestamp,
                      level: log.level,
                      category: log.category,
                      message: log.message,
                      visualData: log.visualData,
                      duration: log.duration,
                      metadata: log.metadata
                    }));

                    const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `ade-master-scraper-logs-${new Date().toISOString().split('T')[0]}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  className="mt-6"
                />
              )}

              {/* Completion Summary */}
              {progress.completed && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.5 }}
                    className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 mb-4"
                  >
                    <CheckCircle className="w-10 h-10 text-green-500" />
                  </motion.div>
                  <h3 className="text-2xl font-bold mb-2">Master Scraper Complete! 🎉</h3>
                  <p className="text-muted-foreground mb-6">
                    All data has been processed successfully
                  </p>
                  
                  {progress.totalTime && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mb-6">
                      <div className="bg-card p-4 rounded-lg">
                        <div className="text-2xl font-bold flex items-center justify-center gap-2">
                          <Clock className="w-5 h-5" />
                          {progress.totalTime}s
                        </div>
                        <div className="text-xs text-muted-foreground">Total Time</div>
                      </div>
                      <div className="bg-card p-4 rounded-lg">
                        <div className="text-2xl font-bold flex items-center justify-center gap-2">
                          <Activity className="w-5 h-5" />
                          {progress.successRate}%
                        </div>
                        <div className="text-xs text-muted-foreground">Success Rate</div>
                      </div>
                      <div className="bg-card p-4 rounded-lg">
                        <div className="text-2xl font-bold flex items-center justify-center gap-2">
                          <BarChart3 className="w-5 h-5" />
                          {progress.stats.totalProcessed}
                        </div>
                        <div className="text-xs text-muted-foreground">Items Processed</div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Info Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Data Sources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Featured Festival Source API
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Event Web Pages
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Spotify API
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Processing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Smart Data Cleaning
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Duplicate Detection
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Error Handling
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Missing Data Detection
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Connection Mapping
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Statistics Generation
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
