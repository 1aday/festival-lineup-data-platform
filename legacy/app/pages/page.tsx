'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/design/AppShell';
import { 
  Music2, 
  Calendar, 
  Users, 
  BarChart3, 
  Settings, 
  Home,
  MapPin,
  Database,
  Wrench,
  Globe,
  Sparkles,
  ExternalLink,
  Code,
  Server,
  FileText,
  Zap
} from 'lucide-react';
import Link from 'next/link';

const pages = [
  {
    title: 'Home',
    href: '/',
    icon: Home,
    description: 'Main dashboard with artist overview and statistics',
    status: 'active',
    features: ['Artist statistics', 'Real-time data', 'Interactive map', 'Search & filters']
  },
  {
    title: 'Schedule Optimizer',
    href: '/schedule',
    icon: Calendar,
    description: 'Plan the featured festival schedule with smart conflict detection',
    status: 'new',
    features: ['Conflict detection', 'Route optimization', 'Priority system', 'Energy mapping']
  },
  {
    title: 'Artists',
    href: '/artists',
    icon: Users,
    description: 'Browse featured festival artists with detailed information',
    status: 'active',
    features: ['Artist profiles', 'Spotify integration', 'Genre filtering', 'Search']
  },
  {
    title: 'Events',
    href: '/events',
    icon: Music2,
    description: 'View featured festival events with lineups and details',
    status: 'active',
    features: ['Event listings', 'Artist lineups', 'Venue information', 'Date filtering']
  },
  {
    title: 'Data Dashboard',
    href: '/data',
    icon: BarChart3,
    description: 'Analytics and statistics for European electronic festival data',
    status: 'active',
    features: ['Statistics', 'Charts', 'Data insights', 'Export options']
  },
  {
    title: 'Genres',
    href: '/genres',
    icon: Sparkles,
    description: 'Explore music genres and classifications',
    status: 'active',
    features: ['Genre analysis', 'Artist categorization', 'Trends', 'Visualization']
  },
  {
    title: 'Insights',
    href: '/insights',
    icon: BarChart3,
    description: 'Premium festival data packs and downloadable reports',
    status: 'new',
    features: ['Access-code unlock', 'JSON/CSV downloads', 'Printable report export', 'Lead capture']
  },
  {
    title: 'Concierge',
    href: '/concierge',
    icon: Calendar,
    description: 'Featured festival plan intake and itinerary delivery',
    status: 'new',
    features: ['Intake flow', 'Share links', 'ICS export', 'Concierge queue']
  },
  {
    title: 'Artist Studio',
    href: '/artist-studio',
    icon: Settings,
    description: 'Artist management and editing tools',
    status: 'active',
    features: ['Artist editing', 'Data management', 'Bulk operations', 'Validation']
  },
  {
    title: 'Scraper',
    href: '/scraper',
    icon: Wrench,
    description: 'Data scraping interface and controls',
    status: 'active',
    features: ['Sync controls', 'Progress tracking', 'Error monitoring', 'Manual triggers']
  }
];

const apiEndpoints = [
  {
    title: 'Artists API',
    href: '/api/artists',
    method: 'GET',
    description: 'Get enriched artist data with Spotify features',
    icon: Users,
    features: ['Spotify enrichment', 'Audio features', 'Genre data', 'Pagination']
  },
  {
    title: 'Events API',
    href: '/api/events',
    method: 'GET',
    description: 'Get event data with artist lineups and metadata',
    icon: Calendar,
    features: ['Event details', 'Artist lineups', 'Venue info', 'Date filtering']
  },
  {
    title: 'Route Optimization',
    href: '/api/route-optimization',
    method: 'POST',
    description: 'Smart scheduling algorithms and conflict detection',
    icon: MapPin,
    features: ['Conflict detection', 'Route planning', 'Travel time', 'Optimization']
  },
  {
    title: 'Spotify Enrichment',
    href: '/api/spotify/enrich',
    method: 'POST',
    description: 'Enrich artists with Spotify data and audio features',
    icon: Music2,
    features: ['Audio analysis', 'Genre detection', 'Popularity scores', 'Track data']
  },
  {
    title: 'Sync Pipeline',
    href: '/api/comprehensive-sync',
    method: 'POST',
    description: 'Full data synchronization from the featured festival source API',
    icon: Zap,
    features: ['Full sync', 'Progress tracking', 'Error handling', 'Change detection']
  },
  {
    title: 'Database Debug',
    href: '/api/debug-db',
    method: 'GET',
    description: 'Database diagnostics and health checks',
    icon: Database,
    features: ['Health checks', 'Performance metrics', 'Connection status', 'Data validation']
  },
  {
    title: 'Country Stats',
    href: '/api/country-stats',
    method: 'GET',
    description: 'Geographic statistics and country data',
    icon: Globe,
    features: ['Country metrics', 'Geographic analysis', 'Distribution data', 'Maps']
  },
  {
    title: 'Homepage Data',
    href: '/api/homepage-data',
    method: 'GET',
    description: 'Aggregated data for homepage dashboard',
    icon: BarChart3,
    features: ['Statistics', 'Counts', 'Recent data', 'Performance metrics']
  },
  {
    title: 'Monetize Lead',
    href: '/api/monetize/lead',
    method: 'POST',
    description: 'Capture monetization inquiries',
    icon: Zap,
    features: ['Offer-type payload', 'Lead status pipeline', 'Manual invoicing flow', 'CRM-ready data']
  },
  {
    title: 'Report Generate',
    href: '/api/reports/generate',
    method: 'POST',
    description: 'Generate premium festival intelligence packs',
    icon: FileText,
    features: ['Basic/full tiers', 'Access-code validation', 'Stored report jobs', 'Download links']
  },
  {
    title: 'Concierge Orders',
    href: '/api/concierge/orders',
    method: 'POST',
    description: 'Create and process concierge itinerary orders',
    icon: Calendar,
    features: ['Status pipeline', 'ICS payload', 'Share IDs', 'Download endpoint']
  },
  {
    title: 'Embed Lineup',
    href: '/embed/lineup?key=YOUR_KEY',
    method: 'GET',
    description: 'White-label embeddable lineup widget',
    icon: Globe,
    features: ['Domain allowlist', 'Widget key validation', 'Usage tracking', 'Basic/white-label plans']
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'new':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'active':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'beta':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'deprecated':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getMethodColor = (method: string) => {
  switch (method) {
    case 'GET':
      return 'bg-green-100 text-green-800';
    case 'POST':
      return 'bg-blue-100 text-blue-800';
    case 'PUT':
      return 'bg-yellow-100 text-yellow-800';
    case 'DELETE':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function PagesPage() {
  return (
    <AppShell
      title="All Pages & APIs"
      subtitle="Complete overview of all available pages and API endpoints in the LineupBase system"
    >

        {/* Pages Section */}
        <section>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Code className="h-6 w-6" />
            Pages
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pages.map((page) => {
              const Icon = page.icon;
              return (
                <Card key={page.href} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className="h-6 w-6 text-primary" />
                        <div>
                          <CardTitle className="text-lg">{page.title}</CardTitle>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getStatusColor(page.status)}`}
                          >
                            {page.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <CardDescription className="mt-2">
                      {page.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Features:</h4>
                        <div className="flex flex-wrap gap-1">
                          {page.features.map((feature) => (
                            <Badge key={feature} variant="secondary" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button asChild className="w-full">
                        <Link href={page.href}>
                          Visit Page
                          <ExternalLink className="h-4 w-4 ml-2" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* API Endpoints Section */}
        <section>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Server className="h-6 w-6" />
            API Endpoints
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {apiEndpoints.map((endpoint) => {
              const Icon = endpoint.icon;
              return (
                <Card key={endpoint.href} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className="h-6 w-6 text-primary" />
                        <div>
                          <CardTitle className="text-lg">{endpoint.title}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getMethodColor(endpoint.method)}`}
                            >
                              {endpoint.method}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                    <CardDescription className="mt-2">
                      {endpoint.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Features:</h4>
                        <div className="flex flex-wrap gap-1">
                          {endpoint.features.map((feature) => (
                            <Badge key={feature} variant="secondary" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button asChild variant="outline" className="flex-1">
                          <Link href={endpoint.href} target="_blank">
                            Test API
                            <ExternalLink className="h-4 w-4 ml-2" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Quick Stats */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle>System Overview</CardTitle>
              <CardDescription>
                Quick statistics about the LineupBase system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{pages.length}</div>
                  <div className="text-sm text-muted-foreground">Pages</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-accent">{apiEndpoints.length}</div>
                  <div className="text-sm text-muted-foreground">API Endpoints</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {pages.filter(p => p.status === 'active').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Active Pages</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {apiEndpoints.filter(a => a.method === 'GET').length}
                  </div>
                  <div className="text-sm text-muted-foreground">GET Endpoints</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
    </AppShell>
  );
}
