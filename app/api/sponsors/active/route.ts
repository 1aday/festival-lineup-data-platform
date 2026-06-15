import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { isFetchFailure } from '@/lib/monetization-server';

const PLACEMENTS = ['home', 'schedule', 'artists', 'spotify_events'] as const;
type Placement = (typeof PLACEMENTS)[number];
type CampaignWindow = {
  start_at: string | null;
  end_at: string | null;
};

function isActiveCampaign(row: CampaignWindow, now: Date): boolean {
  const startOk = !row.start_at || new Date(row.start_at).getTime() <= now.getTime();
  const endOk = !row.end_at || new Date(row.end_at).getTime() >= now.getTime();
  return startOk && endOk;
}

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { campaigns: [], primary: null, warning: 'Supabase is not configured' },
      { status: 200 }
    );
  }

  try {
    const placementParam = request.nextUrl.searchParams.get('placement')?.trim() as Placement | undefined;

    if (placementParam && !PLACEMENTS.includes(placementParam)) {
      return NextResponse.json({ error: 'Invalid placement' }, { status: 400 });
    }

    let query = supabase
      .from('sponsor_campaigns')
      .select('id,title,description,sponsor_name,placement,target_url,cta_label,image_url,package_tier,package_price_usd,priority,start_at,end_at')
      .eq('status', 'active')
      .order('priority', { ascending: false })
      .limit(10);

    if (placementParam) {
      query = query.eq('placement', placementParam);
    }

    const { data, error } = await query;

    if (error) {
      if (isFetchFailure(error)) {
        return NextResponse.json(
          { campaigns: [], primary: null, warning: 'Supabase is unreachable' },
          { status: 200 }
        );
      }

      return NextResponse.json({ error: error.message || 'Failed to fetch campaigns' }, { status: 500 });
    }

    const now = new Date();
    const active = (data || []).filter((row) => isActiveCampaign(row, now));

    return NextResponse.json({
      campaigns: active,
      primary: active[0] || null,
    });
  } catch (error) {
    if (isFetchFailure(error)) {
      return NextResponse.json(
        { campaigns: [], primary: null, warning: 'Supabase is unreachable' },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}
