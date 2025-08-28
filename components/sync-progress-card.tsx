"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const getStatusColor = () => {
    switch (progress.status) {
      case 'idle':
        return 'secondary';
      case 'fetching':
      case 'processing':
        return 'default';
      case 'completed':
        return 'outline';
      case 'error':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const progressPercent = progress.totalPages 
    ? (progress.currentPage / progress.totalPages) * 100 
    : isRunning ? 50 : 0;

  return (
    <Card className="relative overflow-hidden">
      {/* Animated background gradient */}
      {isRunning && (
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 animate-pulse" />
      )}
      
      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Sync Progress
          </CardTitle>
          <Badge variant={getStatusColor() as any}>
            {progress.status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="relative space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progress</span>
            <span>Page {progress.currentPage || 0}</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center p-3 rounded-lg bg-muted/50"
          >
            <Download className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold text-primary">
              {progress.itemsFetched.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Fetched</p>
          </motion.div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-center p-3 rounded-lg bg-green-500/10"
          >
            <Users className="w-4 h-4 mx-auto mb-1 text-green-500" />
            <p className="text-2xl font-bold text-green-500">
              {progress.newItemsAdded.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">New</p>
          </motion.div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center p-3 rounded-lg bg-blue-500/10"
          >
            <Upload className="w-4 h-4 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold text-blue-500">
              {progress.itemsUpdated.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Updated</p>
          </motion.div>
        </div>

        {/* Status Message */}
        <AnimatePresence mode="wait">
          <motion.div
            key={progress.message}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 rounded-lg bg-muted/30 border"
          >
            <p className="text-sm text-center">
              {progress.message}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Current Batch Preview */}
        {progress.currentBatch.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Processing Artists:</p>
            <div className="flex flex-wrap gap-1">
              {progress.currentBatch.slice(0, 5).map((artist) => (
                <Badge key={artist.id} variant="outline" className="text-xs">
                  {artist.title}
                </Badge>
              ))}
              {progress.currentBatch.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{progress.currentBatch.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
