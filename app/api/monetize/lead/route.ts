import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { isFetchFailure, safeTrim, normalizeEmail } from '@/lib/monetization-server';
import type { OfferType } from '@/lib/monetization-types';

const VALID_OFFERS: OfferType[] = [
  'sponsored_placement',
  'pro_api',
  'data_pack',
  'white_label_embed',
  'concierge_plan',
];

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const offerType = safeTrim(body?.offerType) as OfferType;
    const name = safeTrim(body?.name);
    const email = safeTrim(body?.email);
    const org = safeTrim(body?.org);
    const notes = safeTrim(body?.notes);

    if (!VALID_OFFERS.includes(offerType)) {
      return NextResponse.json({ error: 'Invalid offerType' }, { status: 400 });
    }

    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('monetize_leads')
      .insert({
        offer_type: offerType,
        name,
        email: normalizeEmail(email),
        org: org || null,
        notes: notes || null,
        status: 'new',
        source: 'web',
        currency: 'USD',
      })
      .select('id, offer_type, status, created_at')
      .single();

    if (error) {
      if (isFetchFailure(error)) {
        return NextResponse.json(
          { error: 'Supabase is unreachable. Lead capture is temporarily unavailable.' },
          { status: 503 }
        );
      }

      return NextResponse.json({ error: error.message || 'Failed to capture lead' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      lead: data,
      message: 'Lead captured. We will follow up manually for invoicing and activation.',
    });
  } catch (error) {
    if (isFetchFailure(error)) {
      return NextResponse.json(
        { error: 'Supabase is unreachable. Lead capture is temporarily unavailable.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to capture lead',
      },
      { status: 500 }
    );
  }
}
