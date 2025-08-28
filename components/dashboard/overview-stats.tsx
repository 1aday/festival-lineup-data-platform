'use client';

import { Card } from '@/components/ui/card';
import { 
  Users, 
  Calendar, 
  MapPin, 
  Globe, 
  TrendingUp,
  Music,
  Sparkles,
  Link2
} from 'lucide-react';
import { motion } from 'framer-motion';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: number;
  color: string;
}

function StatCard({ title, value, subtitle, icon, trend, color }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-background to-background/80 hover:shadow-2xl transition-all duration-300">
        <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-5`} />
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-gradient-to-br from-purple-500/10 to-transparent blur-2xl" />
        
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-xl bg-gradient-to-br ${color} shadow-lg`}>
              {icon}
            </div>
            {trend !== undefined && (
              <div className="flex items-center gap-1 text-green-500">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-semibold">+{trend}%</span>
              </div>
            )}
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

interface OverviewStatsProps {
  stats: {
    artists: number;
    events: number;
    venues: number;
    countries: number;
    connections: number;
    categories: number;
    peakDay?: string;
    avgArtistsPerEvent?: number;
  };
}

export function OverviewStats({ stats }: OverviewStatsProps) {
  const statCards = [
    {
      title: 'Total Artists',
      value: stats.artists.toLocaleString(),
      subtitle: 'Performing at ADE 2025',
      icon: <Music className="h-5 w-5 text-white" />,
      color: 'from-purple-500 to-pink-500',
      trend: 12
    },
    {
      title: 'Total Events',
      value: stats.events.toLocaleString(),
      subtitle: 'Across 5 days',
      icon: <Calendar className="h-5 w-5 text-white" />,
      color: 'from-blue-500 to-cyan-500',
      trend: 8
    },
    {
      title: 'Unique Venues',
      value: stats.venues.toLocaleString(),
      subtitle: 'Amsterdam locations',
      icon: <MapPin className="h-5 w-5 text-white" />,
      color: 'from-orange-500 to-red-500'
    },
    {
      title: 'Countries',
      value: stats.countries.toLocaleString(),
      subtitle: 'Global representation',
      icon: <Globe className="h-5 w-5 text-white" />,
      color: 'from-green-500 to-emerald-500'
    },
    {
      title: 'Artist Connections',
      value: stats.connections.toLocaleString(),
      subtitle: 'Linked performances',
      icon: <Link2 className="h-5 w-5 text-white" />,
      color: 'from-indigo-500 to-purple-500'
    },
    {
      title: 'Event Categories',
      value: stats.categories.toLocaleString(),
      subtitle: 'Music genres & styles',
      icon: <Sparkles className="h-5 w-5 text-white" />,
      color: 'from-yellow-500 to-orange-500'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {statCards.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
}
