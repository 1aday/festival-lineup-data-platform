'use client';

import Link from 'next/link';
import { Github, ExternalLink, Heart } from 'lucide-react';
import { BrandWordmark } from '@/components/brand-wordmark';

export function Footer() {
  return (
    <footer className="border-t bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <BrandWordmark textClassName="text-xl" />
            </div>
            <p className="text-sm text-muted-foreground">
              European electronic music festival intelligence with Amsterdam Dance Event as the featured festival.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold">Quick Links</h3>
            <div className="space-y-2">
              <Link href="/" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Home
              </Link>
              <Link href="/schedule" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Schedule Optimizer
              </Link>
              <Link href="/artists" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Artists
              </Link>
              <Link href="/events" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Events
              </Link>
            </div>
          </div>

          {/* APIs */}
          <div className="space-y-4">
            <h3 className="font-semibold">APIs</h3>
            <div className="space-y-2">
              <Link href="/api/artists" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Artists API
              </Link>
              <Link href="/api/events" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Events API
              </Link>
              <Link href="/api/route-optimization" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Route Optimization
              </Link>
              <Link href="/pages" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                All APIs
              </Link>
            </div>
          </div>

          {/* Info */}
          <div className="space-y-4">
            <h3 className="font-semibold">Info</h3>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Built with Next.js, Supabase, and Spotify API
              </p>
              <p className="text-sm text-muted-foreground">
                Featured source: Amsterdam Dance Event 2025
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Made with</span>
                <Heart className="h-4 w-4 text-red-500" />
                <span>for festival attendees</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t mt-8 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2025 LineupBase. Independent festival intelligence, not affiliated with Amsterdam Dance Event.
          </p>
          <div className="flex items-center gap-4">
            <Link 
              href="https://github.com" 
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="h-4 w-4" />
              GitHub
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
