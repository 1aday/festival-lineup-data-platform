"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Filter,
  Download,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Clock,
  Activity,
  AlertCircle,
  CheckCircle,
  Info,
  X,
  Zap,
  Database,
  Users,
  Calendar,
  Link2,
  Music,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Maximize2,
  Minimize2
} from "lucide-react";

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

interface LoggingSystemProps {
  logs: LogEntry[];
  isRunning: boolean;
  onClearLogs?: () => void;
  onExportLogs?: () => void;
  className?: string;
}

const logLevels = {
  info: { color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Info, label: 'Info' },
  success: { color: 'text-green-500', bg: 'bg-green-500/10', icon: CheckCircle, label: 'Success' },
  warning: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: AlertCircle, label: 'Warning' },
  error: { color: 'text-red-500', bg: 'bg-red-500/10', icon: X, label: 'Error' },
  debug: { color: 'text-purple-500', bg: 'bg-purple-500/10', icon: Activity, label: 'Debug' }
};

const logCategories = {
  sync: { color: 'text-blue-600', bg: 'bg-blue-600/10', icon: Database, label: 'Sync' },
  parse: { color: 'text-purple-600', bg: 'bg-purple-600/10', icon: Search, label: 'Parse' },
  enrich: { color: 'text-pink-600', bg: 'bg-pink-600/10', icon: Music, label: 'Enrich' },
  link: { color: 'text-orange-600', bg: 'bg-orange-600/10', icon: Link2, label: 'Link' },
  analysis: { color: 'text-indigo-600', bg: 'bg-indigo-600/10', icon: BarChart3, label: 'Analysis' },
  system: { color: 'text-gray-600', bg: 'bg-gray-600/10', icon: Activity, label: 'System' }
};

export function LoggingSystem({ logs, isRunning, onClearLogs, onExportLogs, className }: LoggingSystemProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [autoScroll, setAutoScroll] = useState(true);
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [maxLogs, setMaxLogs] = useState(1000);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  // Filter and sort logs
  const filteredLogs = useMemo(() => {
    let filtered = logs.filter(log => {
      const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           log.details?.toString().toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLevel = selectedLevel === 'all' || log.level === selectedLevel;
      const matchesCategory = selectedCategory === 'all' || log.category === selectedCategory;
      
      return matchesSearch && matchesLevel && matchesCategory;
    });

    // Sort logs
    filtered.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

    // Limit number of logs
    return filtered.slice(0, maxLogs);
  }, [logs, searchTerm, selectedLevel, selectedCategory, sortOrder, maxLogs]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  // Statistics
  const stats = useMemo(() => {
    const total = logs.length;
    const byLevel = logs.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const byCategory = logs.reduce((acc, log) => {
      acc[log.category] = (acc[log.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errors = byLevel.error || 0;
    const warnings = byLevel.warning || 0;
    const success = byLevel.success || 0;

    return {
      total,
      byLevel,
      byCategory,
      errors,
      warnings,
      success,
      errorRate: total > 0 ? ((errors / total) * 100).toFixed(1) : '0'
    };
  }, [logs]);

  const toggleLogExpansion = (logId: string) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const getLogIcon = (level: string, category: string) => {
    const levelConfig = logLevels[level as keyof typeof logLevels];
    const categoryConfig = logCategories[category as keyof typeof logCategories];
    
    if (level === 'error') return levelConfig.icon;
    if (level === 'success') return levelConfig.icon;
    if (level === 'warning') return levelConfig.icon;
    return categoryConfig.icon;
  };

  const exportLogs = () => {
    const logData = filteredLogs.map(log => ({
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
    a.download = `ade-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isMinimized) {
    return (
      <motion.div
        initial={{ height: 'auto' }}
        animate={{ height: '60px' }}
        className="fixed bottom-4 right-4 z-50"
      >
        <Card className="w-80 shadow-2xl border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-sm font-medium">Live Logs</span>
                <Badge variant="secondary" className="text-xs">
                  {filteredLogs.length}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsMinimized(false)}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`space-y-4 ${className}`}
    >
      {/* Header with Controls */}
      <Card className="border-primary/20 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: isRunning ? 360 : 0 }}
                transition={{ duration: 2, repeat: isRunning ? Infinity : 0, ease: "linear" }}
              >
                <Activity className="w-6 h-6 text-primary" />
              </motion.div>
              <div>
                <CardTitle className="text-xl">Live Activity Logs</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Real-time monitoring and detailed logging
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant={isRunning ? "default" : "secondary"} className="gap-1">
                <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                {isRunning ? 'Live' : 'Paused'}
              </Badge>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsMinimized(true)}
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Statistics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="bg-blue-500/10 p-3 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="bg-green-500/10 p-3 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.success}</div>
              <div className="text-xs text-muted-foreground">Success</div>
            </div>
            <div className="bg-yellow-500/10 p-3 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{stats.warnings}</div>
              <div className="text-xs text-muted-foreground">Warnings</div>
            </div>
            <div className="bg-red-500/10 p-3 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
              <div className="text-xs text-muted-foreground">Errors</div>
            </div>
            <div className="bg-purple-500/10 p-3 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{stats.errorRate}%</div>
              <div className="text-xs text-muted-foreground">Error Rate</div>
            </div>
            <div className="bg-gray-500/10 p-3 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">{filteredLogs.length}</div>
              <div className="text-xs text-muted-foreground">Filtered</div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {Object.entries(logLevels).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <config.icon className="w-4 h-4" />
                      {config.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(logCategories).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <config.icon className="w-4 h-4" />
                      {config.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
              >
                {sortOrder === 'newest' ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowTimestamps(!showTimestamps)}
              >
                <Clock className="w-4 h-4" />
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setCompactMode(!compactMode)}
              >
                {compactMode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setAutoScroll(!autoScroll)}
              >
                {autoScroll ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={exportLogs}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={onClearLogs}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => setExpandedLogs(new Set())}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Collapse All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Display */}
      <Card className="border-primary/10">
        <CardContent className="p-0">
          <ScrollArea 
            ref={scrollRef}
            className="h-96 w-full"
          >
            <div className="p-4 space-y-2">
              <AnimatePresence>
                {filteredLogs.map((log, index) => {
                  const levelConfig = logLevels[log.level];
                  const categoryConfig = logCategories[log.category];
                  const isExpanded = expandedLogs.has(log.id);
                  const LogIcon = getLogIcon(log.level, log.category);
                  
                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.01 }}
                      className={`
                        border rounded-lg p-3 cursor-pointer transition-all duration-200
                        ${levelConfig.bg} ${levelConfig.color}
                        hover:shadow-md hover:scale-[1.01]
                        ${isExpanded ? 'shadow-lg' : ''}
                      `}
                      onClick={() => toggleLogExpansion(log.id)}
                    >
                      <div className="flex items-start gap-3">
                        <motion.div
                          animate={{ scale: isRunning ? [1, 1.1, 1] : 1 }}
                          transition={{ duration: 0.5, repeat: isRunning ? Infinity : 0 }}
                        >
                          <LogIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        </motion.div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={`text-xs ${categoryConfig.color} ${categoryConfig.bg}`}>
                              {categoryConfig.label}
                            </Badge>
                            <Badge variant="outline" className={`text-xs ${levelConfig.color} ${levelConfig.bg}`}>
                              {levelConfig.label}
                            </Badge>
                            {showTimestamps && (
                              <span className="text-xs text-muted-foreground font-mono">
                                {formatTimestamp(log.timestamp)}
                              </span>
                            )}
                            {log.duration && (
                              <span className="text-xs text-muted-foreground">
                                ({log.duration}ms)
                              </span>
                            )}
                          </div>
                          
                          <div className="text-sm font-medium mb-1">
                            {log.message}
                          </div>
                          
                          {log.metadata && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {log.metadata.artistId && (
                                <Badge variant="secondary" className="text-xs">
                                  Artist: {log.metadata.artistId}
                                </Badge>
                              )}
                              {log.metadata.eventId && (
                                <Badge variant="secondary" className="text-xs">
                                  Event: {log.metadata.eventId}
                                </Badge>
                              )}
                              {log.metadata.batchSize && (
                                <Badge variant="secondary" className="text-xs">
                                  Batch: {log.metadata.batchSize}
                                </Badge>
                              )}
                              {log.metadata.retryCount && (
                                <Badge variant="secondary" className="text-xs">
                                  Retry: {log.metadata.retryCount}
                                </Badge>
                              )}
                            </div>
                          )}
                          
                          {log.progress !== undefined && (
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                              <motion.div
                                className="bg-primary h-1.5 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${log.progress}%` }}
                                transition={{ duration: 0.5 }}
                              />
                            </div>
                          )}
                          
                          <AnimatePresence>
                            {isExpanded && log.details && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="mt-2 p-3 bg-black/5 dark:bg-white/5 rounded border-l-2 border-primary/30"
                              >
                                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                                  {typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}
                                </pre>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              
              {filteredLogs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No logs match your current filters</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}
