import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { hashSecret } from '@/lib/monetization-server';
import type { EntitlementType } from '@/lib/monetization-types';

export interface ValidatedAccessCode {
  id: number;
  entitlementType: EntitlementType;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  metadata: Record<string, unknown>;
}

export async function validateAccessCode(
  rawCode: string,
  acceptedEntitlements: EntitlementType[]
): Promise<{ valid: true; code: ValidatedAccessCode } | { valid: false; reason: string }> {
  if (!isSupabaseConfigured()) {
    return { valid: false, reason: 'Supabase is not configured' };
  }

  const trimmed = rawCode.trim();
  if (!trimmed) {
    return { valid: false, reason: 'Access code is required' };
  }

  const codeHash = hashSecret(trimmed);

  const { data, error } = await supabase
    .from('access_codes')
    .select('id, entitlement_type, status, max_uses, used_count, expires_at, metadata')
    .eq('code_hash', codeHash)
    .limit(1);

  if (error || !data || data.length === 0) {
    return { valid: false, reason: 'Invalid access code' };
  }

  const row = data[0];

  if (row.status !== 'active') {
    return { valid: false, reason: 'Access code is not active' };
  }

  if (!acceptedEntitlements.includes(row.entitlement_type)) {
    return { valid: false, reason: 'Access code does not allow this product' };
  }

  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    return { valid: false, reason: 'Access code expired' };
  }

  if ((row.used_count || 0) >= (row.max_uses || 1)) {
    return { valid: false, reason: 'Access code usage limit reached' };
  }

  return {
    valid: true,
    code: {
      id: row.id,
      entitlementType: row.entitlement_type,
      maxUses: row.max_uses,
      usedCount: row.used_count,
      expiresAt: row.expires_at,
      metadata: row.metadata || {},
    },
  };
}

export async function incrementAccessCodeUsage(id: number): Promise<void> {
  const { data } = await supabase
    .from('access_codes')
    .select('used_count')
    .eq('id', id)
    .single();

  const next = Number(data?.used_count || 0) + 1;

  await supabase
    .from('access_codes')
    .update({ used_count: next })
    .eq('id', id);
}
