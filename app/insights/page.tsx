'use client';

import { useState } from 'react';
import { BarChart3, Download, FileText, Lock, Sparkles } from 'lucide-react';

import { AppShell } from '@/components/design/AppShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConversionCtaStrip, TrustMiniRow } from '@/components/monetization/app-ctas';
import { LeadForm } from '@/components/monetization/lead-form';
import { REPORT_PRICES } from '@/lib/monetization-config';
import type { ReportTier } from '@/lib/monetization-types';

interface DownloadLinks {
  json: string;
  csv: string;
  pdf: string;
}

const tierMeta: Record<ReportTier, { title: string; description: string; bullets: string[] }> = {
  basic: {
    title: 'Basic Pack',
    description: 'Core festival counts, top artists, top venues, and category snapshots.',
    bullets: ['JSON + CSV + printable HTML', 'Top market summary', 'Quick venue & genre breakdown'],
  },
  full: {
    title: 'Full Pack',
    description: 'Extended depth for agencies, media desks, and booking intelligence.',
    bullets: ['Expanded ranking coverage', 'Extended event/category detail', 'Includes everything in Basic'],
  },
};

export default function InsightsPage() {
  const [tier, setTier] = useState<ReportTier>('basic');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloads, setDownloads] = useState<DownloadLinks | null>(null);

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    setDownloads(null);

    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          email,
          code,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to generate report');
        return;
      }

      setDownloads(data.downloads);
    } catch {
      setError('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell
      title="Festival Intelligence Packs"
      subtitle="Premium data packs unlocked via manually issued access codes"
      actions={
        <Badge variant="outline" className="border-primary/30 bg-primary/10">
          <Lock className="mr-2 h-4 w-4" />
          Code Required
        </Badge>
      }
    >

        <ConversionCtaStrip variant="insights" />
        <TrustMiniRow className="mb-6 mt-3" />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {(Object.keys(tierMeta) as ReportTier[]).map((entryTier) => (
            <Card
              key={entryTier}
              className={entryTier === tier ? 'border-primary/50 shadow-lg shadow-primary/10' : ''}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {tierMeta[entryTier].title}
                </CardTitle>
                <CardDescription>{tierMeta[entryTier].description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-2xl font-bold">${REPORT_PRICES[entryTier]}</div>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {tierMeta[entryTier].bullets.map((bullet) => (
                    <li key={bullet}>• {bullet}</li>
                  ))}
                </ul>
                <Button
                  variant={tier === entryTier ? 'default' : 'outline'}
                  onClick={() => setTier(entryTier)}
                >
                  {tier === entryTier ? 'Selected' : 'Choose'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Generate Pack
            </CardTitle>
            <CardDescription>Enter your access code to unlock the selected report tier.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="tier">Tier</Label>
                <Input id="tier" value={tier} readOnly />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Access Code</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="FEST-XXXXXX"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={generateReport} disabled={loading || !code}>
                {loading ? 'Generating...' : 'Generate Report'}
              </Button>
              {error && <p className="text-sm text-red-400">{error}</p>}
            </div>

            {downloads && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <a href={downloads.json} className="rounded-lg border border-border p-3 text-sm hover:bg-accent/20">
                  <FileText className="mb-1 h-4 w-4" />
                  Download JSON
                </a>
                <a href={downloads.csv} className="rounded-lg border border-border p-3 text-sm hover:bg-accent/20">
                  <Download className="mb-1 h-4 w-4" />
                  Download CSV
                </a>
                <a href={downloads.pdf} className="rounded-lg border border-border p-3 text-sm hover:bg-accent/20">
                  <Download className="mb-1 h-4 w-4" />
                  Download Printable HTML
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        <LeadForm
          offerType="data_pack"
          title="Need an access code?"
          submitLabel="Request Data Pack Access"
        />
    </AppShell>
  );
}
