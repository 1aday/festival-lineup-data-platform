"use client";

import { useState, useEffect, useMemo, type ComponentType } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { SyncProgressCard } from "@/components/sync-progress-card";
import { StatisticsCard } from "@/components/statistics-card";
import { ArtistList } from "@/components/artist-list";
import { SyncHistoryCard } from "@/components/sync-history";
import { SupabaseCheck } from "@/components/supabase-check";
import { ArtistEventLinker } from "@/components/artist-event-linker";
import { useADESync } from "@/hooks/use-ade-sync";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Toaster } from "@/components/ui/sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger
} from "@/components/ui/sheet";
import {
  Play,
  Pause,
  RefreshCw,
  Settings,
  Database,
  Calendar,
  Sparkles,
  Shield,
  Music,
  Users,
  Link2,
  Search,
  Globe2,
  Activity,
  BarChart3
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

const comprehensiveTimeline = [
  {
    phase: 'Syncing Artists',
    title: 'Sync featured festival artists',
    description: 'Pull the latest roster from the current featured festival source API.',
    icon: Users
  },
  {
    phase: 'Syncing Events',
    title: 'Sync events & venues',
    description: 'Import every event slot and location update.',
    icon: Calendar
  },
  {
    phase: 'Parsing Lineups',
    title: 'Parse lineups',
    description: 'Break down event lineups into individual artists.',
    icon: Search
  },
  {
    phase: 'Linking Artists',
    title: 'Link artists ↔ events',
    description: 'Match performers with every appearance across the featured festival.',
    icon: Link2
  },
  {
    phase: 'Scraping Artist Pages',
    title: 'Scrape artist pages',
    description: 'Capture Spotify and social metadata from featured festival pages.',
    icon: Globe2
  },
  {
    phase: 'Enriching Artists',
    title: 'Enrich on Spotify',
    description: 'Pull audio features, popularity, and profile insights.',
    icon: Music
  },
  {
    phase: 'Analyzing Data',
    title: 'Analyze quality',
    description: 'Detect gaps, retries, and missing entities.',
    icon: Activity
  },
  {
    phase: 'Generating Stats',
    title: 'Generate stats',
    description: 'Roll up dashboards and reporting snapshots.',
    icon: BarChart3
  },
  {
    phase: 'Complete',
    title: 'Pipeline complete',
    description: 'Everything refreshed and stored in Supabase.',
    icon: Sparkles
  }
];

const formatDuration = (ms) => {
  if (!ms || Number.isNaN(ms) || ms < 0) return '—';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
};

type StageStatus = 'upcoming' | 'active' | 'complete';

interface StageViewModel {
  phase: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  status: StageStatus;
  stats: Array<{ label: string; value: string; accent?: 'positive' | 'warning' | 'neutral' }>;
  highlight?: string;
}

interface MasterSyncStats {
  artistsAdded?: number;
  artistsUpdated?: number;
  eventsAdded?: number;
  eventsUpdated?: number;
  lineupsParsed?: number;
  artistsFound?: number;
  linksCreated?: number;
  artistsEnriched?: number;
  enrichmentErrors?: number;
  missingEvents?: unknown[];
  missingArtists?: unknown[];
  totalProcessed?: number;
  errors?: number;
  runDuration?: number;
}

interface MasterSyncVisualItem {
  id: string;
  name: string;
  image?: string;
  subtitle?: string;
}

interface MasterSyncVisualData {
  type: string;
  items: MasterSyncVisualItem[];
  count: number;
  total?: number;
}

interface MasterSyncLogEntry {
  id: string;
  timestamp: string;
  level: string;
  category?: string;
  message: string;
  visualData?: MasterSyncVisualData;
  metadata?: Record<string, unknown>;
  duration?: number;
  progress?: number;
}

interface MasterSyncProgress {
  phase: string;
  progress: number;
  message: string;
  currentItem?: string;
  completed: boolean;
  stats?: MasterSyncStats;
  logs: MasterSyncLogEntry[];
  startTime?: string;
  estimatedTimeRemaining?: string;
}

const formatNumber = (value?: number | null) => {
  if (value === undefined || value === null) return '0';
  return Number(value).toLocaleString();
};

const buildStageStats = (phase: string, stats?: MasterSyncStats): Array<{ label: string; value: string; accent?: 'positive' | 'warning' | 'neutral' }> => {
  if (!stats) return [];

  const stageStats = {
    'Syncing Artists': [
      { label: 'New artists', value: formatNumber(stats.artistsAdded), accent: 'positive' },
      { label: 'Updated', value: formatNumber(stats.artistsUpdated), accent: 'neutral' }
    ],
    'Syncing Events': [
      { label: 'New events', value: formatNumber(stats.eventsAdded), accent: 'positive' },
      { label: 'Updated', value: formatNumber(stats.eventsUpdated), accent: 'neutral' }
    ],
    'Parsing Lineups': [
      { label: 'Lineups parsed', value: formatNumber(stats.lineupsParsed), accent: 'positive' }
    ],
    'Linking Artists': [
      { label: 'Links created', value: formatNumber(stats.linksCreated), accent: 'positive' }
    ],
    'Scraping Artist Pages': [
      { label: 'Profiles found', value: formatNumber(stats.artistsFound), accent: 'positive' }
    ],
    'Enriching Artists': [
      { label: 'Spotify enrichments', value: formatNumber(stats.artistsEnriched), accent: 'positive' },
      { label: 'Errors', value: formatNumber(stats.enrichmentErrors), accent: 'warning' }
    ],
    'Analyzing Data': [
      { label: 'Missing artists', value: formatNumber(stats.missingArtists?.length), accent: 'warning' },
      { label: 'Missing events', value: formatNumber(stats.missingEvents?.length), accent: 'warning' },
      { label: 'Alerts', value: formatNumber(stats.errors), accent: 'warning' }
    ],
    'Generating Stats': [
      { label: 'Items processed', value: formatNumber(stats.totalProcessed), accent: 'positive' }
    ],
    'Complete': [
      { label: 'Total processed', value: formatNumber(stats.totalProcessed), accent: 'positive' },
      { label: 'Run duration', value: stats.runDuration ? formatDuration(stats.runDuration) : '—', accent: 'neutral' }
    ]
  };

  return stageStats[phase as keyof typeof stageStats] || [];
};

const computeStageTimeline = (progress: MasterSyncProgress | null): StageViewModel[] => {
  const stats = progress?.stats;
  const logs = progress?.logs || [];
  const currentPhase = progress?.phase;
  const currentIndex = comprehensiveTimeline.findIndex(stage => stage.phase === currentPhase);
  const isComplete = Boolean(progress?.completed);

  return comprehensiveTimeline.map((stage, index) => {
    let status: StageStatus = 'upcoming';

    if (isComplete && stage.phase === 'Complete') {
      status = 'complete';
    } else if (currentIndex === -1) {
      status = 'upcoming';
    } else if (index < currentIndex) {
      status = 'complete';
    } else if (index === currentIndex) {
      status = isComplete && stage.phase !== 'Complete' ? 'complete' : 'active';
    }

    let highlight: string | undefined;
    if (stage.phase === currentPhase && progress?.message) {
      highlight = progress.message;
    } else if (status === 'complete') {
      const matchingLog = logs
        .slice()
        .reverse()
        .find((log: MasterSyncLogEntry) => typeof log?.message === 'string' && log.message.toLowerCase().includes(stage.phase.split(' ')[0].toLowerCase()));
      if (matchingLog) {
        highlight = matchingLog.message;
      }
    }

    return {
      ...stage,
      status,
      stats: buildStageStats(stage.phase, stats),
      highlight
    };
  });
};

export default function ScraperPage() {
  const [syncMode, setSyncMode] = useState<'artists' | 'events' | 'both'>('artists');
  const { progress, isRunning, startSync, resetSync } = useADESync(syncMode);
  const [autoSync, setAutoSync] = useState(false);
  const [customDates, setCustomDates] = useState(false);
  const [fromDate, setFromDate] = useState('2025-10-22');
  const [toDate, setToDate] = useState('2025-10-26');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Comprehensive sync state
  const [comprehensiveSyncRunning, setComprehensiveSyncRunning] = useState(false);
  const [comprehensiveSyncProgress, setComprehensiveSyncProgress] = useState<MasterSyncProgress | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [logFilter, setLogFilter] = useState<'all' | 'alerts'>('all');

  // Auto-refresh lists when sync completes
  useEffect(() => {
    if (progress.status === 'completed') {
      if (syncMode === 'artists' || syncMode === 'both') {
        setRefreshTrigger(prev => prev + 1);
      }
    }
  }, [progress.status, syncMode]);

  const handleStartSync = async () => {
    if (isRunning) return;
    
    const dates = customDates ? { from: fromDate, to: toDate } : undefined;
    await startSync(dates?.from, dates?.to);
    // Trigger refresh of artist list after sync
    setRefreshTrigger(prev => prev + 1);
  };

  const stageTimeline = useMemo(() => computeStageTimeline(comprehensiveSyncProgress), [comprehensiveSyncProgress]);
  const currentStage = useMemo(() => stageTimeline.find(stage => stage.status === 'active') || stageTimeline[0], [stageTimeline]);
  const visualPayloads = useMemo<MasterSyncLogEntry[]>(() => {
    if (!comprehensiveSyncProgress?.logs) return [];
    return comprehensiveSyncProgress.logs
      .filter((log: MasterSyncLogEntry) => log?.visualData?.items?.length)
      .slice(-6)
      .reverse();
  }, [comprehensiveSyncProgress?.logs]);

  const filteredLogs = useMemo<MasterSyncLogEntry[]>(() => {
    if (!comprehensiveSyncProgress?.logs) return [];
    if (logFilter === 'all') return comprehensiveSyncProgress.logs.slice(-120);
    return comprehensiveSyncProgress.logs.filter((log: MasterSyncLogEntry) => log?.level === 'warning' || log?.level === 'error');
  }, [comprehensiveSyncProgress?.logs, logFilter]);

  const activeStageIndex = stageTimeline.findIndex(stage => stage.status === 'active');
  const stagePosition = comprehensiveSyncProgress?.completed
    ? stageTimeline.length
    : activeStageIndex === -1
      ? 1
      : activeStageIndex + 1;
  const progressPercent = Math.round(comprehensiveSyncProgress?.progress ?? 0);
  const runStartedAt = comprehensiveSyncProgress?.startTime
    ? new Date(comprehensiveSyncProgress.startTime)
    : null;
  const runDurationLabel = runStartedAt && !comprehensiveSyncProgress?.completed
    ? formatDuration(Date.now() - runStartedAt.getTime())
    : null;
  const runStartedLabel = runStartedAt ? format(runStartedAt, "PP p") : null;

  const getLogColor = (level: string) => {
    switch (level) {
      case 'success':
        return 'text-green-500';
      case 'warning':
        return 'text-amber-500';
      case 'error':
        return 'text-red-500';
      case 'debug':
        return 'text-purple-500';
      default:
        return 'text-blue-500';
    }
  };

  // Comprehensive sync handlers
  const startComprehensiveSync = async () => {
    if (comprehensiveSyncRunning) return;
    
    setComprehensiveSyncRunning(true);
    setComprehensiveSyncProgress(null);
    const sessionId = `comp-sync-${Date.now()}`;

    try {
      const response = await fetch('/api/master-scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          options: {
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
          }
        })
      });
      
      if (response.ok) {
        // Start polling for progress
        const interval = setInterval(async () => {
          const progressResponse = await fetch(`/api/master-scraper?sessionId=${sessionId}`);
          if (progressResponse.ok) {
            const progressData = await progressResponse.json();
            setComprehensiveSyncProgress(progressData);
            
            if (progressData.completed) {
              clearInterval(interval);
              setComprehensiveSyncRunning(false);
              setRefreshTrigger(prev => prev + 1);
            }
          }
        }, 1000);
      } else {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.message || 'Failed to start master scraper');
      }
    } catch (error) {
      console.error('Failed to start comprehensive sync:', error);
      setComprehensiveSyncRunning(false);
      setComprehensiveSyncProgress(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />
      <div className="relative isolate">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-primary/10 via-secondary/5 to-transparent" />
      </div>
      <div className="relative container mx-auto px-4 py-10 space-y-10">
        {!isSupabaseConfigured() && (
          <div className="relative z-10">
            <SupabaseCheck />
          </div>
        )}

        <Card className="relative overflow-hidden border border-primary/20 shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/12 via-secondary/10 to-background" />
          <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-white/10 via-transparent to-transparent pointer-events-none" />
          <CardHeader className="relative z-10 pb-0">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-6 max-w-2xl">
                <Badge variant="outline" className="w-fit bg-background/70 uppercase tracking-wide">
                  Featured festival data pipeline
                </Badge>
                <div className="space-y-3">
                  <h1 className="text-4xl font-semibold tracking-tight">Featured Festival Master Scraper</h1>
                  <p className="text-muted-foreground leading-relaxed">
                    Run the featured festival pipeline: fetch artists and events, parse lineups, link appearances, capture official pages, and enrich everything with Spotify insights.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-xs sm:text-sm">
                  <Badge
                    variant={comprehensiveSyncRunning ? "default" : comprehensiveSyncProgress?.completed ? "outline" : "secondary"}
                    className="gap-2 px-3 py-1"
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${comprehensiveSyncRunning ? 'bg-primary animate-pulse' : comprehensiveSyncProgress?.completed ? 'bg-emerald-500' : 'bg-muted-foreground/50'}`}
                    />
                    {comprehensiveSyncRunning ? 'Running now' : comprehensiveSyncProgress?.completed ? 'Completed' : 'Standing by'}
                  </Badge>
                  <Badge variant="outline" className="px-3 py-1">
                    Stage {stagePosition} of {stageTimeline.length}
                  </Badge>
                  {runDurationLabel && (
                    <Badge variant="outline" className="px-3 py-1">
                      Elapsed {runDurationLabel}
                    </Badge>
                  )}
                  {comprehensiveSyncProgress?.estimatedTimeRemaining && !comprehensiveSyncProgress?.completed && (
                    <Badge variant="outline" className="px-3 py-1">
                      ETA {comprehensiveSyncProgress.estimatedTimeRemaining}
                    </Badge>
                  )}
                  {!isSupabaseConfigured() && (
                    <Badge variant="outline" className="gap-2 px-3 py-1">
                      <Shield className="h-3 w-3" />
                      Demo mode
                    </Badge>
                  )}
                </div>
                {comprehensiveSyncProgress?.currentItem && (
                  <p className="w-fit rounded-md border border-primary/20 bg-background/70 px-4 py-2 font-mono text-sm text-foreground/80 shadow-sm">
                    Focus: {comprehensiveSyncProgress.currentItem}
                  </p>
                )}
              </div>
              <div className="flex w-full max-w-xs flex-col gap-3">
                <Button
                  onClick={startComprehensiveSync}
                  disabled={comprehensiveSyncRunning || isRunning}
                  size="lg"
                  className="h-14 text-base font-medium shadow-lg transition-all hover:shadow-xl"
                >
                  {comprehensiveSyncRunning ? (
                    <>
                      <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                      Sync in progress
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      Start full sync
                    </>
                  )}
                </Button>
                <Sheet open={advancedOpen} onOpenChange={setAdvancedOpen}>
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>Need granular control?</span>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="sm" className="px-2">
                        <Settings className="mr-1 h-4 w-4" />
                        Advanced
                      </Button>
                    </SheetTrigger>
                  </div>
                  <SheetContent className="sm:max-w-3xl overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle>Advanced sync controls</SheetTitle>
                      <SheetDescription>
                        Target single resources, adjust date ranges, and manage manual runs.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="mt-6 space-y-8 pb-10">
                      <Card className="border-dashed border-border/60 bg-background/80">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            Manual sync controls
                          </CardTitle>
                          <CardDescription>
                            Run targeted artist or event fetches without triggering the master pipeline.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <div className="space-y-2">
                            <Label htmlFor="sync-mode">What to sync</Label>
                            <Select value={syncMode} onValueChange={(value) => setSyncMode(value as any)}>
                              <SelectTrigger id="sync-mode">
                                <SelectValue placeholder="Choose an option" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="artists">
                                  <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    Artists only
                                  </div>
                                </SelectItem>
                                <SelectItem value="events">
                                  <div className="flex items-center gap-2">
                                    <Music className="h-4 w-4" />
                                    Events only
                                  </div>
                                </SelectItem>
                                <SelectItem value="both">
                                  <div className="flex items-center gap-2">
                                    <Database className="h-4 w-4" />
                                    Artists & events
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <Separator />

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="custom-dates">Custom date range</Label>
                              <Switch
                                id="custom-dates"
                                checked={customDates}
                                onCheckedChange={setCustomDates}
                              />
                            </div>

                            {customDates && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="space-y-3"
                              >
                                <div className="space-y-2">
                                  <Label htmlFor="from-date">From date</Label>
                                  <Input
                                    id="from-date"
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="to-date">To date</Label>
                                  <Input
                                    id="to-date"
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                  />
                                </div>
                              </motion.div>
                            )}
                          </div>

                          <Separator />

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="auto-sync">Daily auto sync</Label>
                              <p className="text-xs text-muted-foreground">
                                Run this manual flow automatically every 24 hours.
                              </p>
                            </div>
                            <Switch
                              id="auto-sync"
                              checked={autoSync}
                              onCheckedChange={setAutoSync}
                              disabled={!isSupabaseConfigured()}
                            />
                          </div>

                          <div className="grid gap-2">
                            <Button
                              onClick={handleStartSync}
                              disabled={isRunning}
                              className="w-full"
                              size="lg"
                            >
                              {isRunning ? (
                                <>
                                  <Pause className="mr-2 h-4 w-4" />
                                  Syncing...
                                </>
                              ) : (
                                <>
                                  <Play className="mr-2 h-4 w-4" />
                                  Start sync
                                </>
                              )}
                            </Button>
                            {progress.status === 'completed' && (
                              <Button
                                onClick={resetSync}
                                variant="outline"
                                className="w-full"
                              >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Reset
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                      <p className="text-xs text-muted-foreground">
                        Manual runs stream their progress into the monitor on the right so you can continue browsing with this drawer closed.
                      </p>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10 pt-8">
            <div className="space-y-8">
              {comprehensiveSyncProgress?.completed && (
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 shadow-inner md:p-8"
                  >
                    <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-600">
                          <Sparkles className="h-4 w-4" />
                          Pipeline complete
                        </div>
                        <h2 className="text-2xl font-semibold">Fresh festival data is ready to explore</h2>
                        <p className="text-sm text-emerald-800/70 dark:text-emerald-100/80">
                          Artists, events, lineups, links, and Spotify insights were successfully refreshed.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button variant="outline" asChild>
                          <a href="/artists">Browse artists</a>
                        </Button>
                        <Button variant="outline" asChild>
                          <a href="/spotify-events">Inspect events</a>
                        </Button>
                      </div>
                    </div>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-xl border border-emerald-500/30 bg-background/80 p-4">
                        <p className="text-xs text-muted-foreground">Artists touched</p>
                        <p className="text-2xl font-semibold">
                          {(comprehensiveSyncProgress.stats?.artistsAdded || 0) + (comprehensiveSyncProgress.stats?.artistsUpdated || 0)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-emerald-500/30 bg-background/80 p-4">
                        <p className="text-xs text-muted-foreground">Events updated</p>
                        <p className="text-2xl font-semibold">
                          {(comprehensiveSyncProgress.stats?.eventsAdded || 0) + (comprehensiveSyncProgress.stats?.eventsUpdated || 0)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-emerald-500/30 bg-background/80 p-4">
                        <p className="text-xs text-muted-foreground">Links connected</p>
                        <p className="text-2xl font-semibold">{formatNumber(comprehensiveSyncProgress.stats?.linksCreated)}</p>
                      </div>
                      <div className="rounded-xl border border-emerald-500/30 bg-background/80 p-4">
                        <p className="text-xs text-muted-foreground">Spotify enrichments</p>
                        <p className="text-2xl font-semibold text-emerald-500">
                          {formatNumber(comprehensiveSyncProgress.stats?.artistsEnriched)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}

              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold tracking-tight">Pipeline timeline</h2>
                  <span className="text-xs text-muted-foreground">Follow every chapter in this run</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {stageTimeline.map((stage, index) => {
                    const Icon = stage.icon;
                    const statusLabel = stage.status === 'active' ? 'In progress' : stage.status === 'complete' ? 'Complete' : 'Queued';
                    const cardTone = stage.status === 'active'
                      ? 'border-primary/50 bg-primary/10 shadow-sm shadow-primary/10'
                      : stage.status === 'complete'
                        ? 'border-emerald-500/40 bg-emerald-500/10'
                        : 'border-border/60 bg-background/80';

                    return (
                      <motion.div
                        key={stage.phase}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className={`rounded-2xl border p-4 md:p-5 ${cardTone}`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-full border ${stage.status === 'active' ? 'border-primary/60 bg-background text-primary' : stage.status === 'complete' ? 'border-emerald-500/60 bg-background text-emerald-500' : 'border-border bg-background text-primary'}`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{stage.title}</p>
                              <p className="text-xs text-muted-foreground">{stage.description}</p>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-xs ${stage.status === 'complete' ? 'border-emerald-500/60 text-emerald-500' : stage.status === 'active' ? 'border-primary/60 text-primary' : 'border-border text-muted-foreground'}`}
                          >
                            {statusLabel}
                          </Badge>
                        </div>
                        {stage.highlight && (
                          <p className="mt-4 text-sm text-foreground/80">{stage.highlight}</p>
                        )}
                        {stage.stats.length > 0 && (
                          <div className="mt-4 grid gap-2 text-xs">
                            {stage.stats.map((stat) => (
                              <div
                                key={`${stage.phase}-${stat.label}`}
                                className="flex items-center justify-between rounded-lg border border-border/50 bg-background/70 px-3 py-2"
                              >
                                <span className="text-muted-foreground">{stat.label}</span>
                                <span className={`${stat.accent === 'positive' ? 'text-emerald-500' : stat.accent === 'warning' ? 'text-amber-500' : 'text-foreground'} font-medium`}>
                                  {stat.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-primary/30 bg-background/85 p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Now processing</p>
                      <h3 className="text-xl font-semibold">{currentStage?.title || 'Pipeline idle'}</h3>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {progressPercent}% complete
                    </Badge>
                  </div>
                  <p className="mt-3 min-h-[2.5rem] text-sm text-muted-foreground">
                    {comprehensiveSyncProgress?.message || 'Kick off the master run to watch live progress here.'}
                  </p>
                  <div className="mt-4">
                    <div className="relative h-2 rounded-full bg-muted">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-secondary to-primary transition-all"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {runStartedLabel && <span>Started {runStartedLabel}</span>}
                      {comprehensiveSyncProgress?.estimatedTimeRemaining && !comprehensiveSyncProgress?.completed && (
                        <span>ETA {comprehensiveSyncProgress.estimatedTimeRemaining}</span>
                      )}
                      {comprehensiveSyncProgress?.currentItem && (
                        <span className="font-mono text-foreground/80">Focus: {comprehensiveSyncProgress.currentItem}</span>
                      )}
                    </div>
                  </div>
                  {currentStage?.stats?.length > 0 && (
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      {currentStage.stats.map((stat) => (
                        <div
                          key={`${currentStage.phase}-${stat.label}`}
                          className="rounded-lg border border-border/60 bg-background px-3 py-3"
                        >
                          <p className="text-xs uppercase text-muted-foreground">{stat.label}</p>
                          <p className={`text-lg font-semibold ${stat.accent === 'positive' ? 'text-emerald-500' : stat.accent === 'warning' ? 'text-amber-500' : ''}`}>
                            {stat.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-border/60 bg-background/85 p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Live payloads</p>
                      <h3 className="text-lg font-semibold">What we are capturing</h3>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {visualPayloads.length > 0 ? `${visualPayloads[0]?.visualData?.count || visualPayloads.length} items` : 'Awaiting run'}
                    </Badge>
                  </div>
                  {visualPayloads.length > 0 ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {visualPayloads.slice(0, 4).map((payload) => (
                        <div
                          key={payload.id || payload.timestamp}
                          className="space-y-3 rounded-xl border border-border/50 bg-background px-4 py-4"
                        >
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="font-medium capitalize">{payload.visualData?.type}</span>
                            <span>{payload.visualData?.count}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {payload.visualData?.items?.slice(0, 3).map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center gap-2 rounded-lg border border-border/50 bg-background px-2 py-1"
                              >
                                {item.image && (
                                  <Image
                                    src={item.image}
                                    alt={item.name}
                                    width={32}
                                    height={32}
                                    className="h-8 w-8 rounded-md object-cover"
                                  />
                                )}
                                <div className="text-xs leading-tight">
                                  <p className="font-medium">{item.name}</p>
                                  {item.subtitle && <p className="text-muted-foreground">{item.subtitle}</p>}
                                </div>
                              </div>
                            ))}
                            {payload.visualData?.items?.length > 3 && (
                              <Badge variant="outline" className="text-[10px]">
                                +{payload.visualData.items.length - 3}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{payload.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-muted-foreground">
                      Launch a run to watch artists, events, and Spotify data appear in real time.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/85 p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Activity feed</p>
                    <h3 className="text-lg font-semibold">Latest events</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={logFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setLogFilter('all')}
                    >
                      All
                    </Button>
                    <Button
                      variant={logFilter === 'alerts' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setLogFilter('alerts')}
                    >
                      Alerts
                    </Button>
                  </div>
                </div>
                {filteredLogs.length > 0 ? (
                  <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-2">
                    <AnimatePresence initial={false}>
                      {filteredLogs.map((log) => (
                        <motion.div
                          key={log.id || `${log.timestamp}-${log.message}`}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                            <span className={`text-[11px] font-semibold ${getLogColor(log.level)}`}>
                              {(log.level || 'info').toUpperCase()}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-foreground/90">{log.message}</p>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">
                    {comprehensiveSyncRunning ? 'Waiting for the first events of this run...' : 'Kick off the pipeline to populate the feed.'}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="relative z-10 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <StatisticsCard />
            <Tabs defaultValue="artists" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="artists">
                  <Database className="mr-2 h-4 w-4" />
                  Artists
                </TabsTrigger>
                <TabsTrigger value="linking">
                  <Link2 className="mr-2 h-4 w-4" />
                  Linking
                </TabsTrigger>
                <TabsTrigger value="history">
                  <Calendar className="mr-2 h-4 w-4" />
                  History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="artists" className="mt-6">
                <ArtistList refreshTrigger={refreshTrigger} />
              </TabsContent>

              <TabsContent value="linking" className="mt-6">
                <ArtistEventLinker />
              </TabsContent>

              <TabsContent value="history" className="mt-6">
                <SyncHistoryCard />
              </TabsContent>
            </Tabs>
          </div>
          <div className="space-y-6">
            {(isRunning || progress.status !== 'idle' || progress.logs.length > 0) && (
              <SyncProgressCard progress={progress} isRunning={isRunning} />
            )}
          </div>
        </div>
      </div>
    </div>
  );

}
// @ts-nocheck
