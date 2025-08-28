import axios from 'axios';
import { ADEApiResponse, ADEArtist, ADEEvent } from './types';

export class ADEApiService {
  /**
   * Fetch artists from ADE API via our proxy endpoint
   */
  async fetchArtists(page: number = 0, fromDate?: string, toDate?: string): Promise<ADEApiResponse> {
    const from = fromDate || '2025-10-22';
    const to = toDate || '2025-10-26';
    const types = '8262,8263'; // Artist/Speaker types

    // Use our API proxy endpoint instead of direct ADE API
    const params = new URLSearchParams({
      page: page.toString(),
      from,
      to,
      types,
      section: 'persons'
    });

    const url = `http://localhost:3000/api/ade-proxy?${params.toString()}`;

    try {
      const response = await axios.get<ADEApiResponse>(url, {
        timeout: 15000, // 15 second timeout
      });

      return response.data;
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error);
      throw error;
    }
  }

  /**
   * Fetch all artists by paginating through the API
   */
  async fetchAllArtists(
    onProgress?: (page: number, artists: ADEArtist[]) => void,
    fromDate?: string,
    toDate?: string
  ): Promise<ADEArtist[]> {
    const allArtists: ADEArtist[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await this.fetchArtists(page, fromDate, toDate);
        
        if (response.data && response.data.length > 0) {
          allArtists.push(...response.data);
          
          if (onProgress) {
            onProgress(page, response.data);
          }
          
          page++;
          
          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          hasMore = false;
        }
      } catch (error) {
        console.error(`Error on page ${page}, stopping pagination:`, error);
        hasMore = false;
      }
    }

    return allArtists;
  }

  /**
   * Fetch events from ADE API via our proxy endpoint
   */
  async fetchEvents(page: number = 0, fromDate?: string, toDate?: string): Promise<ADEApiResponse<ADEEvent>> {
    const from = fromDate || '2025-10-22';
    const to = toDate || '2025-10-26';
    const types = '8262,8263'; // Same types for events

    // Use our API proxy endpoint for events
    const params = new URLSearchParams({
      page: page.toString(),
      from,
      to,
      types,
      section: 'events'  // Changed to events
    });

    const url = `http://localhost:3000/api/ade-proxy?${params.toString()}`;

    try {
      const response = await axios.get<ADEApiResponse<ADEEvent>>(url, {
        timeout: 15000, // 15 second timeout
      });

      return response.data;
    } catch (error) {
      console.error(`Error fetching events page ${page}:`, error);
      throw error;
    }
  }

  /**
   * Fetch all events by paginating through the API
   */
  async fetchAllEvents(
    onProgress?: (page: number, events: ADEEvent[]) => void,
    fromDate?: string,
    toDate?: string
  ): Promise<ADEEvent[]> {
    const allEvents: ADEEvent[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await this.fetchEvents(page, fromDate, toDate);
        
        if (response.data && response.data.length > 0) {
          allEvents.push(...response.data);
          
          if (onProgress) {
            onProgress(page, response.data);
          }
          
          page++;
          
          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          hasMore = false;
        }
      } catch (error) {
        console.error(`Error on events page ${page}, stopping pagination:`, error);
        hasMore = false;
      }
    }

    return allEvents;
  }

  /**
   * Clean and transform artist data for database storage
   */
  cleanArtistData(artist: ADEArtist) {
    return {
      ade_id: artist.id,
      handle: artist.handle || null,
      title: artist.title || 'Unknown Artist',
      subtitle: artist.subtitle || null,
      url: artist.url || null,
      country_label: artist.country?.label || null,
      country_value: artist.country?.value || null,
      image_title: artist.image?.title || null,
      image_url: artist.image?.url || null,
      raw_data: artist
    };
  }

  /**
   * Clean and transform event data for database storage
   */
  cleanEventData(event: ADEEvent) {
    try {
      // Parse dates from the complex format with better error handling
      let startDate: Date;
      let endDate: Date;
      
      try {
        // The date format is "2025-10-22 09:00:00.000000" with timezone "Europe/Amsterdam"
        startDate = new Date(event.start_date_time.date.replace(' ', 'T'));
        endDate = new Date(event.end_date_time.date.replace(' ', 'T'));
        
        // Check if dates are valid
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          throw new Error('Invalid date format');
        }
      } catch (dateError) {
        console.error('Error parsing dates:', {
          startDate: event.start_date_time,
          endDate: event.end_date_time,
          error: dateError
        });
        // Use current date as fallback
        startDate = new Date();
        endDate = new Date();
      }

      // Parse categories to extract genres and event metadata
      const genres = this.parseGenresFromCategories(event.categories);
      const metadata = this.parseEventMetadata(event.categories);

      const cleanedData = {
        ade_id: event.id,
        title: event.title || 'Unknown Event',
        subtitle: event.subtitle || null,
        url: event.url || null,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        venue_name: event.venue?.title || null,
        venue_address: null, // Not provided in this response
        event_type: event.handle || null,
        categories: event.categories || null,
        genres: genres,
        venue_type: metadata.venueType,
        event_format: metadata.eventFormat,
        is_free: metadata.isFree,
        is_nighttime: metadata.isNighttime,
        is_daytime: metadata.isDaytime,
        is_live: metadata.isLive,
        is_sold_out: event.soldOut || false,
        sold_out: event.soldOut || false,
        raw_data: event
      };
      
      console.log('Cleaned event:', {
        title: cleanedData.title,
        ade_id: cleanedData.ade_id,
        dates: {
          start: cleanedData.start_date,
          end: cleanedData.end_date
        }
      });
      
      return cleanedData;
    } catch (error) {
      console.error('Error in cleanEventData:', {
        error,
        event
      });
      throw error;
    }
  }

  /**
   * Parse genres from categories string
   */
  parseGenresFromCategories(categories: string | null): string[] {
    if (!categories) return [];
    
    const genres: string[] = [];
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

  /**
   * Parse event metadata from categories
   */
  parseEventMetadata(categories: string | null): {
    venueType: string | null;
    eventFormat: string | null;
    isFree: boolean;
    isNighttime: boolean;
    isDaytime: boolean;
    isLive: boolean;
  } {
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
}

export const adeApi = new ADEApiService();
