import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { CONCIERGE_PRICES, MONETIZATION_FLAG } from '@/lib/monetization-config';
import { incrementAccessCodeUsage, validateAccessCode } from '@/lib/access-codes';
import { buildConciergeHtml, buildConciergePlan, buildIcs } from '@/lib/concierge';
import { createAccessCode, isFetchFailure, normalizeEmail, safeTrim } from '@/lib/monetization-server';
import type { ConciergeTier, EntitlementType } from '@/lib/monetization-types';

const TIERS: ConciergeTier[] = ['self_serve', 'curated'];

function parseIds(input: unknown): number[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((x) => Number(x))
    .filter((x) => Number.isFinite(x) && x > 0);
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Supabase is not configured. Concierge processing is unavailable.' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const tier = safeTrim(body?.tier) as ConciergeTier;
    const name = safeTrim(body?.name);
    const email = safeTrim(body?.email);
    const selectedDate = safeTrim(body?.selectedDate);
    const notes = safeTrim(body?.notes);
    const code = safeTrim(body?.accessCode);
    let validatedAccessCodeId: number | null = null;
    const travelBufferMinutes = Math.max(0, Math.min(Number(body?.travelBufferMinutes || 30), 180));
    const selectedEventIds = parseIds(body?.selectedEventIds);
    const preferredGenres = Array.isArray(body?.preferences?.genres)
      ? body.preferences.genres.map((x: unknown) => safeTrim(x)).filter(Boolean)
      : [];

    if (!TIERS.includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    if (MONETIZATION_FLAG) {
      const accepted: EntitlementType[] =
        tier === 'curated' ? ['CONCIERGE_CURATED'] : ['CONCIERGE_SELF_SERVE', 'CONCIERGE_CURATED'];
      const validation = await validateAccessCode(code, accepted);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.reason }, { status: 403 });
      }

      // Usage is incremented only after we successfully materialize the order.
      validatedAccessCodeId = validation.code.id;
    }

    const shareId = createAccessCode('PLAN');
    const basePrice = CONCIERGE_PRICES[tier];

    const { data: order, error: createError } = await supabase
      .from('concierge_orders')
      .insert({
        share_id: shareId,
        tier,
        status: 'pending',
        customer_name: name,
        customer_email: normalizeEmail(email),
        selected_date: selectedDate || null,
        travel_buffer_minutes: travelBufferMinutes,
        selected_event_ids: selectedEventIds,
        preferences: {
          genres: preferredGenres,
        },
        notes: notes || null,
        price_usd: basePrice,
        currency: 'USD',
      })
      .select('id, share_id')
      .single();

    if (createError || !order) {
      if (isFetchFailure(createError)) {
        return NextResponse.json(
          { error: 'Supabase is unreachable. Concierge processing is temporarily unavailable.' },
          { status: 503 }
        );
      }

      return NextResponse.json({ error: createError?.message || 'Failed to create order' }, { status: 500 });
    }

    await supabase
      .from('concierge_orders')
      .update({ status: 'processing' })
      .eq('id', order.id);

    let query = supabase
      .from('events')
      .select('id,title,start_date,end_date,venue_name,categories,sold_out,url')
      .eq('is_active', true)
      .order('start_date', { ascending: true })
      .limit(1200);

    if (selectedDate) {
      const start = `${selectedDate}T00:00:00.000Z`;
      const end = `${selectedDate}T23:59:59.999Z`;
      query = query.gte('start_date', start).lte('start_date', end);
    }

    if (selectedEventIds.length > 0) {
      query = query.in('id', selectedEventIds);
    }

    const { data: eventRows, error: eventsError } = await query;
    if (eventsError || !eventRows) {
      if (isFetchFailure(eventsError)) {
        return NextResponse.json(
          { error: 'Supabase is unreachable. Concierge processing is temporarily unavailable.' },
          { status: 503 }
        );
      }

      await supabase
        .from('concierge_orders')
        .update({ status: 'failed', notes: eventsError?.message || 'Failed to load events' })
        .eq('id', order.id);

      return NextResponse.json({ error: eventsError?.message || 'Failed to load events' }, { status: 500 });
    }

    if (eventRows.length === 0) {
      await supabase
        .from('concierge_orders')
        .update({ status: 'failed', notes: 'No events found for selected criteria' })
        .eq('id', order.id);

      return NextResponse.json({ error: 'No events found for your criteria' }, { status: 404 });
    }

    const plan = buildConciergePlan(
      eventRows,
      travelBufferMinutes,
      preferredGenres,
      tier === 'curated' ? 12 : 8
    );

    const itineraryPayload = {
      generatedAt: new Date().toISOString(),
      selectedDate: selectedDate || null,
      selected: plan.selected,
      rejected: plan.rejected,
      notes: plan.notes,
      preferredGenres,
      travelBufferMinutes,
    };

    const itineraryIcs = buildIcs(plan.selected, `Festival Concierge (${tier})`);
    const itineraryHtml = buildConciergeHtml(tier, name, plan.selected, plan.notes);

    await supabase
      .from('concierge_orders')
      .update({
        status: 'ready',
        itinerary_payload: itineraryPayload,
        itinerary_ics: itineraryIcs,
        itinerary_pdf_html: itineraryHtml,
        completed_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (validatedAccessCodeId) {
      await incrementAccessCodeUsage(validatedAccessCodeId);
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        shareId,
        tier,
        status: 'ready',
        selectedEvents: plan.selected.length,
        priceUsd: basePrice,
      },
      links: {
        share: `/concierge/share/${encodeURIComponent(shareId)}`,
        json: `/api/concierge/download?shareId=${encodeURIComponent(shareId)}&format=json`,
        ics: `/api/concierge/download?shareId=${encodeURIComponent(shareId)}&format=ics`,
        pdf: `/api/concierge/download?shareId=${encodeURIComponent(shareId)}&format=pdf`,
      },
    });
  } catch (error) {
    if (isFetchFailure(error)) {
      return NextResponse.json(
        { error: 'Supabase is unreachable. Concierge processing is temporarily unavailable.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create concierge order' },
      { status: 500 }
    );
  }
}
