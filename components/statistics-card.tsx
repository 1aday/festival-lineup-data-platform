"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { dbService } from "@/lib/db-service";
import { isSupabaseConfigured } from "@/lib/supabase";
import { motion } from "framer-motion";
import {
  Users,
  Globe,
  Calendar,
  TrendingUp,
  Database,
  Clock
} from "lucide-react";
import { format } from "date-fns";

export function StatisticsCard() {
  const [stats, setStats] = useState<{
    totalArtists: number;
    todayArtists: number;
    uniqueCountries: number;
    lastSync: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!isSupabaseConfigured()) {
        setStats({
          totalArtists: 0,
          todayArtists: 0,
          uniqueCountries: 0,
          lastSync: null
        });
        setLoading(false);
        return;
      }

      try {
        const data = await dbService.getStatistics();
        setStats(data);
      } catch (error) {
        console.error('Error fetching statistics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const statItems = [
    {
      icon: <Users className="w-5 h-5" />,
      label: "Total Artists",
      value: stats?.totalArtists || 0,
      color: "text-primary",
      bgColor: "bg-primary/10",
      delay: 0
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      label: "Added Today",
      value: stats?.todayArtists || 0,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      delay: 0.1
    },
    {
      icon: <Globe className="w-5 h-5" />,
      label: "Countries",
      value: stats?.uniqueCountries || 0,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      delay: 0.2
    },
    {
      icon: <Clock className="w-5 h-5" />,
      label: "Last Sync",
      value: stats?.lastSync 
        ? format(new Date(stats.lastSync), 'HH:mm')
        : 'Never',
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      delay: 0.3,
      isTime: true
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Database Statistics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statItems.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: item.delay }}
              className={`p-4 rounded-lg ${item.bgColor}`}
            >
              <div className={`${item.color} mb-2`}>
                {item.icon}
              </div>
              {loading ? (
                <>
                  <Skeleton className="h-8 w-20 mb-1" />
                  <Skeleton className="h-4 w-16" />
                </>
              ) : (
                <>
                  <p className={`text-2xl font-bold ${item.color}`}>
                    {item.isTime 
                      ? item.value 
                      : typeof item.value === 'number' 
                        ? item.value.toLocaleString() 
                        : item.value}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.label}
                  </p>
                </>
              )}
            </motion.div>
          ))}
        </div>

        {!isSupabaseConfigured() && (
          <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              ⚠️ Supabase not configured - statistics unavailable
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
