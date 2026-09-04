"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { dbService } from "@/lib/db-service";
import { SyncHistory } from "@/lib/types";
import { isSupabaseConfigured } from "@/lib/supabase";
import { format, formatDistanceToNow } from "date-fns";
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Download,
  Users,
  RefreshCw,
  History
} from "lucide-react";

export function SyncHistoryCard() {
  const [history, setHistory] = useState<SyncHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!isSupabaseConfigured()) {
        setLoading(false);
        return;
      }

      try {
        const data = await dbService.getRecentSyncs(5);
        setHistory(data);
      } catch (error) {
        console.error('Error fetching sync history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
    const interval = setInterval(fetchHistory, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'in_progress':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="text-green-600 dark:text-green-400">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'in_progress':
        return <Badge>In Progress</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          Recent Sync History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!isSupabaseConfigured() ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Sync history requires Supabase configuration
            </p>
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              No sync history yet. Run your first sync to see results here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((sync) => (
              <div
                key={sync.id}
                className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(sync.status)}
                    <span className="text-sm font-medium">
                      {format(new Date(sync.started_at), 'MMM dd, HH:mm')}
                    </span>
                  </div>
                  {getStatusBadge(sync.status)}
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="flex items-center gap-1 text-xs">
                    <Download className="w-3 h-3 text-muted-foreground" />
                    <span>{sync.total_items_fetched} fetched</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <Users className="w-3 h-3 text-green-500" />
                    <span>{sync.new_items_added} new</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <RefreshCw className="w-3 h-3 text-blue-500" />
                    <span>{sync.items_updated} updated</span>
                  </div>
                </div>

                {sync.completed_at && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Completed {formatDistanceToNow(new Date(sync.completed_at), { addSuffix: true })}
                  </p>
                )}

                {sync.error_message && (
                  <p className="text-xs text-red-500 mt-2">
                    Error: {sync.error_message}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
