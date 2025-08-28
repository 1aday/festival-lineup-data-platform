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

async function testIROMatching() {
  console.log('🔍 Testing I-RO event matching...\n');
  
  // Find I-RO artist
  const { data: artists } = await supabase
    .from('artists')
    .select('id, title, subtitle')
    .ilike('title', '%I-RO%');
  
  if (!artists || artists.length === 0) {
    console.log('I-RO not found in artists table');
    return;
  }
  
  const iro = artists[0];
  console.log(`Found artist: ${iro.title} (ID: ${iro.id})`);
  console.log(`Subtitle: ${iro.subtitle || 'none'}\n`);
  
  // Get events linked to I-RO
  const { data: linkedEvents } = await supabase
    .from('artist_events')
    .select(`
      event_id,
      confidence,
      match_details,
      events!inner(
        id,
        title,
        subtitle,
        venue_name
      )
    `)
    .eq('artist_id', iro.id);
  
  console.log(`\n📋 Currently linked events (${linkedEvents?.length || 0}):\n`);
  
  if (linkedEvents) {
    linkedEvents.forEach(link => {
      console.log(`  Event: "${link.events.title}"`);
      console.log(`    Venue: ${link.events.venue_name}`);
      console.log(`    Confidence: ${link.confidence || 'N/A'}`);
      console.log(`    Match Details: ${JSON.stringify(link.match_details)}`);
      console.log(`    Subtitle: ${link.events.subtitle?.substring(0, 100)}...`);
      console.log('');
    });
  }
  
  // Now check all events that might match "I-RO"
  console.log('\n🔍 Searching all events for potential matches...\n');
  
  const { data: allEvents } = await supabase
    .from('events')
    .select('id, title, subtitle, venue_name')
    .or(`title.ilike.%I-RO%,subtitle.ilike.%I-RO%`);
  
  console.log(`Found ${allEvents?.length || 0} events mentioning "I-RO":\n`);
  
  if (allEvents) {
    allEvents.forEach(event => {
      console.log(`  Event: "${event.title}"`);
      console.log(`    Venue: ${event.venue_name}`);
      
      // Check why it might match
      if (event.title.toLowerCase().includes('i-ro')) {
        console.log(`    ✅ Title contains "I-RO"`);
      }
      if (event.subtitle?.toLowerCase().includes('i-ro')) {
        console.log(`    ✅ Subtitle contains "I-RO"`);
        // Show the context
        const lines = event.subtitle.split('\n');
        lines.forEach(line => {
          if (line.toLowerCase().includes('i-ro')) {
            console.log(`       Line: "${line.trim()}"`);
          }
        });
      }
      console.log('');
    });
  }
  
  // Check for problematic partial matches
  console.log('\n⚠️  Checking for problematic matches...\n');
  
  // Search for events that might incorrectly match due to partial matching
  const problematicPatterns = [
    'RO', // Would match I-RO
    'IRO', // Would match I-RO without hyphen
    'IRON', // Contains IRO
    'EURO', // Contains RO
    'METRO', // Contains RO
  ];
  
  for (const pattern of problematicPatterns) {
    const { data: problematicEvents } = await supabase
      .from('events')
      .select('id, title, subtitle')
      .or(`title.ilike.%${pattern}%,subtitle.ilike.%${pattern}%`)
      .limit(5);
    
    if (problematicEvents && problematicEvents.length > 0) {
      console.log(`\n  Pattern "${pattern}" found in ${problematicEvents.length} events (showing max 5):`);
      problematicEvents.forEach(e => {
        const inTitle = e.title.toUpperCase().includes(pattern);
        const inSubtitle = e.subtitle?.toUpperCase().includes(pattern);
        console.log(`    - "${e.title}" (in ${inTitle ? 'title' : 'subtitle'})`);
      });
    }
  }
  
  // Check NDSM specifically
  console.log('\n\n✅ Checking NDSM event specifically...\n');
  
  const { data: ndsmEvents } = await supabase
    .from('events')
    .select('id, title, subtitle, venue_name')
    .ilike('venue_name', '%NDSM%');
  
  console.log(`Found ${ndsmEvents?.length || 0} events at NDSM:\n`);
  
  if (ndsmEvents) {
    ndsmEvents.forEach(event => {
      console.log(`  Event: "${event.title}"`);
      console.log(`    Venue: ${event.venue_name}`);
      
      // Check if I-RO is mentioned
      const iroInTitle = event.title.toLowerCase().includes('i-ro');
      const iroInSubtitle = event.subtitle?.toLowerCase().includes('i-ro');
      
      if (iroInTitle || iroInSubtitle) {
        console.log(`    ✅ I-RO is mentioned in ${iroInTitle ? 'title' : 'subtitle'}`);
        if (iroInSubtitle && event.subtitle) {
          // Show the exact mention
          const lines = event.subtitle.split('\n');
          lines.forEach(line => {
            if (line.toLowerCase().includes('i-ro')) {
              console.log(`       "${line.trim()}"`);
            }
          });
        }
      } else {
        console.log(`    ❌ I-RO not mentioned`);
      }
      console.log('');
    });
  }
}

testIROMatching().catch(console.error);
