'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Treemap,
  ResponsiveContainer,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from 'recharts';
import { Tag, Music, Layers, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface CategoryInsightsProps {
  events: any[];
}

export function CategoryInsights({ events }: CategoryInsightsProps) {
  // Process categories
  const categoryStats = events.reduce((acc: any, event) => {
    if (event.categories) {
      event.categories.split('/').forEach((cat: string) => {
        const category = cat.trim();
        if (!acc[category]) {
          acc[category] = {
            name: category,
            count: 0,
            artists: new Set(),
            venues: new Set()
          };
        }
        acc[category].count++;
        if (event.artists) {
          event.artists.forEach((a: any) => acc[category].artists.add(a.title));
        }
        if (event.venue_name) {
          acc[category].venues.add(event.venue_name);
        }
      });
    }
    return acc;
  }, {});

  const categoryData = Object.values(categoryStats)
    .map((cat: any) => ({
      ...cat,
      artists: cat.artists.size,
      venues: cat.venues.size
    }))
    .sort((a: any, b: any) => b.count - a.count);

  const topCategories = categoryData.slice(0, 10);

  // Treemap data
  const treemapData = categoryData.slice(0, 20).map(cat => ({
    name: cat.name,
    size: cat.count,
    color: `hsl(${Math.random() * 360}, 70%, 50%)`
  }));

  // Radar chart data for top categories
  const radarData = topCategories.slice(0, 8).map(cat => ({
    category: cat.name.length > 15 ? cat.name.substring(0, 15) + '...' : cat.name,
    events: cat.count,
    artists: Math.min(100, cat.artists),
    venues: Math.min(50, cat.venues * 2)
  }));

  // Pie chart for main genre groups
  const genreGroups = categoryData.reduce((acc: any, cat) => {
    let group = 'Other';
    const name = cat.name.toLowerCase();
    
    if (name.includes('house') || name.includes('tech')) group = 'House & Techno';
    else if (name.includes('trance') || name.includes('progressive')) group = 'Trance & Progressive';
    else if (name.includes('drum') || name.includes('bass')) group = 'Drum & Bass';
    else if (name.includes('hip') || name.includes('hop') || name.includes('rap')) group = 'Hip Hop & Rap';
    else if (name.includes('live') || name.includes('concert')) group = 'Live & Concerts';
    else if (name.includes('ambient') || name.includes('experimental')) group = 'Ambient & Experimental';
    
    if (!acc[group]) acc[group] = 0;
    acc[group] += cat.count;
    return acc;
  }, {});

  const pieData = Object.entries(genreGroups).map(([name, value]) => ({
    name,
    value
  }));

  const COLORS = [
    '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', 
    '#ef4444', '#ec4899', '#14b8a6', '#f97316',
    '#6366f1', '#84cc16'
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm border rounded-lg p-3 shadow-xl">
          <p className="font-semibold text-sm mb-2">{payload[0].payload.name || payload[0].name}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">Events:</span>
              <span className="text-sm font-bold">{payload[0].value}</span>
            </div>
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
      transition={{ duration: 0.5, delay: 0.3 }}
      className="space-y-6"
    >
      {/* Category Distribution */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-background to-background/80">
        <CardHeader className="bg-gradient-to-r from-green-500/10 to-emerald-500/10">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-green-500" />
              Event Categories & Genres
            </CardTitle>
            <Badge variant="secondary" className="bg-green-500/10">
              {categoryData.length} Categories
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Categories Bar Chart */}
            <div>
              <h3 className="text-sm font-semibold mb-4">Top 10 Categories</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={topCategories}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Genre Groups Pie Chart */}
            <div>
              <h3 className="text-sm font-semibold mb-4">Genre Distribution</h3>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {pieData.slice(0, 6).map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-xs">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Category Tags */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-500" />
              All Categories
            </h3>
            <div className="flex flex-wrap gap-2">
              {categoryData.map((cat, index) => (
                <motion.div
                  key={cat.name}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.min(index * 0.02, 0.5) }}
                >
                  <Badge 
                    variant="outline" 
                    className={`
                      ${cat.count > 50 ? 'border-purple-500 bg-purple-500/10' :
                        cat.count > 20 ? 'border-blue-500 bg-blue-500/10' :
                        cat.count > 10 ? 'border-green-500 bg-green-500/10' :
                        'border-gray-500 bg-gray-500/10'}
                    `}
                  >
                    {cat.name} ({cat.count})
                  </Badge>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Category Diversity Radar */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gradient-to-br from-purple-500/5 to-pink-500/5 border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  Category Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart data={radarData}>
                    <PolarGrid strokeDasharray="3 3" className="opacity-30" />
                    <PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar 
                      name="Events" 
                      dataKey="events" 
                      stroke="#8b5cf6" 
                      fill="#8b5cf6" 
                      fillOpacity={0.3} 
                    />
                    <Radar 
                      name="Artists" 
                      dataKey="artists" 
                      stroke="#3b82f6" 
                      fill="#3b82f6" 
                      fillOpacity={0.3} 
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Category Stats */}
            <div className="space-y-3">
              {topCategories.slice(0, 5).map((cat, index) => (
                <motion.div
                  key={cat.name}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="bg-gradient-to-r from-background to-muted/20 border-muted">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Music className="h-4 w-4 text-purple-500" />
                          <span className="font-semibold text-sm">{cat.name}</span>
                        </div>
                        <Badge variant="secondary">#{index + 1}</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Events</span>
                          <div className="font-bold">{cat.count}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Artists</span>
                          <div className="font-bold">{cat.artists}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Venues</span>
                          <div className="font-bold">{cat.venues}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
