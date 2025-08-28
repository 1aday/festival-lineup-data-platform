'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Treemap,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { MapPin, TrendingUp, Users, Calendar, Crown, Star } from 'lucide-react';
import { motion } from 'framer-motion';

interface VenueAnalyticsProps {
  events: any[];
}

export function VenueAnalytics({ events }: VenueAnalyticsProps) {
  // Process venue data
  const venueStats = events.reduce((acc: any, event) => {
    const venue = event.venue_name || 'TBA';
    if (!acc[venue]) {
      acc[venue] = {
        name: venue,
        events: 0,
        artists: 0,
        categories: new Set(),
        dates: new Set()
      };
    }
    acc[venue].events++;
    acc[venue].artists += event.artists?.length || 0;
    if (event.categories) {
      event.categories.split('/').forEach((cat: string) => 
        acc[venue].categories.add(cat.trim())
      );
    }
    acc[venue].dates.add(event.start_date.split('T')[0]);
    return acc;
  }, {});

  const venueData = Object.values(venueStats)
    .map((venue: any) => ({
      ...venue,
      categories: venue.categories.size,
      dates: venue.dates.size
    }))
    .sort((a: any, b: any) => b.events - a.events);

  const topVenues = venueData.slice(0, 10);
  const treemapData = topVenues.map(v => ({
    name: v.name,
    size: v.events,
    artists: v.artists
  }));

  // Category distribution by venue
  const categoryByVenue = topVenues.slice(0, 5).map(venue => {
    const venueEvents = events.filter(e => e.venue_name === venue.name);
    const categoryCount: any = {};
    venueEvents.forEach(event => {
      if (event.categories) {
        event.categories.split('/').forEach((cat: string) => {
          const category = cat.trim();
          categoryCount[category] = (categoryCount[category] || 0) + 1;
        });
      }
    });
    return {
      venue: venue.name,
      ...Object.fromEntries(
        Object.entries(categoryCount).slice(0, 5)
      )
    };
  });

  // Pie chart data for venue distribution
  const pieData = topVenues.slice(0, 8).map(v => ({
    name: v.name.length > 20 ? v.name.substring(0, 20) + '...' : v.name,
    value: v.events,
    artists: v.artists
  }));

  const COLORS = [
    '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', 
    '#ef4444', '#ec4899', '#14b8a6', '#f97316'
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm border rounded-lg p-3 shadow-xl">
          <p className="font-semibold text-sm mb-2">{label || payload[0]?.payload?.name}</p>
          <div className="space-y-1">
            {payload.map((p: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <span className="text-xs text-muted-foreground">
                  {p.name === 'events' ? 'Events' : p.name === 'artists' ? 'Artists' : p.name}:
                </span>
                <span className="text-sm font-bold">{p.value}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="space-y-6"
    >
      {/* Top Venues Bar Chart */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-background to-background/80">
        <CardHeader className="bg-gradient-to-r from-orange-500/10 to-red-500/10">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-orange-500" />
              Top Venues by Event Count
            </CardTitle>
            <Badge variant="secondary" className="bg-orange-500/10">
              {venueData.length} Total Venues
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={topVenues} margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={100}
                className="text-muted-foreground"
              />
              <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="events" fill="#f97316" radius={[8, 8, 0, 0]} />
              <Bar dataKey="artists" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          {/* Top 3 Venues Highlight */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {topVenues.slice(0, 3).map((venue, index) => (
              <motion.div
                key={venue.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`bg-gradient-to-br ${
                  index === 0 ? 'from-yellow-500/10 to-orange-500/10 border-yellow-500/30' :
                  index === 1 ? 'from-gray-500/10 to-gray-600/10 border-gray-500/30' :
                  'from-orange-600/10 to-orange-700/10 border-orange-600/30'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {index === 0 && <Crown className="h-5 w-5 text-yellow-500" />}
                        {index === 1 && <Star className="h-5 w-5 text-gray-400" />}
                        {index === 2 && <Star className="h-5 w-5 text-orange-600" />}
                        <span className="text-2xl font-bold">#{index + 1}</span>
                      </div>
                    </div>
                    <div className="font-semibold text-sm mb-2">{venue.name}</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Events:</span>
                        <div className="font-bold text-lg">{venue.events}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Artists:</span>
                        <div className="font-bold text-lg">{venue.artists}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Venue Distribution Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-xl bg-gradient-to-br from-background to-background/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-purple-500" />
              Venue Event Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Venue Category Diversity */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-background to-background/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Venue Diversity Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topVenues.slice(0, 6).map((venue, index) => {
                const diversityScore = Math.min(100, (venue.categories / 10) * 100);
                return (
                  <div key={venue.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate max-w-[150px]">{venue.name}</span>
                      <Badge variant="outline">{venue.categories} genres</Badge>
                    </div>
                    <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${diversityScore}%` }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-emerald-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
