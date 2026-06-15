import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { API_FALLBACK_PLAN_QUOTA, API_FREE_DAILY_QUOTA, MONETIZATION_FLAG } from '@/lib/monetization-config';
import { getClientIp, hashSecret, toDateKey } from '@/lib/monetization-server';
import type { ApiAccessDecision, ApiPlan } from '@/lib/monetization-types';

interface ApiAccessResult {
  decision: ApiAccessDecision;
  headers: Record<string, string>;
  response?: NextResponse;
}

function toHeaders(decision: ApiAccessDecision): Record<string, string> {
  return {
    'X-API-Plan': decision.plan,
    'X-RateLimit-Limit': String(decision.limit),
    'X-RateLimit-Used': String(decision.used),
    'X-RateLimit-Remaining': String(Math.max(decision.remaining, 0)),
  };
}

function buildFailureResponse(decision: ApiAccessDecision): NextResponse {
  const response = NextResponse.json(
    {
      error: decision.message || 'API access denied',
      plan: decision.plan,
      limit: decision.limit,
      used: decision.used,
      remaining: decision.remaining,
    },
    { status: decision.statusCode || 403 }
  );

  const headers = toHeaders(decision);
  for (const [k, v] of Object.entries(headers)) {
    response.headers.set(k, v);
  }

  return response;
}

function planFromCode(code: string | null | undefined): ApiPlan {
  if (!code) return 'starter';
  if (code === 'starter' || code === 'pro' || code === 'studio') {
    return code;
  }

  return 'starter';
}

export function withApiHeaders(response: NextResponse, headers: Record<string, string>): NextResponse {
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }

  return response;
}

export async function enforceApiAccess(
  request: NextRequest,
  endpoint: string,
  freeDailyQuota: number = API_FREE_DAILY_QUOTA
): Promise<ApiAccessResult> {
  if (!MONETIZATION_FLAG) {
    const decision: ApiAccessDecision = {
      allowed: true,
      plan: 'free',
      limit: freeDailyQuota,
      used: 0,
      remaining: freeDailyQuota,
      scopeType: 'ip',
      scopeValue: getClientIp(request),
      apiKeyId: null,
    };

    return {
      decision,
      headers: toHeaders(decision),
    };
  }

  const rawKey = request.headers.get('x-api-key')?.trim() || '';
  const hasKey = Boolean(rawKey);
  const usageDate = toDateKey();

  try {
    let decision: ApiAccessDecision;

    if (!hasKey) {
      const ip = getClientIp(request);
      decision = {
        allowed: true,
        plan: 'free',
        limit: freeDailyQuota,
        used: 0,
        remaining: freeDailyQuota,
        scopeType: 'ip',
        scopeValue: ip,
        apiKeyId: null,
      };
    } else {
      const keyHash = hashSecret(rawKey);
      const { data: apiKey, error: apiKeyError } = await supabase
        .from('api_keys')
        .select(`
          id,
          status,
          expires_at,
          daily_quota_override,
          plan_id,
          api_plans (
            code,
            daily_quota,
            is_enabled
          )
        `)
        .eq('key_hash', keyHash)
        .single();

      if (apiKeyError || !apiKey) {
        decision = {
          allowed: false,
          plan: 'free',
          limit: freeDailyQuota,
          used: 0,
          remaining: freeDailyQuota,
          statusCode: 401,
          message: 'Invalid API key',
          scopeType: 'ip',
          scopeValue: getClientIp(request),
          apiKeyId: null,
        };

        return { decision, headers: toHeaders(decision), response: buildFailureResponse(decision) };
      }

      if (apiKey.status !== 'active') {
        decision = {
          allowed: false,
          plan: 'free',
          limit: freeDailyQuota,
          used: 0,
          remaining: freeDailyQuota,
          statusCode: 403,
          message: `API key is ${apiKey.status}`,
          scopeType: 'api_key',
          scopeValue: apiKey.id,
          apiKeyId: apiKey.id,
        };

        return { decision, headers: toHeaders(decision), response: buildFailureResponse(decision) };
      }

      const expiresAt = apiKey.expires_at ? new Date(apiKey.expires_at) : null;
      if (expiresAt && expiresAt.getTime() < Date.now()) {
        decision = {
          allowed: false,
          plan: 'free',
          limit: freeDailyQuota,
          used: 0,
          remaining: freeDailyQuota,
          statusCode: 403,
          message: 'API key expired',
          scopeType: 'api_key',
          scopeValue: apiKey.id,
          apiKeyId: apiKey.id,
        };

        return { decision, headers: toHeaders(decision), response: buildFailureResponse(decision) };
      }

      const planRow = Array.isArray(apiKey.api_plans) ? apiKey.api_plans[0] : apiKey.api_plans;
      const plan = planFromCode(planRow?.code);
      const planQuota = Number(apiKey.daily_quota_override || planRow?.daily_quota || API_FALLBACK_PLAN_QUOTA[plan]);

      decision = {
        allowed: true,
        plan,
        limit: planQuota,
        used: 0,
        remaining: planQuota,
        scopeType: 'api_key',
        scopeValue: apiKey.id,
        apiKeyId: apiKey.id,
      };

      // Update key last seen non-blocking
      await supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', apiKey.id);
    }

    const { data: usageRows, error: usageFetchError } = await supabase
      .from('api_usage_daily')
      .select('id, request_count')
      .eq('usage_date', usageDate)
      .eq('endpoint', endpoint)
      .eq('scope_type', decision.scopeType)
      .eq('scope_value', decision.scopeValue)
      .limit(1);

    if (usageFetchError) {
      // Fail open on metering issues
      decision.used = 0;
      decision.remaining = decision.limit;
      return { decision, headers: toHeaders(decision) };
    }

    const existing = usageRows?.[0];
    const used = Number(existing?.request_count || 0);
    decision.used = used;

    if (used >= decision.limit) {
      decision.allowed = false;
      decision.statusCode = 429;
      decision.message = 'Daily API quota exceeded';
      decision.remaining = 0;

      return { decision, headers: toHeaders(decision), response: buildFailureResponse(decision) };
    }

    const nextUsed = used + 1;

    if (existing?.id) {
      await supabase
        .from('api_usage_daily')
        .update({ request_count: nextUsed })
        .eq('id', existing.id);
    } else {
      await supabase.from('api_usage_daily').insert({
        usage_date: usageDate,
        endpoint,
        scope_type: decision.scopeType,
        scope_value: decision.scopeValue,
        api_key_id: decision.apiKeyId || null,
        request_count: nextUsed,
      });
    }

    decision.used = nextUsed;
    decision.remaining = Math.max(decision.limit - nextUsed, 0);

    return {
      decision,
      headers: toHeaders(decision),
    };
  } catch {
    // Fail open if monetization stack is unavailable.
    const decision: ApiAccessDecision = {
      allowed: true,
      plan: 'free',
      limit: freeDailyQuota,
      used: 0,
      remaining: freeDailyQuota,
      scopeType: 'ip',
      scopeValue: getClientIp(request),
      apiKeyId: null,
    };

    return {
      decision,
      headers: toHeaders(decision),
    };
  }
}
