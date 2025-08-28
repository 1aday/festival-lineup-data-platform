import { supabase, isSupabaseConfigured } from './supabase';

interface Artist {
  id: number;
  ade_id: number;
  title: string;
  subtitle?: string;
  country_label?: string;
}

interface Event {
  id: number;
  ade_id: number;
  title: string;
  subtitle?: string;
  raw_data?: any;
}

interface MatchResult {
  artistId: number;
  eventId: number;
  confidence: number;
  matchType: string;
  matchDetails: string;
}

export class ArtistEventMatcher {
  /**
   * Normalize artist name for matching
   */
  private normalizeArtistName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '') // Remove special chars
      .trim();
  }

  /**
   * Extract artist mentions from event subtitle
   */
  private extractArtistMentions(subtitle: string): string[] {
    if (!subtitle) return [];
    
    // Split by common delimiters in ADE format
    const delimiters = /[\n\r]/g; // New lines
    const lines = subtitle.split(delimiters);
    
    const mentions: string[] = [];
    
    for (const line of lines) {
      // Each line might contain one artist with location/description
      // Format: "Artist Name (Location)" or "Artist Name Live (Location)"
      const cleanLine = line.trim();
      if (cleanLine) {
        // Extract just the artist name part (before parentheses)
        const match = cleanLine.match(/^([^(]+)/);
        if (match) {
          const artistPart = match[1].trim();
          
          // Handle B2B collaborations
          if (artistPart.includes('B2B') || artistPart.includes('b2b')) {
            // Split B2B collaborations
            const b2bArtists = artistPart.split(/\s+[Bb]2[Bb]\s+/);
            mentions.push(...b2bArtists.map(a => a.trim()));
          } else if (artistPart.includes('&')) {
            // Handle & collaborations
            const andArtists = artistPart.split('&');
            mentions.push(...andArtists.map(a => a.trim()));
          } else {
            mentions.push(artistPart);
          }
        }
      }
    }
    
    // Clean up mentions
    return mentions.map(m => {
      // Remove "Live", "DJ", "live", etc. suffixes
      return m
        .replace(/\s+(Live|live|LIVE|DJ|Dj|dj)$/g, '')
        .trim();
    }).filter(m => m.length > 0);
  }

  /**
   * Calculate match confidence between artist name and mention
   */
  private calculateConfidence(artistName: string, mention: string): number {
    // For special cases with hyphens or special chars, also try exact match first
    const artistLower = artistName.toLowerCase().trim();
    const mentionLower = mention.toLowerCase().trim();
    
    // Exact match (case insensitive)
    if (artistLower === mentionLower) {
      return 1.0;
    }
    
    // Now normalize for further matching
    const normalizedArtist = this.normalizeArtistName(artistName);
    const normalizedMention = this.normalizeArtistName(mention);
    
    // Exact match after normalization
    if (normalizedArtist === normalizedMention) {
      return 0.95;
    }
    
    // Check for word boundary matches to avoid partial matches like "RO" in "METRO"
    // This is critical for artists with short names like "I-RO"
    const artistPattern = new RegExp(`\\b${this.escapeRegex(normalizedArtist)}\\b`, 'i');
    const mentionPattern = new RegExp(`\\b${this.escapeRegex(normalizedMention)}\\b`, 'i');
    
    // Check if the full artist name appears as a complete word in the mention
    if (mentionPattern.test(normalizedArtist) || artistPattern.test(normalizedMention)) {
      // Only give high confidence if lengths are similar (avoid "RO" matching "METRO RO")
      const lengthRatio = Math.min(normalizedArtist.length, normalizedMention.length) / 
                         Math.max(normalizedArtist.length, normalizedMention.length);
      if (lengthRatio > 0.7) {
        return 0.85;
      }
    }
    
    // Word-based matching - require ALL words to match for shorter names
    const artistWords = normalizedArtist.split(' ').filter(w => w.length > 2); // Ignore very short words
    const mentionWords = normalizedMention.split(' ').filter(w => w.length > 2);
    
    // For short artist names (1-2 words), require exact word matches
    if (artistWords.length <= 2) {
      if (artistWords.every(w => mentionWords.includes(w)) && 
          artistWords.length === mentionWords.length) {
        return 0.8;
      }
      // For short names, don't allow partial word matches
      return 0;
    }
    
    // For longer names, allow some flexibility
    if (artistWords.length > 2) {
      // All artist words are in mention
      if (artistWords.every(w => mentionWords.includes(w))) {
        return 0.75;
      }
      
      // Most artist words are in mention (at least 80% for longer names)
      const matchingWords = artistWords.filter(w => mentionWords.includes(w));
      if (matchingWords.length >= artistWords.length * 0.8) {
        return 0.65;
      }
    }
    
    // Levenshtein distance for fuzzy matching (only for very close matches)
    const distance = this.levenshteinDistance(normalizedArtist, normalizedMention);
    const maxLength = Math.max(normalizedArtist.length, normalizedMention.length);
    const similarity = 1 - (distance / maxLength);
    
    // Only accept very high similarity (> 90%) to avoid false positives
    if (similarity > 0.9 && normalizedArtist.length > 3) {
      return similarity * 0.6; // Scale down fuzzy matches significantly
    }
    
    return 0;
  }
  
  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Find events for a specific artist
   */
  async findEventsForArtist(artist: Artist): Promise<MatchResult[]> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    const matches: MatchResult[] = [];
    
    // Get all events
    const { data: events, error } = await supabase
      .from('events')
      .select('id, ade_id, title, subtitle, raw_data')
      .order('start_date', { ascending: true });
    
    if (error || !events) {
      console.error('Error fetching events:', error);
      return matches;
    }
    
    console.log(`Searching for artist "${artist.title}" in ${events.length} events...`);
    
    for (const event of events) {
      let bestMatch = { confidence: 0, type: '', details: '' };
      
      // Check event title
      const titleConfidence = this.calculateConfidence(artist.title, event.title);
      if (titleConfidence > bestMatch.confidence) {
        bestMatch = {
          confidence: titleConfidence,
          type: 'title',
          details: `Matched in event title: "${event.title}"`
        };
      }
      
      // Check subtitle for artist mentions
      if (event.subtitle) {
        const mentions = this.extractArtistMentions(event.subtitle);
        
        for (const mention of mentions) {
          const confidence = this.calculateConfidence(artist.title, mention);
          if (confidence > bestMatch.confidence) {
            bestMatch = {
              confidence: confidence,
              type: 'subtitle',
              details: `Matched "${mention}" in subtitle`
            };
          }
        }
      }
      
      // Also check raw_data subtitle if different
      if (event.raw_data?.subtitle && event.raw_data.subtitle !== event.subtitle) {
        const mentions = this.extractArtistMentions(event.raw_data.subtitle);
        
        for (const mention of mentions) {
          const confidence = this.calculateConfidence(artist.title, mention);
          if (confidence > bestMatch.confidence) {
            bestMatch = {
              confidence: confidence,
              type: 'raw_subtitle',
              details: `Matched "${mention}" in raw data subtitle`
            };
          }
        }
      }
      
      // If we have a match above threshold, add it
      if (bestMatch.confidence > 0.6) {
        matches.push({
          artistId: artist.id,
          eventId: event.id,
          confidence: bestMatch.confidence,
          matchType: bestMatch.type,
          matchDetails: bestMatch.details
        });
      }
    }
    
    console.log(`Found ${matches.length} matches for artist "${artist.title}"`);
    return matches;
  }

  /**
   * Link all artists to their events
   */
  async linkAllArtistsToEvents(
    onProgress?: (progress: number, message: string) => void
  ): Promise<{
    totalArtists: number;
    totalMatches: number;
    highConfidenceMatches: number;
    lowConfidenceMatches: number;
  }> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    // Get all artists
    const { data: artists, error } = await supabase
      .from('artists')
      .select('id, ade_id, title, subtitle, country_label')
      .order('title', { ascending: true });
    
    if (error || !artists) {
      console.error('Error fetching artists:', error);
      throw error;
    }
    
    let totalMatches = 0;
    let highConfidenceMatches = 0;
    let lowConfidenceMatches = 0;
    let processed = 0;
    
    console.log(`Starting to link ${artists.length} artists to events...`);
    
    for (const artist of artists) {
      processed++;
      
      if (onProgress) {
        const progress = (processed / artists.length) * 100;
        onProgress(progress, `Processing ${artist.title} (${processed}/${artists.length})`);
      }
      
      try {
        const matches = await this.findEventsForArtist(artist);
        
        for (const match of matches) {
          // Check if link already exists
          const { data: existingLink } = await supabase
            .from('artist_events')
            .select('id')
            .eq('artist_id', match.artistId)
            .eq('event_id', match.eventId)
            .single();
          
          if (!existingLink) {
            // Insert new link
            const { error: insertError } = await supabase
              .from('artist_events')
              .insert({
                artist_id: match.artistId,
                event_id: match.eventId,
                role: 'performer',
                source: 'auto_matcher',
                confidence: match.confidence,
                match_details: {
                  type: match.matchType,
                  details: match.matchDetails
                }
              });
            
            if (!insertError) {
              totalMatches++;
              if (match.confidence >= 0.9) {
                highConfidenceMatches++;
              } else {
                lowConfidenceMatches++;
              }
              
              console.log(`✅ Linked ${artist.title} to event (confidence: ${match.confidence.toFixed(2)})`);
            }
          } else {
            console.log(`⏭️ Link already exists for ${artist.title}`);
          }
        }
        
        if (matches.length === 0) {
          console.log(`❌ No events found for ${artist.title}`);
        }
        
      } catch (error) {
        console.error(`Error processing artist ${artist.title}:`, error);
      }
      
      // Rate limiting to avoid overwhelming the database
      if (processed % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    const results = {
      totalArtists: artists.length,
      totalMatches,
      highConfidenceMatches,
      lowConfidenceMatches
    };
    
    console.log('Linking complete:', results);
    
    if (onProgress) {
      onProgress(100, `Complete! Linked ${totalMatches} artist-event pairs`);
    }
    
    return results;
  }

  /**
   * Get events for a specific artist
   */
  async getArtistEvents(artistId: number) {
    if (!isSupabaseConfigured()) {
      return [];
    }

    const { data, error } = await supabase
      .from('artist_events')
      .select(`
        *,
        events (
          id,
          ade_id,
          title,
          subtitle,
          start_date,
          end_date,
          venue_name,
          categories
        )
      `)
      .eq('artist_id', artistId)
      .order('confidence', { ascending: false });
    
    if (error) {
      console.error('Error fetching artist events:', error);
      return [];
    }
    
    return data || [];
  }

  /**
   * Get artists for a specific event
   */
  async getEventArtists(eventId: number) {
    if (!isSupabaseConfigured()) {
      return [];
    }

    const { data, error } = await supabase
      .from('artist_events')
      .select(`
        *,
        artists (
          id,
          ade_id,
          title,
          subtitle,
          country_label
        )
      `)
      .eq('event_id', eventId)
      .order('confidence', { ascending: false });
    
    if (error) {
      console.error('Error fetching event artists:', error);
      return [];
    }
    
    return data || [];
  }
}

export const artistEventMatcher = new ArtistEventMatcher();
