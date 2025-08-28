#!/usr/bin/env node

// Test genre extraction logic
const testCategories = [
  "Club nights / Deep House / House / Techno / Free Events",
  "Nighttime events / (Live) Events / Global Scenes / Inclusivity / Deep House / Hard Dance / House / Free Events",
  "Live Concerts / Live / Minimal",
  "Club nights / Intimate venues / New venues / Nighttime events / Unique venues / DJ / Producer / Labels & Publishing / Disco / House",
  "Techno",
  "Drum & Bass",
  "All night long / Drum & Bass",
  "Club nights / Elektro / Techno"
];

function parseGenresFromCategories(categories) {
  if (!categories) return [];
  
  const genres = [];
  const parts = categories.split('/').map(p => p.trim().toLowerCase());
  
  // Define known music genres
  const musicGenres = [
    'techno', 'house', 'deep house', 'tech-house', 'progressive house',
    'trance', 'drum & bass', 'drum and bass', 'dubstep', 'garage',
    'disco', 'minimal', 'elektro', 'electronic', 'electronica',
    'hip-hop', 'hip hop', 'rap', 'afrobeats', 'afrobeat', 'latin',
    'ambient', 'experimental', 'breakbeat', 'hardcore', 'hard dance',
    'hardstyle', 'gabber', 'acid', 'industrial', 'downtempo',
    'bass', 'uk garage', 'grime', 'trap', 'future bass', 'melodic'
  ];
  
  for (const part of parts) {
    // Check if part contains any known genre
    for (const genre of musicGenres) {
      if (part.includes(genre)) {
        // Capitalize first letter of each word
        const formatted = part.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        
        if (!genres.includes(formatted)) {
          genres.push(formatted);
        }
      }
    }
  }
  
  return genres;
}

function parseEventMetadata(categories) {
  if (!categories) {
    return {
      venueType: null,
      eventFormat: null,
      isFree: false,
      isNighttime: false,
      isDaytime: false,
      isLive: false
    };
  }
  
  const lowerCategories = categories.toLowerCase();
  const parts = lowerCategories.split('/').map(p => p.trim());
  
  // Extract venue type
  let venueType = null;
  const venueKeywords = ['venues', 'basement', 'warehouse', 'club', 'bar', 'gallery', 'outdoor'];
  for (const part of parts) {
    for (const keyword of venueKeywords) {
      if (part.includes(keyword)) {
        venueType = part;
        break;
      }
    }
  }
  
  // Extract event format
  let eventFormat = null;
  const formatKeywords = ['night', 'day', 'exhibition', 'concert', 'showcase', 'party', 'festival'];
  for (const part of parts) {
    for (const keyword of formatKeywords) {
      if (part.includes(keyword)) {
        eventFormat = part;
        break;
      }
    }
  }
  
  return {
    venueType,
    eventFormat,
    isFree: lowerCategories.includes('free'),
    isNighttime: lowerCategories.includes('night'),
    isDaytime: lowerCategories.includes('day'),
    isLive: lowerCategories.includes('live')
  };
}

// Test each category string
console.log('=' .repeat(60));
console.log('TESTING GENRE EXTRACTION');
console.log('=' .repeat(60));

testCategories.forEach((cat, index) => {
  console.log(`\n[${index + 1}] Original: "${cat}"`);
  
  const genres = parseGenresFromCategories(cat);
  const metadata = parseEventMetadata(cat);
  
  console.log('   Genres:', genres.length > 0 ? genres.join(', ') : 'None');
  console.log('   Metadata:', {
    venueType: metadata.venueType || 'N/A',
    eventFormat: metadata.eventFormat || 'N/A',
    isFree: metadata.isFree,
    isNighttime: metadata.isNighttime,
    isLive: metadata.isLive
  });
});

console.log('\n' + '=' .repeat(60));
