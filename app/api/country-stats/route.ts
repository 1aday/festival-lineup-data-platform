import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getCountryStats } from '@/lib/country-mapping';

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  try {
    // Load all artists
    const { data: artists, error } = await supabase
      .from('artists')
      .select('id, title, country_label, country_value');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get country statistics
    const stats = getCountryStats(artists || []);
    
    // Count unique country labels in raw data
    const rawCountryLabels = new Map<string, number>();
    artists?.forEach(artist => {
      const label = artist.country_label || 'Unknown';
      rawCountryLabels.set(label, (rawCountryLabels.get(label) || 0) + 1);
    });

    // Sort raw labels by count
    const sortedRawLabels = Array.from(rawCountryLabels.entries())
      .sort((a, b) => b[1] - a[1]);

    return NextResponse.json({
      totalArtists: artists?.length || 0,
      mappedCountries: stats.totalCountries,
      topCountries: stats.topCountries,
      unmappedCountries: stats.unmappedCountries,
      rawCountryDistribution: sortedRawLabels.slice(0, 20).map(([country, count]) => ({
        country,
        count,
        percentage: ((count / (artists?.length || 1)) * 100).toFixed(1)
      })),
      summary: {
        totalUniqueCountryLabels: rawCountryLabels.size,
        mappedToISO: stats.totalCountries,
        unmappedCount: stats.unmappedCountries.length,
        topCountryName: sortedRawLabels[0]?.[0],
        topCountryCount: sortedRawLabels[0]?.[1]
      }
    });

  } catch (error) {
    console.error('Error getting country stats:', error);
    return NextResponse.json({ 
      error: String(error)
    }, { status: 500 });
  }
}
