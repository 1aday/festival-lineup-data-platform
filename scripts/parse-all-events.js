#!/usr/bin/env node

/**
 * Script to parse all events and extract artist lineups
 * This will find artist connections that are missing from the API data
 */

async function parseAllEvents() {
  console.log('🚀 Starting comprehensive event parsing...\n');
  
  const BATCH_SIZE = 50; // Process 50 events at a time
  let offset = 0;
  let totalEvents = 0;
  let totalParsed = 0;
  let totalArtistsFound = 0;
  let totalLinksCreated = 0;
  
  try {
    // First, get the total count of events
    const countResponse = await fetch('http://localhost:3000/api/debug-db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'SELECT COUNT(*) as count FROM events WHERE url IS NOT NULL'
      })
    });
    
    if (countResponse.ok) {
      const countData = await countResponse.json();
      totalEvents = parseInt(countData.data[0].count);
      console.log(`📊 Found ${totalEvents} events to parse\n`);
    } else {
      console.error('Failed to get event count');
      return;
    }
    
    // Process events in batches
    while (offset < totalEvents) {
      const sessionId = `batch-${Date.now()}-${offset}`;
      console.log(`\n📦 Processing batch ${Math.floor(offset/BATCH_SIZE) + 1} (events ${offset + 1}-${Math.min(offset + BATCH_SIZE, totalEvents)})`);
      
      // Get batch of events
      const eventsResponse = await fetch('http://localhost:3000/api/debug-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `SELECT id, title, venue_name FROM events WHERE url IS NOT NULL ORDER BY id LIMIT ${BATCH_SIZE} OFFSET ${offset}`
        })
      });
      
      if (!eventsResponse.ok) {
        console.error(`Failed to fetch events batch at offset ${offset}`);
        offset += BATCH_SIZE;
        continue;
      }
      
      const eventsData = await eventsResponse.json();
      const eventIds = eventsData.data.map(e => e.id);
      
      if (eventIds.length === 0) {
        break;
      }
      
      console.log(`  Parsing ${eventIds.length} events...`);
      eventsData.data.forEach(e => {
        console.log(`    - ${e.title} @ ${e.venue_name || 'Unknown venue'}`);
      });
      
      // Start parsing this batch
      const parseResponse = await fetch('http://localhost:3000/api/parse-event-lineups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          limit: BATCH_SIZE,
          sessionId,
          eventIds // Pass specific event IDs
        })
      });
      
      if (!parseResponse.ok) {
        console.error(`Failed to start parsing for batch at offset ${offset}`);
        offset += BATCH_SIZE;
        continue;
      }
      
      // Poll for progress
      let completed = false;
      while (!completed) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        
        const progressResponse = await fetch(`http://localhost:3000/api/parse-event-lineups?sessionId=${sessionId}`);
        if (progressResponse.ok) {
          const progress = await progressResponse.json();
          
          if (progress.completed) {
            completed = true;
            totalParsed += progress.eventsParsed || 0;
            totalArtistsFound += progress.artistsFound || 0;
            totalLinksCreated += progress.linksCreated || 0;
            
            console.log(`  ✅ Batch complete:`, {
              parsed: progress.eventsParsed,
              artists: progress.artistsFound,
              links: progress.linksCreated
            });
          } else {
            process.stdout.write(`  ⏳ Progress: ${Math.round(progress.progress)}%\r`);
          }
        }
      }
      
      offset += BATCH_SIZE;
      
      // Add a small delay between batches to avoid overwhelming the server
      if (offset < totalEvents) {
        console.log(`  ⏸️  Waiting 3 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 PARSING COMPLETE!');
    console.log('='.repeat(60));
    console.log(`📊 Total Events Processed: ${totalParsed}`);
    console.log(`🎤 Total Artists Found: ${totalArtistsFound}`);
    console.log(`🔗 Total Links Created: ${totalLinksCreated}`);
    console.log(`📈 Average Artists per Event: ${(totalArtistsFound / totalParsed).toFixed(2)}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

// Run the script
parseAllEvents().catch(console.error);
