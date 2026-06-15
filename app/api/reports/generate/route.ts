import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { MONETIZATION_FLAG } from '@/lib/monetization-config';
import { incrementAccessCodeUsage, validateAccessCode } from '@/lib/access-codes';
import { buildInsightsReport, reportToCsv, reportToHtml } from '@/lib/report-generator';
import { isFetchFailure, normalizeEmail, safeTrim } from '@/lib/monetization-server';
import type { EntitlementType, ReportTier } from '@/lib/monetization-types';

const VALID_TIERS: ReportTier[] = ['basic', 'full'];

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Supabase is not configured. Reports require database access.' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const tier = safeTrim(body?.tier) as ReportTier;
    const code = safeTrim(body?.code);
    const email = safeTrim(body?.email);

    if (!VALID_TIERS.includes(tier)) {
      return NextResponse.json({ error: 'Invalid report tier' }, { status: 400 });
    }

    let accessCodeId: number | null = null;
    let shouldIncrementCode = false;

    if (MONETIZATION_FLAG) {
      const accepted: EntitlementType[] =
        tier === 'full' ? ['REPORT_FULL'] : ['REPORT_BASIC', 'REPORT_FULL'];
      const validation = await validateAccessCode(code, accepted);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.reason }, { status: 403 });
      }

      accessCodeId = validation.code.id;
      shouldIncrementCode = true;
    }

    const report = await buildInsightsReport(tier);
    const csv = reportToCsv(report);
    const html = reportToHtml(report);

    const { data, error } = await supabase
      .from('report_jobs')
      .insert({
        requested_by_email: email ? normalizeEmail(email) : null,
        report_tier: tier,
        status: 'completed',
        access_code_id: accessCodeId,
        report_payload: report,
        csv_payload: csv,
        pdf_payload_html: html,
        completed_at: new Date().toISOString(),
      })
      .select('id, report_tier, status, created_at')
      .single();

    if (error) {
      if (isFetchFailure(error)) {
        return NextResponse.json(
          { error: 'Supabase is unreachable. Report generation is temporarily unavailable.' },
          { status: 503 }
        );
      }

      return NextResponse.json({ error: error.message || 'Failed to save report' }, { status: 500 });
    }

    if (shouldIncrementCode && accessCodeId) {
      await incrementAccessCodeUsage(accessCodeId);
    }

    return NextResponse.json({
      success: true,
      job: data,
      downloads: {
        json: `/api/reports/download?jobId=${data.id}&format=json${code ? `&code=${encodeURIComponent(code)}` : ''}`,
        csv: `/api/reports/download?jobId=${data.id}&format=csv${code ? `&code=${encodeURIComponent(code)}` : ''}`,
        pdf: `/api/reports/download?jobId=${data.id}&format=pdf${code ? `&code=${encodeURIComponent(code)}` : ''}`,
      },
    });
  } catch (error) {
    if (isFetchFailure(error)) {
      return NextResponse.json(
        { error: 'Supabase is unreachable. Report generation is temporarily unavailable.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate report' },
      { status: 500 }
    );
  }
}
