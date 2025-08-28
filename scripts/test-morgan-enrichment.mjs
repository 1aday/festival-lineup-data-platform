import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testMorganEnrichment() {
  console.log('🔍 Testing Morgan enrichment issue...\n');
  
  // Find Morgan artist(s)
  const { data: artists } = await supabase
    .from('artists')
    .select('*')
    .ilike('title', 'Morgan');
  
  console.log(`Found ${artists?.length || 0} artists named "Morgan":\n`);
  
  if (artists) {
    for (const artist of artists) {
      console.log(`\n📋 Artist: ${artist.title} (ID: ${artist.id})`);
      console.log(`  Subtitle: ${artist.subtitle || 'none'}`);
      console.log(`  Country: ${artist.country_label || 'unknown'}`);
      
      // Check Spotify data
      if (artist.spotify_id) {
        console.log(`\n  ✅ Enriched with Spotify:`);
        console.log(`    Spotify Name: ${artist.spotify_name || 'N/A'}`);
        console.log(`    Genres: ${artist.primary_genres || 'none'}`);
        console.log(`    Popularity: ${artist.popularity}`);
        console.log(`    Followers: ${artist.followers}`);
      } else {
        console.log(`  ❌ Not enriched yet`);
      }
      
      // Get events this artist is linked to
      const { data: artistEvents } = await supabase
        .from('artist_events')
        .select(`
          event_id,
          confidence,
          events!inner(
            id,
            title,
            venue_name,
            categories,
            event_type,
            subtitle
          )
        `)
        .eq('artist_id', artist.id)
        .limit(5);
      
      console.log(`\n  📅 Events (${artistEvents?.length || 0}):`);
      
      if (artistEvents && artistEvents.length > 0) {
        // Collect genre hints from events
        const genreHints = new Set();
        
        artistEvents.forEach(ae => {
          console.log(`    - "${ae.events.title}" at ${ae.events.venue_name}`);
          if (ae.events.categories) {
            console.log(`      Categories: ${ae.events.categories}`);
            // Extract genre hints from categories
            const cats = ae.events.categories.toLowerCase();
            if (cats.includes('techno')) genreHints.add('techno');
            if (cats.includes('house')) genreHints.add('house');
            if (cats.includes('electronic')) genreHints.add('electronic');
            if (cats.includes('trance')) genreHints.add('trance');
            if (cats.includes('drum')) genreHints.add('drum and bass');
          }
        });
        
        if (genreHints.size > 0) {
          console.log(`\n  🎵 Genre hints from events: ${Array.from(genreHints).join(', ')}`);
        }
        
        // Check co-performers for more context
        console.log(`\n  👥 Checking co-performers for genre context...`);
        
        for (const ae of artistEvents.slice(0, 2)) { // Check first 2 events
          const { data: coPerformers } = await supabase
            .from('artist_events')
            .select(`
              artists!inner(
                title,
                primary_genres
              )
            `)
            .eq('event_id', ae.event_id)
            .neq('artist_id', artist.id)
            .limit(5);
          
          if (coPerformers && coPerformers.length > 0) {
            console.log(`    At "${ae.events.title}":`);
            coPerformers.forEach(cp => {
              if (cp.artists.primary_genres) {
                console.log(`      - ${cp.artists.title}: ${cp.artists.primary_genres}`);
              }
            });
          }
        }
      } else {
        console.log(`    No events linked`);
      }
    }
  }
  
  // Now search Spotify to see what we're getting
  console.log('\n\n🔍 Testing Spotify search for "Morgan"...\n');
  
  const spotifyClientId = process.env.SPOTIFY_CLIENT_ID || process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET || process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET;
  
  if (!spotifyClientId || !spotifyClientSecret) {
    console.log('❌ Spotify credentials not configured');
    return;
  }
  
  // Get Spotify token
  const authString = Buffer.from(`${spotifyClientId}:${spotifyClientSecret}`).toString('base64');
  const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  
  const { access_token } = await tokenResponse.json();
  
  // Search for Morgan
  const searchResponse = await fetch(
    `https://api.spotify.com/v1/search?q=Morgan&type=artist&limit=10`,
    {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    }
  );
  
  const searchData = await searchResponse.json();
  
  console.log('Spotify search results for "Morgan":\n');
  
  if (searchData.artists?.items) {
    searchData.artists.items.forEach((artist, i) => {
      const isElectronic = artist.genres.some(g => 
        ['house', 'techno', 'electronic', 'edm', 'dance', 'trance', 'drum and bass'].some(eg => 
          g.toLowerCase().includes(eg)
        )
      );
      
      console.log(`${i + 1}. "${artist.name}"`);
      console.log(`   Genres: ${artist.genres.slice(0, 3).join(', ') || 'none'}`);
      console.log(`   Popularity: ${artist.popularity}`);
      console.log(`   Followers: ${artist.followers.total.toLocaleString()}`);
      console.log(`   ${isElectronic ? '✅ Electronic/Dance' : '❌ Not Electronic'}`);
      console.log('');
    });
  }
}

testMorganEnrichment().catch(console.error);
