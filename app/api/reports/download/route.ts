import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { MONETIZATION_FLAG } from '@/lib/monetization-config';
import { isFetchFailure, safeTrim } from '@/lib/monetization-server';
import { validateAccessCode } from '@/lib/access-codes';
import type { EntitlementType } from '@/lib/monetization-types';

type ReportFormat = 'json' | 'csv' | 'pdf';

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Supabase is not configured. Report downloads are unavailable.' },
      { status: 503 }
    );
  }

  try {
    const jobId = safeTrim(request.nextUrl.searchParams.get('jobId'));
    const format = (safeTrim(request.nextUrl.searchParams.get('format')) || 'json') as ReportFormat;
    const code = safeTrim(request.nextUrl.searchParams.get('code'));

    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    if (!['json', 'csv', 'pdf'].includes(format)) {
      return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
    }

    const { data: job, error } = await supabase
      .from('report_jobs')
      .select('id, report_tier, access_code_id, report_payload, csv_payload, pdf_payload_html')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      if (isFetchFailure(error)) {
        return NextResponse.json(
          { error: 'Supabase is unreachable. Report download is temporarily unavailable.' },
          { status: 503 }
        );
      }

      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    if (MONETIZATION_FLAG) {
      const accepted: EntitlementType[] =
        job.report_tier === 'full' ? ['REPORT_FULL'] : ['REPORT_BASIC', 'REPORT_FULL'];
      const validation = await validateAccessCode(code, accepted);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.reason }, { status: 403 });
      }

      if (job.access_code_id && validation.code.id !== job.access_code_id) {
        return NextResponse.json({ error: 'Access code does not match this report' }, { status: 403 });
      }
    }

    if (format === 'json') {
      const response = NextResponse.json(job.report_payload || {});
      response.headers.set('Content-Disposition', `attachment; filename="ade-report-${job.id}.json"`);
      return response;
    }

    if (format === 'csv') {
      return new NextResponse(job.csv_payload || '', {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="ade-report-${job.id}.csv"`,
        },
      });
    }

    // Printable HTML payload for PDF-style export workflows
    return new NextResponse(job.pdf_payload_html || '', {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="ade-report-${job.id}.html"`,
      },
    });
  } catch (error) {
    if (isFetchFailure(error)) {
      return NextResponse.json(
        { error: 'Supabase is unreachable. Report download is temporarily unavailable.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to download report' },
      { status: 500 }
    );
  }
}
