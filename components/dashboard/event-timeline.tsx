'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  RadialBarChart,
  RadialBar,
  Legend,
  PieChart,
  Pie
} from 'recharts';
import { format, parseISO, startOfDay } from 'date-fns';
import { Calendar, Clock, TrendingUp, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

interface EventTimelineProps {
  events: any[];
}

export function EventTimeline({ events }: EventTimelineProps) {
  // Process events by date and hour
  const timelineData = events.reduce((acc: any[], event) => {
    const date = startOfDay(parseISO(event.start_date));
    const hour = new Date(event.start_date).getHours();
    const key = format(date, 'MMM dd');
    
    let dayData = acc.find(d => d.date === key);
    if (!dayData) {
      dayData = { 
        date: key, 
        events: 0, 
        artists: 0,
        morning: 0,
        afternoon: 0,
        evening: 0,
        night: 0
      };
      acc.push(dayData);
    }
    
    dayData.events++;
    dayData.artists += event.artists?.length || 0;
    
    // Categorize by time of day
    if (hour < 12) dayData.morning++;
    else if (hour < 17) dayData.afternoon++;
    else if (hour < 21) dayData.evening++;
    else dayData.night++;
    
    return acc;
  }, []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate peak hours
  const hourDistribution = events.reduce((acc: any[], event) => {
    const hour = new Date(event.start_date).getHours();
    const existing = acc.find(h => h.hour === hour);
    if (existing) {
      existing.count++;
    } else {
      acc.push({ hour, count: 1, time: `${hour}:00` });
    }
    return acc;
  }, []).sort((a, b) => a.hour - b.hour);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm border rounded-lg p-3 shadow-xl">
          <p className="font-semibold text-sm mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">Events:</span>
              <span className="text-sm font-bold">{payload[0]?.value}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">Artists:</span>
              <span className="text-sm font-bold">{payload[1]?.value}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-0 shadow-xl bg-gradient-to-br from-background to-background/80">
        <CardHeader className="bg-gradient-to-r from-purple-500/10 to-blue-500/10">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-500" />
              Event Timeline & Distribution
            </CardTitle>
            <Badge variant="secondary" className="bg-purple-500/10">
              {events.length} Total Events
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Timeline */}
            <div>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                Daily Event & Artist Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={timelineData}>
                  <defs>
                    <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorArtists" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="events" 
                    stroke="#8b5cf6" 
                    fillOpacity={1} 
                    fill="url(#colorEvents)" 
                    strokeWidth={2}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="artists" 
                    stroke="#3b82f6" 
                    fillOpacity={1} 
                    fill="url(#colorArtists)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Hour Distribution */}
            <div>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-500" />
                Peak Hours Analysis
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={hourDistribution}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <Tooltip />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {hourDistribution.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.hour >= 20 || entry.hour < 4 ? '#8b5cf6' : '#3b82f6'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Time Period Breakdown */}
          <div className="mt-6 grid grid-cols-4 gap-4">
            {timelineData.map((day, index) => (
              <motion.div
                key={day.date}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="bg-gradient-to-br from-purple-500/5 to-blue-500/5 border-purple-500/20">
                  <CardContent className="p-4">
                    <div className="text-sm font-semibold mb-2">{day.date}</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Morning:</span>
                        <Badge variant="outline">{day.morning}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Afternoon:</span>
                        <Badge variant="outline">{day.afternoon}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Evening:</span>
                        <Badge variant="outline">{day.evening}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Night:</span>
                        <Badge variant="outline">{day.night}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
