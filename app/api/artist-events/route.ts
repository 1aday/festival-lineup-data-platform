import { NextRequest, NextResponse } from 'next/server';
import { enforceApiAccess, withApiHeaders } from '@/lib/api-access';
import { fetchCloudflareData } from '@/lib/cloudflare-data';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const access = await enforceApiAccess(request, '/api/artist-events');
  if (access.response) return access.response;

  try {
    const cloudflareRows = await fetchCloudflareData<unknown[]>('/api/artist-events');
    if (cloudflareRows) {
      const response = withApiHeaders(NextResponse.json(cloudflareRows), access.headers);
      response.headers.set('X-Data-Source', 'cloudflare');
      return response;
    }
  } catch (error) {
    console.warn('Cloudflare artist-events fallback:', error);
  }

  if (!isSupabaseConfigured()) {
    const response = withApiHeaders(NextResponse.json([]), access.headers);
    response.headers.set('X-Demo-Reason', 'no_artist_events_source');
    return response;
  }

  const { data, error } = await supabase.from('artist_events').select('*');
  if (error) {
    const response = withApiHeaders(NextResponse.json([]), access.headers);
    response.headers.set('X-Demo-Reason', error.message || 'failed_to_fetch_artist_events');
    return response;
  }

  return withApiHeaders(NextResponse.json(data || []), access.headers);
}
