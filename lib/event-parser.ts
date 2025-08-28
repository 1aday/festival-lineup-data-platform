import axios from 'axios';
import * as cheerio from 'cheerio';

export interface LineupArtist {
  adeId: number;
  name: string;
  profileUrl: string;
  role?: string;
}

export class EventParser {
  /**
   * Extract artist IDs from event detail page HTML
   * ADE event pages contain lineup sections with links to artist profiles
   */
  parseLineupFromHtml(html: string): LineupArtist[] {
    const $ = cheerio.load(html);
    const artists: LineupArtist[] = [];
    
    // Common patterns for ADE lineup sections:
    // 1. Look for lineup/artists section
    // 2. Find links that match artist profile URLs
    // Pattern: /en/artists-speakers/[name]/[id]/
    
    // Try multiple selectors based on ADE's HTML structure
    const lineupSelectors = [
      '.lineup a[href*="/artists-speakers/"]',
      '.artists a[href*="/artists-speakers/"]',
      '.event-lineup a[href*="/artists-speakers/"]',
      'a[href*="/artists-speakers/"]' // Fallback to any artist link
    ];
    
    for (const selector of lineupSelectors) {
      const links = $(selector);
      if (links.length > 0) {
        links.each((_, element) => {
          const link = $(element);
          const href = link.attr('href');
          
          if (href) {
            // Extract ID from URL pattern: /artists-speakers/name/12345/
            const match = href.match(/\/artists-speakers\/[^\/]+\/(\d+)\/?$/);
            if (match && match[1]) {
              const adeId = parseInt(match[1], 10);
              const name = link.text().trim();
              
              // Check for role/label (might be in parent or sibling element)
              let role: string | undefined;
              const parentText = link.parent().text();
              const roleMatch = parentText.match(/\((.*?)\)/);
              if (roleMatch) {
                role = roleMatch[1];
              }
              
              if (!artists.some(a => a.adeId === adeId)) {
                artists.push({
                  adeId,
                  name: name || 'Unknown Artist',
                  profileUrl: `https://www.amsterdam-dance-event.nl${href}`,
                  role
                });
              }
            }
          }
        });
        
        if (artists.length > 0) break; // Found artists, stop searching
      }
    }
    
    // Alternative approach: look for structured data
    if (artists.length === 0) {
      // Check for JSON-LD structured data
      $('script[type="application/ld+json"]').each((_, element) => {
        try {
          const jsonData = JSON.parse($(element).html() || '{}');
          if (jsonData.performer || jsonData.performers) {
            const performers = Array.isArray(jsonData.performer) 
              ? jsonData.performer 
              : [jsonData.performer || jsonData.performers].flat().filter(Boolean);
            
            performers.forEach((performer: any) => {
              if (performer?.url) {
                const match = performer.url.match(/\/artists-speakers\/[^\/]+\/(\d+)\/?$/);
                if (match && match[1]) {
                  artists.push({
                    adeId: parseInt(match[1], 10),
                    name: performer.name || 'Unknown Artist',
                    profileUrl: performer.url,
                    role: performer.type || undefined
                  });
                }
              }
            });
          }
        } catch (e) {
          // Invalid JSON, skip
        }
      });
    }
    
    return artists;
  }
  
  /**
   * Fetch and parse an event detail page
   */
  async fetchAndParseEventPage(eventUrl: string): Promise<{
    html: string;
    lineup: LineupArtist[];
    metadata: any;
  }> {
    try {
      const response = await axios.get(eventUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Referer': 'https://www.amsterdam-dance-event.nl/en/program/',
        },
        timeout: 15000
      });
      
      const html = response.data;
      const lineup = this.parseLineupFromHtml(html);
      
      // Extract additional metadata from the page
      const $ = cheerio.load(html);
      const metadata = {
        title: $('h1').first().text().trim(),
        venue: $('.venue-name').text().trim() || $('.location').text().trim(),
        date: $('.event-date').text().trim() || $('.date').text().trim(),
        description: $('.event-description').text().trim() || $('meta[name="description"]').attr('content'),
        image: $('meta[property="og:image"]').attr('content'),
        lineupCount: lineup.length,
        fetchedAt: new Date().toISOString()
      };
      
      return { html, lineup, metadata };
    } catch (error) {
      console.error('Error fetching event page:', eventUrl, error);
      throw error;
    }
  }
  
  /**
   * Parse multiple event pages with rate limiting
   */
  async parseEventPages(
    eventUrls: string[], 
    onProgress?: (current: number, total: number, event: string) => void,
    delayMs: number = 1000
  ): Promise<Map<string, LineupArtist[]>> {
    const results = new Map<string, LineupArtist[]>();
    
    for (let i = 0; i < eventUrls.length; i++) {
      const url = eventUrls[i];
      
      try {
        if (onProgress) {
          onProgress(i + 1, eventUrls.length, url);
        }
        
        const { lineup } = await this.fetchAndParseEventPage(url);
        results.set(url, lineup);
        
        // Rate limiting
        if (i < eventUrls.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        console.error(`Failed to parse event: ${url}`, error);
        results.set(url, []); // Empty lineup on error
      }
    }
    
    return results;
  }
  
  /**
   * Extract event ID from URL
   */
  extractEventIdFromUrl(url: string): number | null {
    // Pattern: /program/2025/event-name/1234567/
    const match = url.match(/\/program\/\d+\/[^\/]+\/(\d+)\/?$/);
    return match && match[1] ? parseInt(match[1], 10) : null;
  }
}

export const eventParser = new EventParser();
