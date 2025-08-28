'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, RefreshCw, Music, Database } from 'lucide-react';
import { toast } from 'sonner';

export function PreviewCacheInfo() {
  const [cacheStats, setCacheStats] = useState<{
    cached: number;
    total: number;
    rateLimited: boolean;
  }>({ cached: 0, total: 0, rateLimited: false });
  const [isPreCaching, setIsPreCaching] = useState(false);
  
  useEffect(() => {
    // Check localStorage for cached previews
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('spotify_preview_cache');
        if (stored) {
          const entries = JSON.parse(stored);
          setCacheStats(prev => ({ ...prev, cached: entries.length }));
        }
      } catch (e) {
        console.error('Failed to read cache:', e);
      }
    }
  }, []);
  
  const preCacheAll = async () => {
    setIsPreCaching(true);
    try {
      // Get all artists from the page (you'll need to pass this as a prop in real usage)
      const response = await fetch('/api/spotify/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistNames: [] // This should be populated with actual artist names
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success(`Cached ${data.fetched} new preview URLs`);
        setCacheStats({
          cached: data.cached + data.fetched,
          total: data.results.length,
          rateLimited: false,
        });
      }
    } catch (error) {
      console.error('Pre-caching error:', error);
      toast.error('Failed to pre-cache preview URLs');
    } finally {
      setIsPreCaching(false);
    }
  };
  
  const clearCache = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('spotify_preview_cache');
      setCacheStats({ cached: 0, total: 0, rateLimited: false });
      toast.success('Preview cache cleared');
    }
  };
  
  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Database className="h-4 w-4" />
          Preview Cache Status
        </CardTitle>
        <CardDescription className="text-xs">
          Cached preview URLs to avoid Spotify rate limits
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Cached previews:</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {cacheStats.cached}
          </Badge>
        </div>
        
        {cacheStats.rateLimited && (
          <div className="flex items-center gap-2 p-2 bg-orange-500/10 rounded-lg">
            <AlertCircle className="h-3 w-3 text-orange-500" />
            <span className="text-xs text-orange-500">
              Rate limited - using cached data
            </span>
          </div>
        )}
        
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={preCacheAll}
            disabled={isPreCaching}
            className="text-xs h-7"
          >
            {isPreCaching ? (
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <CheckCircle className="h-3 w-3 mr-1" />
            )}
            Pre-cache
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={clearCache}
            className="text-xs h-7"
          >
            Clear cache
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
