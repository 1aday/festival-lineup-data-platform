import { NextRequest, NextResponse } from 'next/server';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { isFetchFailure, safeTrim } from '@/lib/monetization-server';

type DownloadFormat = 'json' | 'ics' | 'pdf';

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Supabase is not configured. Concierge downloads are unavailable.' },
      { status: 503 }
    );
  }

  try {
    const shareId = safeTrim(request.nextUrl.searchParams.get('shareId'));
    const format = (safeTrim(request.nextUrl.searchParams.get('format')) || 'json') as DownloadFormat;

    if (!shareId) {
      return NextResponse.json({ error: 'shareId is required' }, { status: 400 });
    }

    if (!['json', 'ics', 'pdf'].includes(format)) {
      return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
    }

    const { data: order, error } = await supabase
      .from('concierge_orders')
      .select('id,share_id,status,tier,customer_name,itinerary_payload,itinerary_ics,itinerary_pdf_html')
      .eq('share_id', shareId)
      .single();

    if (error || !order) {
      if (isFetchFailure(error)) {
        return NextResponse.json(
          { error: 'Supabase is unreachable. Concierge download is temporarily unavailable.' },
          { status: 503 }
        );
      }

      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (!['ready', 'delivered'].includes(order.status)) {
      return NextResponse.json({ error: 'Order is not ready yet' }, { status: 409 });
    }

    if (format === 'json') {
      const response = NextResponse.json(order.itinerary_payload || {});
      response.headers.set('Content-Disposition', `attachment; filename="ade-plan-${order.share_id}.json"`);
      return response;
    }

    if (format === 'ics') {
      return new NextResponse(order.itinerary_ics || '', {
        headers: {
          'Content-Type': 'text/calendar; charset=utf-8',
          'Content-Disposition': `attachment; filename="ade-plan-${order.share_id}.ics"`,
        },
      });
    }

    // Printable HTML payload for PDF-like export
    return new NextResponse(order.itinerary_pdf_html || '', {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="ade-plan-${order.share_id}.html"`,
      },
    });
  } catch (error) {
    if (isFetchFailure(error)) {
      return NextResponse.json(
        { error: 'Supabase is unreachable. Concierge download is temporarily unavailable.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to download itinerary' },
      { status: 500 }
    );
  }
}
