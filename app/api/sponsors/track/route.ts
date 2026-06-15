import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { isFetchFailure } from '@/lib/monetization-server';

const PLACEMENTS = ['home', 'schedule', 'artists', 'spotify_events'] as const;
const EVENTS = ['impression', 'click'] as const;

type Placement = (typeof PLACEMENTS)[number];
type EventType = (typeof EVENTS)[number];

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: true, skipped: 'supabase_not_configured' });
  }

  try {
    const body = await request.json();
    const campaignId = Number(body?.campaignId);
    const placement = body?.placement as Placement;
    const eventType = body?.eventType as EventType;
    const metadata = typeof body?.metadata === 'object' && body?.metadata ? body.metadata : {};

    if (!campaignId || Number.isNaN(campaignId)) {
      return NextResponse.json({ error: 'campaignId is required' }, { status: 400 });
    }

    if (!PLACEMENTS.includes(placement)) {
      return NextResponse.json({ error: 'Invalid placement' }, { status: 400 });
    }

    if (!EVENTS.includes(eventType)) {
      return NextResponse.json({ error: 'Invalid eventType' }, { status: 400 });
    }

    const metricDate = new Date().toISOString().slice(0, 10);

    const { data: existingRows } = await supabase
      .from('sponsor_metrics')
      .select('id, count')
      .eq('metric_date', metricDate)
      .eq('campaign_id', campaignId)
      .eq('placement', placement)
      .eq('event_type', eventType)
      .limit(1);

    const existing = existingRows?.[0];

    if (existing?.id) {
      await supabase
        .from('sponsor_metrics')
        .update({
          count: Number(existing.count || 0) + 1,
          last_event_at: new Date().toISOString(),
          metadata,
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('sponsor_metrics').insert({
        metric_date: metricDate,
        campaign_id: campaignId,
        placement,
        event_type: eventType,
        count: 1,
        last_event_at: new Date().toISOString(),
        metadata,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isFetchFailure(error)) {
      return NextResponse.json({ success: true, skipped: 'supabase_unreachable' });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to track sponsor metric' },
      { status: 500 }
    );
  }
}
