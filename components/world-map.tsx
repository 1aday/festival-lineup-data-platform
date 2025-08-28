'use client';

import { useEffect, useState } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup
} from 'react-simple-maps';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getISOCode, getCountryStats } from '@/lib/country-mapping';

// TypeScript declarations for window debugging
declare global {
  interface Window {
    geoLogged?: boolean;
    mapDebugLogged?: boolean;
  }
}

// Simple color scale function
const scaleLinear = (domain: number[], range: string[]): any => {
  return (value: number) => {
    const [min, mid1, mid2, max] = domain;
    const [color1, color2, color3, color4] = range;
    
    if (value <= min) return color1;
    if (value <= mid1) return color2;
    if (value <= mid2) return color3;
    return color4;
  };
};

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface CountryData {
  country: string;
  count: number;
  artists: string[];
}

interface WorldMapProps {
  artistData: any[];
}

export function WorldMap({ artistData }: WorldMapProps) {
  const [countryData, setCountryData] = useState<Map<string, CountryData>>(new Map());
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [tooltipContent, setTooltipContent] = useState<CountryData | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Process artist data to count by country using ISO codes
    const countryMap = new Map<string, CountryData>();
    let unmappedCount = 0;
    
    artistData.forEach(artist => {
      const countryName = artist.country_label;
      if (!countryName || countryName === 'Unknown' || countryName === '') {
        unmappedCount++;
        return;
      }
      
      // Get ISO code from country name
      const countryCode = getISOCode(countryName);
      
      if (countryCode) {
        const existing = countryMap.get(countryCode);
        if (existing) {
          existing.count++;
          if (!existing.artists.includes(artist.title)) {
            existing.artists.push(artist.title);
          }
        } else {
          countryMap.set(countryCode, {
            country: countryName,
            count: 1,
            artists: [artist.title]
          });
        }
      } else {
        // Country name couldn't be mapped
        console.log(`Could not map country: ${countryName} for artist: ${artist.title}`);
        unmappedCount++;
      }
    });
    
    console.log(`Mapped ${artistData.length - unmappedCount} of ${artistData.length} artists to countries`);
    console.log(`Countries represented: ${countryMap.size}`);
    console.log('Country distribution:', Array.from(countryMap.entries()).map(([code, data]) => 
      `${code}: ${data.count} artists`
    ).sort((a, b) => {
      const countA = parseInt(a.split(': ')[1]);
      const countB = parseInt(b.split(': ')[1]);
      return countB - countA;
    }).slice(0, 10));
    
    setCountryData(countryMap);
  }, [artistData]);

  const maxCount = Math.max(...Array.from(countryData.values()).map(d => d.count), 1);
  
  const colorScale = scaleLinear(
    [0, maxCount / 4, maxCount / 2, maxCount],
    ['#1e293b', '#3b82f6', '#6366f1', '#a855f7']
  );

  const getCountryCode = (geo: any): string => {
    // Try multiple property names that might contain the country code
    const props = geo.properties;
    
    // Common property names in different GeoJSON files
    const code = props.ISO_A2 || 
                props.ISO_A2_EH || 
                props.iso_a2 || 
                props.ISO2 || 
                props.ISO || 
                props.ADMIN ||
                props.NAME ||
                props.name ||
                '';
    
    // Log first few to debug
    if (!window.geoLogged) {
      console.log('Geography properties example:', props);
      window.geoLogged = true;
    }
    
    return code;
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    setMousePosition({ x: event.clientX, y: event.clientY });
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Artist Distribution by Country</span>
          <Badge variant="secondary">
            {countryData.size} Countries
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 relative">
        <div 
          className="relative w-full h-[500px] bg-gradient-to-br from-slate-950 to-slate-900"
          onMouseMove={handleMouseMove}
        >
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{
              scale: 140,
              center: [0, 20]
            }}
          >
            <ZoomableGroup>
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const countryCode = getCountryCode(geo);
                    const data = countryData.get(countryCode);
                    
                    // Debug logging for first few countries
                    if (data && !window.mapDebugLogged) {
                      console.log(`Found match: ${countryCode} = ${data.country} with ${data.count} artists`);
                      window.mapDebugLogged = true;
                    }
                    
                    const fillColor = data ? colorScale(data.count) : '#0f172a';
                    
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={fillColor}
                        stroke="#334155"
                        strokeWidth={0.5}
                        style={{
                          default: {
                            outline: 'none',
                            transition: 'all 0.3s ease'
                          },
                          hover: {
                            fill: data ? '#f59e0b' : '#1e293b',
                            stroke: '#f59e0b',
                            strokeWidth: 1,
                            outline: 'none',
                            cursor: data ? 'pointer' : 'default'
                          },
                          pressed: {
                            outline: 'none'
                          }
                        }}
                        onMouseEnter={() => {
                          if (data) {
                            setHoveredCountry(countryCode);
                            setTooltipContent(data);
                          }
                        }}
                        onMouseLeave={() => {
                          setHoveredCountry(null);
                          setTooltipContent(null);
                        }}
                      />
                    );
                  })
                }
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>

          {/* Custom Tooltip */}
          {tooltipContent && (
            <div
              className="absolute z-50 pointer-events-none"
              style={{
                left: mousePosition.x - 100,
                top: mousePosition.y - 400,
                transform: 'translate(-50%, -100%)'
              }}
            >
              <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg p-3 shadow-xl">
                <div className="font-semibold text-white mb-1">
                  {tooltipContent.country}
                </div>
                <div className="text-sm text-slate-300 mb-2">
                  {tooltipContent.count} {tooltipContent.count === 1 ? 'Artist' : 'Artists'}
                </div>
                <div className="max-h-32 overflow-y-auto">
                  {tooltipContent.artists.slice(0, 5).map((artist, idx) => (
                    <div key={idx} className="text-xs text-slate-400 truncate">
                      • {artist}
                    </div>
                  ))}
                  {tooltipContent.artists.length > 5 && (
                    <div className="text-xs text-slate-500 italic mt-1">
                      +{tooltipContent.artists.length - 5} more...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-sm rounded-lg p-3 border border-slate-700">
          <div className="text-xs text-slate-400 mb-2">Artists per Country</div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#1e293b' }}></div>
              <span className="text-xs text-slate-400">0</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
              <span className="text-xs text-slate-400">{Math.round(maxCount / 4)}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#6366f1' }}></div>
              <span className="text-xs text-slate-400">{Math.round(maxCount / 2)}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#a855f7' }}></div>
              <span className="text-xs text-slate-400">{maxCount}+</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
