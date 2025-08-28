'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link2, Users, Calendar, Zap, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { toast } from 'sonner';

interface LinkingStats {
  totalArtists: number;
  totalMatches: number;
  highConfidenceMatches: number;
  lowConfidenceMatches: number;
  averageConfidence?: number;
}

interface CurrentStats {
  totalLinks: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  averageConfidence: number;
}

export function ArtistEventLinker() {
  const [isLinking, setIsLinking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [stats, setStats] = useState<LinkingStats | null>(null);
  const [currentStats, setCurrentStats] = useState<CurrentStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadCurrentStats = async () => {
    setIsLoadingStats(true);
    try {
      const response = await fetch('/api/link-artists-events');
      if (response.ok) {
        const data = await response.json();
        setCurrentStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    loadCurrentStats();
    
    // Cleanup function to stop polling on unmount
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  const startLinking = async () => {
    setIsLinking(true);
    setProgress(0);
    setProgressMessage('Starting artist-event linking...');
    setStats(null);

    // Generate a unique session ID
    const newSessionId = `link-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    setSessionId(newSessionId);

    try {
      // Start the linking process
      const response = await fetch('/api/link-artists-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          mode: 'all',
          sessionId: newSessionId
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to link artists to events');
      }

      // Start polling for progress
      const interval = setInterval(async () => {
        try {
          const progressResponse = await fetch(`/api/link-artists-events/progress?sessionId=${newSessionId}`);
          if (progressResponse.ok) {
            const progressData = await progressResponse.json();
            
            setProgress(progressData.progress);
            setProgressMessage(progressData.message);
            
            if (progressData.completed) {
              // Stop polling
              clearInterval(interval);
              pollIntervalRef.current = null;
              setIsLinking(false);
              
              if (progressData.stats) {
                setStats(progressData.stats);
                toast.success(
                  `Linking complete! Found ${progressData.stats.totalMatches} matches for ${progressData.stats.totalArtists} artists.`
                );
                
                // Reload current stats
                await loadCurrentStats();
              }
            }
          }
        } catch (error) {
          console.error('Error polling progress:', error);
        }
      }, 500); // Poll every 500ms

      pollIntervalRef.current = interval;

    } catch (error) {
      console.error('Linking error:', error);
      toast.error('Failed to link artists to events');
      setProgressMessage('Linking failed. Check console for details.');
      setIsLinking(false);
      
      // Clean up polling if it exists
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="w-5 h-5" />
          Artist-Event Linking
        </CardTitle>
        <CardDescription>
          Automatically match artists to their events using smart name matching
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Stats */}
        {currentStats && (
          <div className="p-4 rounded-lg bg-muted/30 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Info className="w-4 h-4" />
              Current Database Status
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{currentStats.totalLinks}</div>
                <div className="text-xs text-muted-foreground">Total Links</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">{currentStats.highConfidence}</div>
                <div className="text-xs text-muted-foreground">High Conf</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-500">{currentStats.mediumConfidence}</div>
                <div className="text-xs text-muted-foreground">Med Conf</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">{currentStats.lowConfidence}</div>
                <div className="text-xs text-muted-foreground">Low Conf</div>
              </div>
            </div>
            {currentStats.averageConfidence > 0 && (
              <div className="flex items-center justify-center pt-2">
                <Badge variant="secondary">
                  Average Confidence: {(currentStats.averageConfidence * 100).toFixed(1)}%
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* How it works */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>How it works:</strong>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• Searches each artist name in all event titles and subtitles</li>
              <li>• Uses fuzzy matching to handle variations (DJ, Live, B2B, etc.)</li>
              <li>• Assigns confidence scores based on match quality</li>
              <li>• Creates linkages in the artist_events table</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Progress */}
        {isLinking && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progress</span>
              <span>{progress.toFixed(0)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground">{progressMessage}</p>
          </div>
        )}

        {/* Results */}
        {stats && (
          <div className="p-4 rounded-lg border bg-card space-y-4">
            <div className="flex items-center gap-2 font-medium text-green-600 dark:text-green-400">
              <CheckCircle className="w-5 h-5" />
              Linking Complete!
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  Artists Processed
                </div>
                <div className="text-2xl font-bold">{stats.totalArtists}</div>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  Total Matches
                </div>
                <div className="text-2xl font-bold text-primary">{stats.totalMatches}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Zap className="w-4 h-4 text-green-500" />
                  High Confidence
                </div>
                <div className="text-xl font-semibold text-green-600 dark:text-green-400">
                  {stats.highConfidenceMatches}
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                  Low Confidence
                </div>
                <div className="text-xl font-semibold text-yellow-600 dark:text-yellow-400">
                  {stats.lowConfidenceMatches}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-center">
          <Button
            onClick={startLinking}
            disabled={isLinking}
            size="lg"
            className="w-full sm:w-auto"
          >
            {isLinking ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Linking Artists to Events...
              </>
            ) : (
              <>
                <Link2 className="mr-2 h-4 w-4" />
                Start Artist-Event Linking
              </>
            )}
          </Button>
        </div>

        {/* Note */}
        <p className="text-xs text-center text-muted-foreground">
          This process analyzes all artists and events to find matches.
          It may take a few minutes depending on the database size.
        </p>
      </CardContent>
    </Card>
  );
}
