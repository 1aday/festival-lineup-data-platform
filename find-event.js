#!/usr/bin/env node

async function findEvent() {
  console.log('Searching for Ofra / Dave Clarke event...\n');
  
  let found = false;
  let page = 0;
  const maxPages = 100;
  
  while (page < maxPages && !found) {
    try {
      const response = await fetch(`http://localhost:3000/api/ade-proxy?page=${page}&from=2025-10-22&to=2025-10-26&types=8262,8263&section=events`);
      const data = await response.json();
      
      if (!data.data || data.data.length === 0) {
        console.log(`No more events at page ${page}`);
        break;
      }
      
      // Search for the event
      const ofraEvent = data.data.find(event => 
        (event.title && (event.title.includes('Ofra') || event.title.includes('Dave Clarke'))) ||
        (event.subtitle && (event.subtitle.includes('Ofra') || event.subtitle.includes('Dave Clarke')))
      );
      
      if (ofraEvent) {
        found = true;
        console.log('🎯 FOUND THE EVENT!\n');
        console.log('Event Details:');
        console.log('='.repeat(60));
        console.log(`Title: ${ofraEvent.title}`);
        console.log(`Subtitle: ${ofraEvent.subtitle || 'N/A'}`);
        console.log(`Venue: ${ofraEvent.venue?.title || 'Unknown'}`);
        console.log(`URL: ${ofraEvent.url}`);
        console.log(`ADE ID: ${ofraEvent.id}`);
        console.log(`Categories: ${ofraEvent.categories || 'N/A'}`);
        console.log(`Start: ${ofraEvent.start_date_time?.date}`);
        console.log('='.repeat(60));
        
        // Now fetch the event page to see the lineup
        console.log('\n📋 Fetching lineup from event page...\n');
        try {
          const pageResponse = await fetch(ofraEvent.url);
          const html = await pageResponse.text();
          
          // Look for artist links
          const artistMatches = html.match(/\/artists-speakers\/[^"]+/g);
          if (artistMatches) {
            console.log(`Found ${artistMatches.length} artist links on the page:`);
            const uniqueArtists = [...new Set(artistMatches)];
            uniqueArtists.forEach(link => {
              const parts = link.split('/');
              const artistName = parts[2] || 'Unknown';
              const artistId = parts[3] || 'Unknown';
              console.log(`  - ${artistName.replace(/-/g, ' ')} (ID: ${artistId})`);
            });
          } else {
            console.log('No artist links found in the HTML');
            
            // Look for lineup section
            const lineupMatch = html.match(/<div[^>]*class="[^"]*lineup[^"]*"[^>]*>(.*?)<\/div>/is);
            if (lineupMatch) {
              console.log('Found lineup section, but no structured artist links');
            }
          }
        } catch (fetchError) {
          console.error('Failed to fetch event page:', fetchError.message);
        }
        
        return ofraEvent;
      }
      
      console.log(`Checked page ${page}, found ${data.data.length} events, none matching...`);
      page++;
      
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error);
      page++;
    }
  }
  
  if (!found) {
    console.log('\n❌ Event not found after searching ' + page + ' pages');
    console.log('The event might be:');
    console.log('1. On a later page');
    console.log('2. Listed under a different name');
    console.log('3. Not yet added to the ADE program');
  }
}

findEvent().catch(console.error);
