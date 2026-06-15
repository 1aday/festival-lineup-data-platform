"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoggingSystem } from "@/components/logging-system";
import { motion } from "framer-motion";
import { Play, Pause, RotateCcw, Zap, Database, Users, Calendar, Link2, Music, BarChart3 } from "lucide-react";

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error' | 'debug';
  category: 'sync' | 'parse' | 'enrich' | 'link' | 'analysis' | 'system';
  message: string;
  details?: any;
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

export default function LoggingDemoPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [logCounter, setLogCounter] = useState(0);

  const generateLog = (): LogEntry => {
    const levels: Array<'info' | 'success' | 'warning' | 'error' | 'debug'> = ['info', 'success', 'warning', 'error', 'debug'];
    const categories: Array<'sync' | 'parse' | 'enrich' | 'link' | 'analysis' | 'system'> = ['sync', 'parse', 'enrich', 'link', 'analysis', 'system'];
    
    const level = levels[Math.floor(Math.random() * levels.length)];
    const category = categories[Math.floor(Math.random() * categories.length)];
    
    const messages = {
      sync: [
        "🚀 Starting artist synchronization",
        "📥 Fetched page 1: 50 artists",
        "✅ Added artist: Deadmau5",
        "🔄 Updated artist: Skrillex",
        "❌ Failed to sync artist: Invalid data format"
      ],
      parse: [
        "🔍 Parsing lineup for event: Featured Festival Opening",
        "📋 Found 12 artists in lineup",
        "✅ Successfully parsed event page",
        "⚠️ Partial lineup found - some artists missing",
        "❌ Failed to parse event: Page not found"
      ],
      enrich: [
        "🎵 Enriching artist with Spotify data",
        "✅ Found Spotify profile for artist",
        "📊 Added audio features and genres",
        "⚠️ Limited Spotify data available",
        "❌ Spotify API rate limit exceeded"
      ],
      link: [
        "🔗 Creating artist-event connections",
        "✅ Linked artist to event successfully",
        "📊 Calculated confidence score: 0.95",
        "⚠️ Low confidence match found",
        "❌ Failed to create link: Artist not found"
      ],
      analysis: [
        "📊 Analyzing data quality",
        "✅ Data validation passed",
        "📈 Generated performance metrics",
        "⚠️ Found 5 data inconsistencies",
        "❌ Analysis failed: Insufficient data"
      ],
      system: [
        "⚙️ System initialization complete",
        "🔄 Processing batch 3 of 10",
        "⏱️ Rate limiting applied",
        "💾 Saving progress to database",
        "🚨 Critical error detected"
      ]
    };

    const message = messages[category][Math.floor(Math.random() * messages[category].length)];
    
    const metadata = {
      artistId: Math.random() > 0.5 ? `artist_${Math.floor(Math.random() * 1000)}` : undefined,
      eventId: Math.random() > 0.5 ? `event_${Math.floor(Math.random() * 100)}` : undefined,
      batchSize: Math.floor(Math.random() * 20) + 1,
      retryCount: Math.random() > 0.8 ? Math.floor(Math.random() * 3) + 1 : undefined,
      errorCode: level === 'error' ? `ERR_${Math.floor(Math.random() * 999).toString().padStart(3, '0')}` : undefined
    };

    return {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details: Math.random() > 0.7 ? {
        stack: level === 'error' ? 'Error: Failed to process request\n    at processArtist (scraper.js:45:12)\n    at async main (scraper.js:23:8)' : undefined,
        response: level === 'success' ? { status: 200, data: { id: 123, name: 'Test Artist' } } : undefined,
        config: { timeout: 5000, retries: 3 }
      } : undefined,
      duration: Math.random() > 0.5 ? Math.floor(Math.random() * 2000) + 100 : undefined,
      progress: Math.random() > 0.8 ? Math.floor(Math.random() * 100) : undefined,
      metadata
    };
  };

  const startDemo = () => {
    setIsRunning(true);
    setLogCounter(0);
  };

  const stopDemo = () => {
    setIsRunning(false);
  };

  const clearLogs = () => {
    setLogs([]);
    setLogCounter(0);
  };

  const addRandomLog = () => {
    const newLog = generateLog();
    setLogs(prev => [...prev, newLog]);
    setLogCounter(prev => prev + 1);
  };

  // Auto-generate logs when running
  useEffect(() => {
    if (isRunning) {
      const interval = setInterval(() => {
        addRandomLog();
      }, Math.random() * 2000 + 500); // Random interval between 0.5-2.5 seconds

      return () => clearInterval(interval);
    }
  }, [isRunning]);

  return (
    <div className="min-h-screen bg-background">
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
                  <Zap className="w-8 h-8 text-primary" />
                </motion.div>
                Logging System Demo
              </h1>
              <p className="text-muted-foreground">
                Experience the stunning detailed logging UI/UX system
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={isRunning ? stopDemo : startDemo}
                variant={isRunning ? "destructive" : "default"}
                size="lg"
                className="gap-2"
              >
                {isRunning ? (
                  <>
                    <Pause className="w-4 h-4" />
                    Stop Demo
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Start Demo
                  </>
                )}
              </Button>
              
              <Button
                onClick={addRandomLog}
                variant="outline"
                size="lg"
                className="gap-2"
              >
                <Zap className="w-4 h-4" />
                Add Log
              </Button>
              
              <Button
                onClick={clearLogs}
                variant="outline"
                size="lg"
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Clear
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Demo Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Demo Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-blue-600">Real-time Logging</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Live log generation</li>
                  <li>• Animated progress indicators</li>
                  <li>• Auto-scroll to latest</li>
                  <li>• Timestamp precision</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold text-green-600">Advanced Filtering</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Search by message content</li>
                  <li>• Filter by log level</li>
                  <li>• Filter by category</li>
                  <li>• Sort by time</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold text-purple-600">Rich Metadata</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Artist/Event IDs</li>
                  <li>• Performance metrics</li>
                  <li>• Error codes & stacks</li>
                  <li>• Batch information</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold text-orange-600">Visual Design</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Color-coded categories</li>
                  <li>• Smooth animations</li>
                  <li>• Expandable details</li>
                  <li>• Progress bars</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold text-pink-600">Statistics</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Real-time counters</li>
                  <li>• Error rate tracking</li>
                  <li>• Success metrics</li>
                  <li>• Performance data</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold text-indigo-600">Export & Tools</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• JSON export</li>
                  <li>• Log clearing</li>
                  <li>• Minimize/maximize</li>
                  <li>• Compact mode</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logging System */}
        <LoggingSystem
          logs={logs}
          isRunning={isRunning}
          onClearLogs={clearLogs}
          onExportLogs={() => {
            const logData = logs.map(log => ({
              timestamp: log.timestamp,
              level: log.level,
              category: log.category,
              message: log.message,
              details: log.details,
              duration: log.duration,
              metadata: log.metadata
            }));

            const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ade-logging-demo-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }}
        />

        {/* Demo Stats */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Demo Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{logs.length}</div>
                <div className="text-sm text-muted-foreground">Total Logs</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {logs.filter(log => log.level === 'success').length}
                </div>
                <div className="text-sm text-muted-foreground">Success</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">
                  {logs.filter(log => log.level === 'error').length}
                </div>
                <div className="text-sm text-muted-foreground">Errors</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {isRunning ? 'Live' : 'Paused'}
                </div>
                <div className="text-sm text-muted-foreground">Status</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
