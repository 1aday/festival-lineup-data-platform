import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Calendar, Download, MapPin } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

interface PageProps {
  params: { shareId: string };
}

interface SharedEvent {
  id: number;
  title: string;
  start_date: string;
  venue_name: string | null;
  categories: string | null;
}

export default async function ConciergeSharePage({ params }: PageProps) {
  const { shareId } = params;

  const { data: order } = await supabase
    .from('concierge_orders')
    .select('share_id,tier,status,customer_name,itinerary_payload,created_at')
    .eq('share_id', shareId)
    .single();

  if (!order) {
    notFound();
  }

  const selected: SharedEvent[] = Array.isArray(order.itinerary_payload?.selected)
    ? order.itinerary_payload.selected
    : [];

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-5xl p-6 space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Festival Concierge Plan</h1>
          <p className="text-sm text-muted-foreground">
            Share ID: {order.share_id} · Tier: {order.tier} · Status: {order.status}
          </p>
          <p className="text-sm text-muted-foreground">Prepared for {order.customer_name}</p>
        </header>

        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <a href={`/api/concierge/download?shareId=${encodeURIComponent(order.share_id)}&format=json`}>
              <Download className="mr-2 h-4 w-4" />
              JSON
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={`/api/concierge/download?shareId=${encodeURIComponent(order.share_id)}&format=ics`}>
              <Download className="mr-2 h-4 w-4" />
              ICS
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={`/api/concierge/download?shareId=${encodeURIComponent(order.share_id)}&format=pdf`}>
              <Download className="mr-2 h-4 w-4" />
              Printable HTML
            </a>
          </Button>
          <Button asChild>
            <Link href="/concierge">Create another plan</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Selected Itinerary ({selected.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {selected.length === 0 ? (
              <p className="text-sm text-muted-foreground">No selected events were saved for this itinerary.</p>
            ) : (
              <div className="space-y-3">
                {selected.map((event) => (
                  <article key={event.id} className="rounded-lg border border-border p-3">
                    <h2 className="font-semibold">{event.title}</h2>
                    <div className="mt-1 flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(event.start_date).toLocaleString()}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {event.venue_name || '-'}
                      </span>
                    </div>
                    {event.categories && <p className="mt-1 text-xs text-muted-foreground">{event.categories}</p>}
                  </article>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
