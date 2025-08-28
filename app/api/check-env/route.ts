import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT_SET';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'NOT_SET';
  
  // Check what the user might have set
  const possibleKeys = [
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY',
    'SUPABASE_ANON_KEY',
    'SUPABASE_URL'
  ];
  
  const envCheck = possibleKeys.reduce((acc, key) => {
    const value = process.env[key];
    if (value) {
      acc[key] = {
        exists: true,
        length: value.length,
        preview: value.substring(0, 20) + '...',
        isJWT: value.startsWith('eyJ')
      };
    } else {
      acc[key] = { exists: false };
    }
    return acc;
  }, {} as Record<string, any>);

  return NextResponse.json({
    configured: {
      url: url !== 'NOT_SET',
      anonKey: anonKey !== 'NOT_SET' && anonKey.startsWith('eyJ'),
    },
    values: {
      url: url !== 'NOT_SET' ? url : null,
      anonKeyPreview: anonKey !== 'NOT_SET' ? `${anonKey.substring(0, 30)}...` : null,
      anonKeyLength: anonKey !== 'NOT_SET' ? anonKey.length : 0,
      anonKeyIsJWT: anonKey !== 'NOT_SET' ? anonKey.startsWith('eyJ') : false,
    },
    allEnvVars: envCheck,
    instructions: anonKey !== 'NOT_SET' && !anonKey.startsWith('eyJ') ? 
      '⚠️ Your key is NOT a valid Supabase anon key! Check /api/check-env for details.' : 
      null
  });
}
