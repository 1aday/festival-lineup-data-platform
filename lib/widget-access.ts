import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { getClientIp, getOriginHost, hashSecret, toDateKey } from '@/lib/monetization-server';

interface WidgetAccessResult {
  allowed: boolean;
  response?: NextResponse;
  plan: 'basic' | 'white_label' | 'free';
  keyId?: string | null;
}

function forbidden(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

export async function validateWidgetAccess(request: NextRequest, widget: 'lineup' | 'artists' | 'genres'): Promise<WidgetAccessResult> {
  if (!isSupabaseConfigured()) {
    return { allowed: false, response: forbidden('Supabase is not configured'), plan: 'free' };
  }

  const rawKey = request.nextUrl.searchParams.get('key')?.trim();
  const usageDate = toDateKey();

  if (!rawKey) {
    return { allowed: false, response: forbidden('Missing widget key'), plan: 'free' };
  }

  const keyHash = hashSecret(rawKey);

  try {
    const { data: keys, error } = await supabase
      .from('widget_keys')
      .select('id, status, plan_type, allowed_domains, daily_quota, expires_at')
      .eq('key_hash', keyHash)
      .limit(1);

    if (error || !keys || keys.length === 0) {
      return { allowed: false, response: forbidden('Invalid widget key'), plan: 'free' };
    }

    const key = keys[0];

    if (key.status !== 'active') {
      return { allowed: false, response: forbidden(`Widget key is ${key.status}`), plan: 'free' };
    }

    if (key.expires_at && new Date(key.expires_at).getTime() < Date.now()) {
      return { allowed: false, response: forbidden('Widget key expired'), plan: 'free' };
    }

    const host = getOriginHost(request);
    const allowlist: string[] = key.allowed_domains || [];
    if (allowlist.length > 0 && host && !allowlist.includes(host)) {
      return { allowed: false, response: forbidden(`Domain ${host} is not allowlisted`), plan: 'free' };
    }

    const ip = getClientIp(request);
    const scopeType = 'widget_key';
    const scopeValue = key.id;

    const { data: usageRows } = await supabase
      .from('widget_usage_daily')
      .select('id, request_count')
      .eq('usage_date', usageDate)
      .eq('widget', widget)
      .eq('scope_type', scopeType)
      .eq('scope_value', scopeValue)
      .limit(1);

    const usage = usageRows?.[0];
    const used = Number(usage?.request_count || 0);
    const limit = Number(key.daily_quota || 5000);

    if (used >= limit) {
      return { allowed: false, response: NextResponse.json({ error: 'Widget daily quota exceeded' }, { status: 429 }), plan: 'free' };
    }

    const next = used + 1;

    if (usage?.id) {
      await supabase
        .from('widget_usage_daily')
        .update({ request_count: next })
        .eq('id', usage.id);
    } else {
      await supabase.from('widget_usage_daily').insert({
        usage_date: usageDate,
        widget,
        scope_type: scopeType,
        scope_value: scopeValue,
        widget_key_id: key.id,
        request_count: next,
      });
    }

    await supabase
      .from('widget_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', key.id);

    // Optional IP-level tracking for additional analytics
    const { data: ipUsageRows } = await supabase
      .from('widget_usage_daily')
      .select('id, request_count')
      .eq('usage_date', usageDate)
      .eq('widget', widget)
      .eq('scope_type', 'ip')
      .eq('scope_value', ip)
      .limit(1);

    const ipUsage = ipUsageRows?.[0];
    if (ipUsage?.id) {
      await supabase
        .from('widget_usage_daily')
        .update({ request_count: Number(ipUsage.request_count || 0) + 1 })
        .eq('id', ipUsage.id);
    } else {
      await supabase.from('widget_usage_daily').insert({
        usage_date: usageDate,
        widget,
        scope_type: 'ip',
        scope_value: ip,
        request_count: 1,
      });
    }

    return {
      allowed: true,
      plan: key.plan_type,
      keyId: key.id,
    };
  } catch {
    return { allowed: false, response: forbidden('Widget access unavailable'), plan: 'free' };
  }
}
