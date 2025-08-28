import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Fetch the geo data to inspect properties
    const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
    const response = await fetch(geoUrl);
    const data = await response.json();
    
    // Get a sample of countries from the topology
    const { topojson } = await import('topojson-client');
    const geographies = topojson.feature(data, data.objects.countries);
    
    // Get first 5 countries to inspect their properties
    const sampleCountries = geographies.features.slice(0, 5).map((geo: any) => ({
      type: geo.type,
      properties: geo.properties,
      id: geo.id
    }));

    return NextResponse.json({
      message: 'Geography data properties sample',
      sample: sampleCountries,
      totalCountries: geographies.features.length,
      propertyKeys: sampleCountries[0] ? Object.keys(sampleCountries[0].properties || {}) : []
    });
  } catch (error) {
    return NextResponse.json({ 
      error: String(error),
      message: 'Failed to fetch geography data'
    }, { status: 500 });
  }
}
