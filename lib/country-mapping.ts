// Convert ISO country code to flag emoji
export const getCountryFlag = (countryCode: string): string => {
  if (!countryCode || countryCode.length !== 2) return '';
  
  // Convert country code to flag emoji using regional indicator symbols
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

// Get flag emoji from country name
export const getFlagFromCountryName = (countryName: string): string => {
  if (!countryName) return '';
  const iso = countryNameToISO[countryName];
  return iso ? getCountryFlag(iso) : '';
};

// Map country names to ISO Alpha-2 codes for world map visualization
export const countryNameToISO: Record<string, string> = {
  // Europe
  'Netherlands': 'NL',
  'Germany': 'DE',
  'United Kingdom': 'GB',
  'UK': 'GB',
  'France': 'FR',
  'Italy': 'IT',
  'Spain': 'ES',
  'Belgium': 'BE',
  'Switzerland': 'CH',
  'Austria': 'AT',
  'Sweden': 'SE',
  'Norway': 'NO',
  'Denmark': 'DK',
  'Finland': 'FI',
  'Poland': 'PL',
  'Czech Republic': 'CZ',
  'Portugal': 'PT',
  'Greece': 'GR',
  'Ireland': 'IE',
  'Hungary': 'HU',
  'Romania': 'RO',
  'Bulgaria': 'BG',
  'Croatia': 'HR',
  'Serbia': 'RS',
  'Slovenia': 'SI',
  'Slovakia': 'SK',
  'Estonia': 'EE',
  'Latvia': 'LV',
  'Lithuania': 'LT',
  'Luxembourg': 'LU',
  'Malta': 'MT',
  'Cyprus': 'CY',
  'Iceland': 'IS',
  'Ukraine': 'UA',
  'Russia': 'RU',
  'Turkey': 'TR',
  'Belarus': 'BY',
  'Moldova': 'MD',
  'Albania': 'AL',
  'Bosnia and Herzegovina': 'BA',
  'Kosovo': 'XK',
  'Macedonia': 'MK',
  'Montenegro': 'ME',
  
  // Americas
  'United States': 'US',
  'USA': 'US',
  'United States of America': 'US',
  'Canada': 'CA',
  'Mexico': 'MX',
  'Brazil': 'BR',
  'Argentina': 'AR',
  'Colombia': 'CO',
  'Chile': 'CL',
  'Peru': 'PE',
  'Venezuela': 'VE',
  'Ecuador': 'EC',
  'Uruguay': 'UY',
  'Paraguay': 'PY',
  'Bolivia': 'BO',
  'Costa Rica': 'CR',
  'Panama': 'PA',
  'Guatemala': 'GT',
  'Honduras': 'HN',
  'El Salvador': 'SV',
  'Nicaragua': 'NI',
  'Dominican Republic': 'DO',
  'Cuba': 'CU',
  'Jamaica': 'JM',
  'Haiti': 'HT',
  'Puerto Rico': 'PR',
  'Trinidad and Tobago': 'TT',
  'Barbados': 'BB',
  
  // Asia
  'China': 'CN',
  'Japan': 'JP',
  'South Korea': 'KR',
  'Korea': 'KR',
  'India': 'IN',
  'Indonesia': 'ID',
  'Thailand': 'TH',
  'Vietnam': 'VN',
  'Philippines': 'PH',
  'Malaysia': 'MY',
  'Singapore': 'SG',
  'Hong Kong': 'HK',
  'Taiwan': 'TW',
  'Bangladesh': 'BD',
  'Pakistan': 'PK',
  'Sri Lanka': 'LK',
  'Nepal': 'NP',
  'Myanmar': 'MM',
  'Cambodia': 'KH',
  'Laos': 'LA',
  'Mongolia': 'MN',
  'Kazakhstan': 'KZ',
  'Uzbekistan': 'UZ',
  'Afghanistan': 'AF',
  'Iran': 'IR',
  'Iraq': 'IQ',
  'Saudi Arabia': 'SA',
  'United Arab Emirates': 'AE',
  'UAE': 'AE',
  'Israel': 'IL',
  'Jordan': 'JO',
  'Lebanon': 'LB',
  'Syria': 'SY',
  'Yemen': 'YE',
  'Oman': 'OM',
  'Kuwait': 'KW',
  'Qatar': 'QA',
  'Bahrain': 'BH',
  'Georgia': 'GE',
  'Armenia': 'AM',
  'Azerbaijan': 'AZ',
  
  // Africa
  'South Africa': 'ZA',
  'Egypt': 'EG',
  'Morocco': 'MA',
  'Nigeria': 'NG',
  'Kenya': 'KE',
  'Ethiopia': 'ET',
  'Ghana': 'GH',
  'Algeria': 'DZ',
  'Tunisia': 'TN',
  'Libya': 'LY',
  'Senegal': 'SN',
  'Zimbabwe': 'ZW',
  'Cameroon': 'CM',
  'Uganda': 'UG',
  'Tanzania': 'TZ',
  'Mozambique': 'MZ',
  'Angola': 'AO',
  'Ivory Coast': 'CI',
  'Madagascar': 'MG',
  'Botswana': 'BW',
  'Namibia': 'NA',
  'Zambia': 'ZM',
  'Mali': 'ML',
  'Burkina Faso': 'BF',
  'Niger': 'NE',
  'Rwanda': 'RW',
  'Somalia': 'SO',
  'Chad': 'TD',
  'Sudan': 'SD',
  'Mauritius': 'MU',
  
  // Oceania
  'Australia': 'AU',
  'New Zealand': 'NZ',
  'Fiji': 'FJ',
  'Papua New Guinea': 'PG',
  'New Caledonia': 'NC',
  'Samoa': 'WS',
  'Guam': 'GU',
  'French Polynesia': 'PF',
  'Vanuatu': 'VU',
  'Solomon Islands': 'SB',
  
  // Common variations and alternate names
  'Czech': 'CZ',
  'Slovak Republic': 'SK',
  'The Netherlands': 'NL',
  'Holland': 'NL',
  'Great Britain': 'GB',
  'England': 'GB',
  'Scotland': 'GB',
  'Wales': 'GB',
  'Northern Ireland': 'GB',
  'Czechia': 'CZ',
  'Slovak': 'SK',
  'Bosnia': 'BA',
  'Herzegovina': 'BA',
  'Republic of Ireland': 'IE',
  'Éire': 'IE',
  'Россия': 'RU',
  'Deutschland': 'DE',
  'België': 'BE',
  'Belgique': 'BE',
  'Österreich': 'AT',
  'Schweiz': 'CH',
  'Suisse': 'CH',
  'España': 'ES',
  'Italia': 'IT',
  'Polska': 'PL',
  'Sverige': 'SE',
  'Norge': 'NO',
  'Danmark': 'DK',
  'Suomi': 'FI',
  'Ελλάδα': 'GR',
  'Türkiye': 'TR',
  'Україна': 'UA',
  'België/Belgique': 'BE',
  'South Korean': 'KR'
};

// Function to get ISO code from country name
export function getISOCode(countryName: string | null | undefined): string | null {
  if (!countryName) return null;
  
  // Try direct match first
  const directMatch = countryNameToISO[countryName];
  if (directMatch) return directMatch;
  
  // Try case-insensitive match
  const lowerCountry = countryName.toLowerCase();
  for (const [name, code] of Object.entries(countryNameToISO)) {
    if (name.toLowerCase() === lowerCountry) {
      return code;
    }
  }
  
  // Try partial match for common patterns
  if (countryName.includes('Netherlands') || countryName.includes('Dutch')) return 'NL';
  if (countryName.includes('United States') || countryName.includes('USA')) return 'US';
  if (countryName.includes('United Kingdom') || countryName.includes('UK') || countryName.includes('British')) return 'GB';
  if (countryName.includes('German')) return 'DE';
  if (countryName.includes('French') || countryName.includes('France')) return 'FR';
  if (countryName.includes('Italian') || countryName.includes('Italy')) return 'IT';
  if (countryName.includes('Spanish') || countryName.includes('Spain')) return 'ES';
  if (countryName.includes('Belgian') || countryName.includes('Belgium')) return 'BE';
  if (countryName.includes('Swiss') || countryName.includes('Switzerland')) return 'CH';
  if (countryName.includes('Swedish') || countryName.includes('Sweden')) return 'SE';
  if (countryName.includes('Norwegian') || countryName.includes('Norway')) return 'NO';
  if (countryName.includes('Danish') || countryName.includes('Denmark')) return 'DK';
  if (countryName.includes('Finnish') || countryName.includes('Finland')) return 'FI';
  if (countryName.includes('Polish') || countryName.includes('Poland')) return 'PL';
  if (countryName.includes('Czech')) return 'CZ';
  if (countryName.includes('Austrian') || countryName.includes('Austria')) return 'AT';
  if (countryName.includes('Canadian') || countryName.includes('Canada')) return 'CA';
  if (countryName.includes('Mexican') || countryName.includes('Mexico')) return 'MX';
  if (countryName.includes('Brazilian') || countryName.includes('Brazil')) return 'BR';
  if (countryName.includes('Argentin')) return 'AR';
  if (countryName.includes('Australian') || countryName.includes('Australia')) return 'AU';
  if (countryName.includes('Japanese') || countryName.includes('Japan')) return 'JP';
  if (countryName.includes('Chinese') || countryName.includes('China')) return 'CN';
  if (countryName.includes('Korean') || countryName.includes('Korea')) return 'KR';
  if (countryName.includes('Indian') || countryName.includes('India')) return 'IN';
  if (countryName.includes('Russian') || countryName.includes('Russia')) return 'RU';
  if (countryName.includes('Turkish') || countryName.includes('Turkey')) return 'TR';
  if (countryName.includes('Israeli') || countryName.includes('Israel')) return 'IL';
  if (countryName.includes('South African') || countryName.includes('South Africa')) return 'ZA';
  
  // Log unmapped country for debugging
  console.log('Unmapped country:', countryName);
  
  return null;
}

// Get statistics about country distribution
export function getCountryStats(artists: any[]): {
  totalCountries: number;
  topCountries: { country: string; code: string; count: number }[];
  unmappedCountries: string[];
} {
  const countryCount = new Map<string, { name: string; count: number }>();
  const unmapped = new Set<string>();
  
  artists.forEach(artist => {
    const countryName = artist.country_label;
    if (!countryName) return;
    
    const code = getISOCode(countryName);
    if (code) {
      const existing = countryCount.get(code);
      if (existing) {
        existing.count++;
      } else {
        countryCount.set(code, { name: countryName, count: 1 });
      }
    } else {
      unmapped.add(countryName);
    }
  });
  
  const topCountries = Array.from(countryCount.entries())
    .map(([code, data]) => ({
      country: data.name,
      code,
      count: data.count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  return {
    totalCountries: countryCount.size,
    topCountries,
    unmappedCountries: Array.from(unmapped)
  };
}
