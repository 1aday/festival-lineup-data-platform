"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { SyncProgress } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users
} from "lucide-react";

interface SyncProgressCardProps {
  progress: SyncProgress;
  isRunning: boolean;
}

export function SyncProgressCard({ progress, isRunning }: SyncProgressCardProps) {
  const getStatusIcon = () => {
    switch (progress.status) {
      case 'idle':
        return <Clock className="w-5 h-5" />;
      case 'fetching':
        return <Download className="w-5 h-5 animate-pulse" />;
      case 'processing':
        return <RefreshCw className="w-5 h-5 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusBadgeClasses = () => {
    switch (progress.status) {
      case 'fetching':
      case 'processing':
        return 'border-primary/60 bg-primary/10 text-primary';
      case 'completed':
        return 'border-emerald-500/60 bg-emerald-500/10 text-emerald-500';
      case 'error':
        return 'border-red-500/60 bg-red-500/10 text-red-500';
      case 'idle':
      default:
        return 'border-border bg-background text-muted-foreground';
    }
  };

  const progressPercent = progress.totalPages 
    ? (progress.currentPage / progress.totalPages) * 100 
    : isRunning ? 50 : 0;

  const recentLogs = progress.logs.slice(-8);
  const getLogColor = (level: string) => {
    switch (level) {
      case 'success':
        return 'text-green-500';
      case 'warning':
        return 'text-yellow-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-blue-500';
    }
  };

  return (
    <Card className="relative overflow-hidden border border-primary/20 bg-background/80 backdrop-blur-sm shadow-sm">
      {isRunning && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 opacity-60 animate-pulse" />
      )}

      <CardHeader className="relative z-10">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              {getStatusIcon()}
              Manual sync monitor
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Track targeted fetches launched from advanced controls.
            </CardDescription>
          </div>
          <Badge variant="outline" className={`gap-2 ${getStatusBadgeClasses()}`}>
            <span className="h-2 w-2 rounded-full bg-current" />
            {progress.status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>Page {progress.currentPage || 0}</span>
          </div>
          <Progress value={progressPercent} className="h-2 overflow-hidden rounded-full bg-muted/40" />
        </div>

        {/* Stats Grid */}
        <div className="grid gap-3 sm:grid-cols-3">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-xl border border-primary/30 bg-primary/5 p-4"
          >
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <Download className="h-4 w-4" />
              Fetched
            </div>
            <p className="mt-2 text-2xl font-semibold text-primary">
              {progress.itemsFetched.toLocaleString()}
            </p>
          </motion.div>

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.08 }}
            className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4"
          >
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-500">
              <Users className="h-4 w-4" />
              New records
            </div>
            <p className="mt-2 text-2xl font-semibold text-emerald-500">
              {progress.newItemsAdded.toLocaleString()}
            </p>
          </motion.div>

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.16 }}
            className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4"
          >
            <div className="flex items-center gap-2 text-xs font-medium text-blue-500">
              <Upload className="h-4 w-4" />
              Updated
            </div>
            <p className="mt-2 text-2xl font-semibold text-blue-500">
              {progress.itemsUpdated.toLocaleString()}
            </p>
          </motion.div>
        </div>

        {/* Status Message */}
        <AnimatePresence mode="wait">
          <motion.div
            key={progress.message}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-xl border border-border/60 bg-background/90 px-4 py-3 text-sm text-center text-muted-foreground"
          >
            {progress.message}
          </motion.div>
        </AnimatePresence>

        {/* Current Batch Preview */}
        {progress.currentBatch.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Processing</p>
            <div className="flex flex-wrap gap-2">
              {progress.currentBatch.slice(0, 5).map((artist) => (
                <Badge key={artist.id} variant="outline" className="text-xs border-primary/40 text-primary">
                  {artist.title}
                </Badge>
              ))}
              {progress.currentBatch.length > 5 && (
                <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                  +{progress.currentBatch.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {recentLogs.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Activity</p>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-border/60 bg-background/90 p-3 space-y-1 font-mono text-[11px]">
              {recentLogs.map(log => (
                <div key={log.id} className={`flex items-start gap-2 ${getLogColor(log.level)}`}>
                  <span className="text-muted-foreground text-[10px] mt-[1px]">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span>{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
