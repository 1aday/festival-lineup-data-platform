import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Debug log to check what's being loaded
if (typeof window !== 'undefined') {
  console.log('Supabase Config Check:', {
    url: supabaseUrl ? `✅ Set (${supabaseUrl})` : '❌ Not set',
    key: supabaseAnonKey ? 
      (supabaseAnonKey.startsWith('eyJ') ? 
        `✅ Valid JWT format (${supabaseAnonKey.substring(0, 20)}...)` : 
        `❌ Invalid format (should start with 'eyJ', got: ${supabaseAnonKey.substring(0, 20)}...)`) 
      : '❌ Not set',
    keyLength: supabaseAnonKey.length,
    validKeyLength: supabaseAnonKey.length > 100 ? '✅' : '❌ Too short'
  });
  
  if (supabaseAnonKey && !supabaseAnonKey.startsWith('eyJ')) {
    console.error('⚠️ Your Supabase anon key is invalid! It should be a JWT token starting with "eyJ".');
    console.error('📖 See get-supabase-key.md for instructions on how to get the correct key.');
  }
}

// Check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  // Must have URL
  if (!supabaseUrl || supabaseUrl === 'your_supabase_url_here') {
    return false;
  }
  
  // Must have key
  if (!supabaseAnonKey || supabaseAnonKey === 'your_supabase_anon_key_here') {
    return false;
  }
  
  // Key must be a JWT token (starts with eyJ)
  if (!supabaseAnonKey.startsWith('eyJ')) {
    console.warn('Supabase key is not a valid JWT token. It should start with "eyJ"');
    return false;
  }
  
  // Key should be reasonably long (JWT tokens are typically 200+ chars)
  if (supabaseAnonKey.length < 100) {
    console.warn('Supabase key seems too short for a valid JWT token');
    return false;
  }
  
  return true;
};

// Only create client if properly configured, otherwise create a dummy client
export const supabase = isSupabaseConfigured() 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder-key');
