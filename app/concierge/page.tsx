'use client';

import { useState } from 'react';
import { CalendarDays, Download, ExternalLink, Route, Sparkles } from 'lucide-react';

import { AppShell } from '@/components/design/AppShell';
import { LeadForm } from '@/components/monetization/lead-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CONCIERGE_PRICES } from '@/lib/monetization-config';
import type { ConciergeTier } from '@/lib/monetization-types';

interface ConciergeResult {
  order: {
    id: string;
    shareId: string;
    tier: ConciergeTier;
    status: string;
    selectedEvents: number;
    priceUsd: number;
  };
  links: {
    share: string;
    json: string;
    ics: string;
    pdf: string;
  };
}

export default function ConciergePage() {
  const [tier, setTier] = useState<ConciergeTier>('self_serve');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [travelBufferMinutes, setTravelBufferMinutes] = useState(30);
  const [genresText, setGenresText] = useState('');
  const [eventIdsText, setEventIdsText] = useState('');
  const [notes, setNotes] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConciergeResult | null>(null);

  const createPlan = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const selectedEventIds = eventIdsText
        .split(',')
        .map((x) => Number(x.trim()))
        .filter((x) => Number.isFinite(x) && x > 0);

      const genres = genresText
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);

      const response = await fetch('/api/concierge/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          name,
          email,
          selectedDate,
          travelBufferMinutes,
          selectedEventIds,
          notes,
          accessCode,
          preferences: {
            genres,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create concierge plan');
        return;
      }

      setResult(data);
    } catch {
      setError('Failed to create concierge plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell
      title="My Festival Plan Pro"
      subtitle="Concierge itinerary generation with downloads and shareable plan links"
      actions={
        <Badge variant="outline" className="border-primary/30 bg-primary/10">
          <Route className="mr-2 h-4 w-4" />
          {tier === 'curated' ? 'Curated Queue' : 'Self-serve'}
        </Badge>
      }
    >

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Plan Intake
              </CardTitle>
              <CardDescription>
                Select a tier and provide your preferences. Access codes are manually issued.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tier">Tier</Label>
                  <select
                    id="tier"
                    value={tier}
                    onChange={(e) => setTier(e.target.value as ConciergeTier)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="self_serve">Self-serve (${CONCIERGE_PRICES.self_serve})</option>
                    <option value="curated">Curated (${CONCIERGE_PRICES.curated})</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accessCode">Access Code</Label>
                  <Input
                    id="accessCode"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    placeholder="PLAN-XXXXXX"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="selectedDate">Date</Label>
                  <Input
                    id="selectedDate"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="travelBuffer">Travel Buffer (min)</Label>
                  <Input
                    id="travelBuffer"
                    type="number"
                    min={0}
                    max={180}
                    value={travelBufferMinutes}
                    onChange={(e) => setTravelBufferMinutes(Number(e.target.value || 30))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="genres">Preferred Genres (comma separated)</Label>
                <Input
                  id="genres"
                  value={genresText}
                  onChange={(e) => setGenresText(e.target.value)}
                  placeholder="techno, house, trance"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventIds">Specific Event IDs (optional)</Label>
                <Input
                  id="eventIds"
                  value={eventIdsText}
                  onChange={(e) => setEventIdsText(e.target.value)}
                  placeholder="123,456,789"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Pacing preference, must-see artists, logistics"
                  className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={createPlan} disabled={loading || !name || !email || !accessCode}>
                  {loading ? 'Generating...' : 'Generate My Plan'}
                </Button>
                {error && <p className="text-sm text-red-400">{error}</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Output
              </CardTitle>
              <CardDescription>
                Includes share link + downloadable itinerary assets.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!result && <p className="text-sm text-muted-foreground">No generated plan yet.</p>}

              {result && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-sm">Status: {result.order.status}</p>
                    <p className="text-sm">Selected events: {result.order.selectedEvents}</p>
                    <p className="text-sm">Price: ${result.order.priceUsd}</p>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <a
                      href={result.links.share}
                      className="inline-flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent/20"
                    >
                      Open share page
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <a
                      href={result.links.json}
                      className="inline-flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent/20"
                    >
                      Download JSON
                      <Download className="h-4 w-4" />
                    </a>
                    <a
                      href={result.links.ics}
                      className="inline-flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent/20"
                    >
                      Download ICS
                      <Download className="h-4 w-4" />
                    </a>
                    <a
                      href={result.links.pdf}
                      className="inline-flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent/20"
                    >
                      Download Printable HTML
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <LeadForm
          offerType="concierge_plan"
          title="Need curated support without a code?"
          submitLabel="Request Concierge Access"
        />
    </AppShell>
  );
}
