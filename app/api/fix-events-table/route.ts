import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  try {
    // First, check current columns
    const { data: currentColumns, error: checkError } = await supabase
      .rpc('get_table_columns', { 
        table_name: 'events',
        schema_name: 'public'
      })
      .single();

    if (checkError) {
      // If the function doesn't exist, try a direct approach
      console.log('Checking columns directly...');
    }

    // Try to add the missing columns
    const { data, error } = await supabase.rpc('execute_sql', {
      sql: `
        ALTER TABLE public.events 
        ADD COLUMN IF NOT EXISTS categories TEXT,
        ADD COLUMN IF NOT EXISTS sold_out BOOLEAN DEFAULT false;
      `
    });

    if (error) {
      // If RPC doesn't work, at least we can test if the columns exist
      const { data: testEvent, error: testError } = await supabase
        .from('events')
        .select('id, categories, sold_out')
        .limit(1);

      if (testError) {
        return NextResponse.json({ 
          error: 'Columns missing. Please run this SQL in Supabase SQL Editor:',
          sql: `
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS categories TEXT,
ADD COLUMN IF NOT EXISTS sold_out BOOLEAN DEFAULT false;
          `
        }, { status: 400 });
      }

      return NextResponse.json({ 
        message: 'Columns already exist!',
        testResult: testEvent
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Events table fixed successfully!'
    });

  } catch (error) {
    console.error('Error fixing events table:', error);
    return NextResponse.json({ 
      error: String(error),
      fixSQL: `
-- Run this in Supabase SQL Editor:
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS categories TEXT,
ADD COLUMN IF NOT EXISTS sold_out BOOLEAN DEFAULT false;
      `
    }, { status: 500 });
  }
}
