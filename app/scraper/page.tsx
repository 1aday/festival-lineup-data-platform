"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { SyncProgressCard } from "@/components/sync-progress-card";
import { StatisticsCard } from "@/components/statistics-card";
import { ArtistList } from "@/components/artist-list";
import { EventsList } from "@/components/events-list";
import { SyncHistoryCard } from "@/components/sync-history";
import { SupabaseCheck } from "@/components/supabase-check";
import { ArtistEventLinker } from "@/components/artist-event-linker";
import { useADESync } from "@/hooks/use-ade-sync";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Toaster } from "@/components/ui/sonner";
import { motion } from "framer-motion";
import { 
  Play, 
  Pause, 
  RefreshCw, 
  Settings,
  Database,
  Calendar,
  Sparkles,
  Zap,
  Shield,
  ChevronRight,
  Music,
  Users,
  Link2
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, addDays, subDays } from "date-fns";

export default function ScraperPage() {
  const [syncMode, setSyncMode] = useState<'artists' | 'events' | 'both'>('artists');
  const { progress, isRunning, startSync, resetSync } = useADESync(syncMode);
  const [autoSync, setAutoSync] = useState(false);
  const [customDates, setCustomDates] = useState(false);
  const [fromDate, setFromDate] = useState('2025-10-22');
  const [toDate, setToDate] = useState('2025-10-26');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [eventRefreshTrigger, setEventRefreshTrigger] = useState(0);
  
  // Comprehensive sync state
  const [comprehensiveSyncRunning, setComprehensiveSyncRunning] = useState(false);
  const [comprehensiveSyncProgress, setComprehensiveSyncProgress] = useState<any>(null);
  const [comprehensiveSyncSessionId, setComprehensiveSyncSessionId] = useState<string | null>(null);

  // Auto-refresh lists when sync completes
  useEffect(() => {
    if (progress.status === 'completed') {
      if (syncMode === 'artists' || syncMode === 'both') {
        setRefreshTrigger(prev => prev + 1);
      }
      if (syncMode === 'events' || syncMode === 'both') {
        setEventRefreshTrigger(prev => prev + 1);
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

  // Comprehensive sync handlers
  const startComprehensiveSync = async () => {
    if (comprehensiveSyncRunning) return;
    
    setComprehensiveSyncRunning(true);
    const sessionId = `comp-sync-${Date.now()}`;
    setComprehensiveSyncSessionId(sessionId);
    
    try {
      const response = await fetch('/api/comprehensive-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          options: {
            syncArtists: true,
            syncEvents: true,
            parseLineups: true,
            linkArtists: true,
            enrichArtists: true,
            checkMissing: true
          }
        })
      });
      
      if (response.ok) {
        // Start polling for progress
        const interval = setInterval(async () => {
          const progressResponse = await fetch(`/api/comprehensive-sync?sessionId=${sessionId}`);
          if (progressResponse.ok) {
            const progressData = await progressResponse.json();
            setComprehensiveSyncProgress(progressData);
            
            if (progressData.completed) {
              clearInterval(interval);
              setComprehensiveSyncRunning(false);
              setRefreshTrigger(prev => prev + 1);
              setEventRefreshTrigger(prev => prev + 1);
            }
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to start comprehensive sync:', error);
      setComprehensiveSyncRunning(false);
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
                ADE Artist Scraper
              </h1>
              <p className="text-muted-foreground">
                Sync and track Amsterdam Dance Event artists database
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
                {isRunning ? 'Syncing...' : 'Ready'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Supabase Configuration Check */}
        {!isSupabaseConfigured() && (
          <div className="mb-6">
            <SupabaseCheck />
          </div>
        )}

        {/* COMPREHENSIVE SYNC - MAIN FEATURE */}
        <Card className={`mb-8 ${comprehensiveSyncRunning ? 'border-primary shadow-lg shadow-primary/20' : 'border-border'} transition-all duration-500`}>
          <CardHeader className="pb-6 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <CardTitle className="text-3xl font-bold flex items-center gap-3">
                  <motion.div
                    animate={{ 
                      rotate: comprehensiveSyncRunning ? 360 : 0,
                      scale: comprehensiveSyncRunning ? [1, 1.2, 1] : 1 
                    }}
                    transition={{ 
                      rotate: { duration: 2, repeat: comprehensiveSyncRunning ? Infinity : 0, ease: "linear" },
                      scale: { duration: 1, repeat: comprehensiveSyncRunning ? Infinity : 0 }
                    }}
                  >
                    <Sparkles className="w-8 h-8 text-primary" />
                  </motion.div>
                  Comprehensive Sync
                  {comprehensiveSyncRunning && (
                    <Badge className="ml-2 animate-pulse bg-primary/20 text-primary">RUNNING</Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-base">
                  Complete ADE data synchronization with Spotify enrichment
                </CardDescription>
              </div>
              
              <Button
                onClick={startComprehensiveSync}
                disabled={comprehensiveSyncRunning || isRunning}
                size="lg"
                className={comprehensiveSyncRunning ? "opacity-50" : "shadow-lg hover:shadow-xl"}
                variant={comprehensiveSyncRunning ? "secondary" : "default"}
              >
                {comprehensiveSyncRunning ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-2" />
                    Start Full Sync
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="pt-6">
            {comprehensiveSyncProgress && comprehensiveSyncRunning && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Phase Progress */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold">
                        Phase: {comprehensiveSyncProgress.phase}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {comprehensiveSyncProgress.message}
                      </p>
                      {comprehensiveSyncProgress.currentItem && (
                        <p className="text-xs text-primary font-mono">
                          → {comprehensiveSyncProgress.currentItem}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-primary">
                        {Math.round(comprehensiveSyncProgress.progress)}%
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="relative h-6 bg-secondary/30 rounded-full overflow-hidden">
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_100%]"
                      initial={{ x: "-100%" }}
                      animate={{ 
                        x: `${comprehensiveSyncProgress.progress - 100}%`,
                        backgroundPosition: comprehensiveSyncRunning ? ["0% 50%", "100% 50%"] : "0% 50%"
                      }}
                      transition={{ 
                        x: { duration: 0.5 },
                        backgroundPosition: { duration: 2, repeat: Infinity, ease: "linear" }
                      }}
                    />
                    <div className="relative h-full flex items-center justify-center">
                      <span className="text-xs font-medium text-foreground/80">
                        {comprehensiveSyncProgress.phase}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                {comprehensiveSyncProgress.stats && (
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 p-3 rounded-lg"
                    >
                      <div className="text-2xl font-bold text-blue-600">
                        {comprehensiveSyncProgress.stats.artistsAdded + comprehensiveSyncProgress.stats.artistsUpdated}
                      </div>
                      <div className="text-xs text-muted-foreground">Artists</div>
                    </motion.div>
                    
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1 }}
                      className="bg-gradient-to-br from-green-500/10 to-green-600/10 p-3 rounded-lg"
                    >
                      <div className="text-2xl font-bold text-green-600">
                        {comprehensiveSyncProgress.stats.eventsAdded + comprehensiveSyncProgress.stats.eventsUpdated}
                      </div>
                      <div className="text-xs text-muted-foreground">Events</div>
                    </motion.div>
                    
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2 }}
                      className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 p-3 rounded-lg"
                    >
                      <div className="text-2xl font-bold text-purple-600">
                        {comprehensiveSyncProgress.stats.lineupsParsed}
                      </div>
                      <div className="text-xs text-muted-foreground">Lineups</div>
                    </motion.div>
                    
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3 }}
                      className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 p-3 rounded-lg"
                    >
                      <div className="text-2xl font-bold text-orange-600">
                        {comprehensiveSyncProgress.stats.linksCreated}
                      </div>
                      <div className="text-xs text-muted-foreground">Links</div>
                    </motion.div>
                    
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.4 }}
                      className="bg-gradient-to-br from-pink-500/10 to-pink-600/10 p-3 rounded-lg"
                    >
                      <div className="text-2xl font-bold text-pink-600">
                        {comprehensiveSyncProgress.stats.artistsEnriched}
                      </div>
                      <div className="text-xs text-muted-foreground">Enriched</div>
                    </motion.div>
                    
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5 }}
                      className="bg-gradient-to-br from-red-500/10 to-red-600/10 p-3 rounded-lg"
                    >
                      <div className="text-2xl font-bold text-red-600">
                        {comprehensiveSyncProgress.stats.artistsFound}
                      </div>
                      <div className="text-xs text-muted-foreground">Found</div>
                    </motion.div>
                  </div>
                )}

                {/* Live Logs */}
                {comprehensiveSyncProgress.logs && comprehensiveSyncProgress.logs.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Live Activity Log
                    </h4>
                    <div className="bg-black/5 dark:bg-white/5 rounded-lg p-3 max-h-32 overflow-y-auto font-mono text-xs space-y-1 scrollbar-hide">
                      {comprehensiveSyncProgress.logs.slice(-10).map((log, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`
                            ${log.includes('ERROR') ? 'text-red-500' : ''}
                            ${log.includes('WARNING') ? 'text-yellow-500' : ''}
                            ${log.includes('SUCCESS') ? 'text-green-500' : ''}
                            ${log.includes('INFO') ? 'text-blue-500' : ''}
                          `}
                        >
                          {log}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Completed State */}
            {comprehensiveSyncProgress && comprehensiveSyncProgress.completed && (
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
                  <Sparkles className="w-10 h-10 text-green-500" />
                </motion.div>
                <h3 className="text-2xl font-bold mb-2">Sync Complete! 🎉</h3>
                <p className="text-muted-foreground mb-6">
                  All data has been synchronized successfully
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                  <div className="bg-card p-4 rounded-lg">
                    <div className="text-2xl font-bold">
                      {comprehensiveSyncProgress.stats?.artistsAdded + comprehensiveSyncProgress.stats?.artistsUpdated || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Total Artists</div>
                  </div>
                  <div className="bg-card p-4 rounded-lg">
                    <div className="text-2xl font-bold">
                      {comprehensiveSyncProgress.stats?.eventsAdded + comprehensiveSyncProgress.stats?.eventsUpdated || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Total Events</div>
                  </div>
                  <div className="bg-card p-4 rounded-lg">
                    <div className="text-2xl font-bold">
                      {comprehensiveSyncProgress.stats?.linksCreated || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Connections Made</div>
                  </div>
                  <div className="bg-card p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-500">
                      {comprehensiveSyncProgress.stats?.artistsEnriched || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Spotify Enriched</div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Initial State */}
            {!comprehensiveSyncProgress && (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Database className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Ready to Sync</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                  This will perform a complete synchronization of all ADE data including artists, events, 
                  lineup parsing, connection mapping, and Spotify enrichment.
                </p>
                <div className="flex flex-wrap justify-center gap-2 text-xs">
                  <Badge variant="outline">1. Sync Artists</Badge>
                  <Badge variant="outline">2. Sync Events</Badge>
                  <Badge variant="outline">3. Parse Lineups</Badge>
                  <Badge variant="outline">4. Create Links</Badge>
                  <Badge variant="outline">5. Spotify Enrich</Badge>
                  <Badge variant="outline">6. Verify Data</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Controls & Progress */}
          <div className="lg:col-span-1 space-y-6">
            {/* Sync Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Sync Controls
                </CardTitle>
                <CardDescription>
                  Configure and start the artist sync process
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Sync Mode Selection */}
                <div className="space-y-2">
                  <Label htmlFor="sync-mode">What to Sync</Label>
                  <Select value={syncMode} onValueChange={(value) => setSyncMode(value as any)}>
                    <SelectTrigger id="sync-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="artists">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Artists Only
                        </div>
                      </SelectItem>
                      <SelectItem value="events">
                        <div className="flex items-center gap-2">
                          <Music className="w-4 h-4" />
                          Events Only
                        </div>
                      </SelectItem>
                      <SelectItem value="both">
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4" />
                          Both Artists & Events
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />
                
                {/* Date Range Settings */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="custom-dates">Custom Date Range</Label>
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
                        <Label htmlFor="from-date">From Date</Label>
                        <Input
                          id="from-date"
                          type="date"
                          value={fromDate}
                          onChange={(e) => setFromDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="to-date">To Date</Label>
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

                {/* Auto Sync */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-sync">Daily Auto Sync</Label>
                    <p className="text-xs text-muted-foreground">
                      Run sync automatically every day
                    </p>
                  </div>
                  <Switch
                    id="auto-sync"
                    checked={autoSync}
                    onCheckedChange={setAutoSync}
                    disabled={!isSupabaseConfigured()}
                  />
                </div>

                <Separator />

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button
                    onClick={handleStartSync}
                    disabled={isRunning}
                    className="w-full"
                    size="lg"
                  >
                    {isRunning ? (
                      <>
                        <Pause className="w-4 h-4 mr-2" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Start Sync
                      </>
                    )}
                  </Button>
                  
                  {progress.status === 'completed' && (
                    <Button
                      onClick={resetSync}
                      variant="outline"
                      className="w-full"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reset
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Progress Card */}
            <SyncProgressCard progress={progress} isRunning={isRunning} />
          </div>

          {/* Right Column - Data & Stats */}
          <div className="lg:col-span-2 space-y-6">
            {/* Statistics */}
            <StatisticsCard />

            {/* Tabs for History and Artists */}
            <Tabs defaultValue="artists" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="artists">
                  <Database className="w-4 h-4 mr-2" />
                  Artists
                </TabsTrigger>
                <TabsTrigger value="linking">
                  <Link2 className="w-4 h-4 mr-2" />
                  Linking
                </TabsTrigger>
                <TabsTrigger value="history">
                  <Calendar className="w-4 h-4 mr-2" />
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
        </div>
      </div>
    </div>
  );
}
