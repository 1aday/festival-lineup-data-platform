import { supabase, isSupabaseConfigured } from './supabase';
import { DBArtist, DBEvent, DBArtistEvent, SyncHistory, ArtistChange } from './types';
import { adeApi } from './ade-api';
import { ADEArtist, ADEEvent } from './types';

export class DatabaseService {
  /**
   * Initialize database tables (run once)
   */
  async initializeTables() {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please set environment variables.');
    }

    // Tables should be created via Supabase dashboard or migration
    // This is just to check if tables exist
    const { error } = await supabase.from('artists').select('id').limit(1);
    if (error && error.code === 'PGRST204') {
      console.log('Tables initialized successfully');
    }
    return !error;
  }

  /**
   * Get all artists from database
   */
  async getArtists(limit?: number, offset?: number): Promise<DBArtist[]> {
    let query = supabase
      .from('artists')
      .select('*')
      .order('title', { ascending: true });

    if (limit) query = query.limit(limit);
    if (offset) query = query.range(offset, offset + (limit || 100) - 1);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching artists:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get artist by ADE ID
   */
  async getArtistByAdeId(adeId: number): Promise<DBArtist | null> {
    const { data, error } = await supabase
      .from('artists')
      .select('*')
      .eq('ade_id', adeId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error fetching artist:', error);
      throw error;
    }

    return data;
  }

  /**
   * Upsert artists (insert or update)
   */
  async upsertArtists(artists: ADEArtist[]): Promise<{ inserted: number; updated: number }> {
    const cleanedArtists = artists.map(artist => adeApi.cleanArtistData(artist));
    
    let inserted = 0;
    let updated = 0;

    for (const artist of cleanedArtists) {
      // Check if artist exists
      const existing = await this.getArtistByAdeId(artist.ade_id);
      
      if (existing) {
        // Update existing artist
        const { error } = await supabase
          .from('artists')
          .update({
            ...artist,
            last_updated_at: new Date().toISOString()
          })
          .eq('ade_id', artist.ade_id);

        if (!error) {
          updated++;
          
          // Log the update
          await this.logArtistChange(existing.id, 'updated', existing, artist);
        } else {
          console.error('Error updating artist:', error);
        }
      } else {
        // Insert new artist
        const { data, error } = await supabase
          .from('artists')
          .insert({
            ...artist,
            first_seen_at: new Date().toISOString(),
            last_updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (!error && data) {
          inserted++;
          
          // Log the addition
          await this.logArtistChange(data.id, 'added', null, artist);
        } else {
          console.error('Error inserting artist:', error);
        }
      }
    }

    return { inserted, updated };
  }

  /**
   * Log artist change
   */
  async logArtistChange(
    artistId: number, 
    changeType: 'added' | 'updated' | 'deactivated' | 'reactivated',
    previousData: any,
    newData: any
  ) {
    const { error } = await supabase
      .from('artist_changes')
      .insert({
        artist_id: artistId,
        change_type: changeType,
        changed_at: new Date().toISOString(),
        previous_data: previousData,
        new_data: newData
      });

    if (error) {
      console.error('Error logging artist change:', error);
    }
  }

  /**
   * Create sync history entry
   */
  async createSyncHistory(syncType: 'artists' | 'events'): Promise<number> {
    const { data, error } = await supabase
      .from('sync_history')
      .insert({
        sync_type: syncType,
        started_at: new Date().toISOString(),
        status: 'in_progress',
        total_items_fetched: 0,
        new_items_added: 0,
        items_updated: 0
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating sync history:', error);
      throw error;
    }

    return data.id;
  }

  /**
   * Update sync history
   */
  async updateSyncHistory(
    id: number, 
    updates: Partial<SyncHistory>
  ) {
    const { error } = await supabase
      .from('sync_history')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating sync history:', error);
    }
  }

  /**
   * Complete sync history
   */
  async completeSyncHistory(
    id: number,
    totalFetched: number,
    newAdded: number,
    updated: number,
    success: boolean = true,
    errorMessage?: string
  ) {
    await this.updateSyncHistory(id, {
      completed_at: new Date().toISOString(),
      status: success ? 'completed' : 'failed',
      total_items_fetched: totalFetched,
      new_items_added: newAdded,
      items_updated: updated,
      error_message: errorMessage || null
    });
  }

  /**
   * Get recent sync history
   */
  async getRecentSyncs(limit: number = 10): Promise<SyncHistory[]> {
    const { data, error } = await supabase
      .from('sync_history')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching sync history:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get statistics
   */
  async getStatistics() {
    const { data: totalArtists } = await supabase
      .from('artists')
      .select('id', { count: 'exact', head: true });

    const { data: todayArtists } = await supabase
      .from('artists')
      .select('id', { count: 'exact', head: true })
      .gte('first_seen_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

    const { data: countries } = await supabase
      .from('artists')
      .select('country_value')
      .not('country_value', 'is', null);

    const uniqueCountries = new Set(countries?.map(c => c.country_value) || []);

    const { data: lastSync } = await supabase
      .from('sync_history')
      .select('*')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    return {
      totalArtists: totalArtists || 0,
      todayArtists: todayArtists || 0,
      uniqueCountries: uniqueCountries.size,
      lastSync: lastSync?.completed_at || null
    };
  }

  /**
   * Search artists
   */
  async searchArtists(query: string): Promise<DBArtist[]> {
    const { data, error } = await supabase
      .from('artists')
      .select('*')
      .ilike('title', `%${query}%`)
      .order('title', { ascending: true })
      .limit(50);

    if (error) {
      console.error('Error searching artists:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get all events from database
   */
  async getEvents(limit?: number, offset?: number): Promise<DBEvent[]> {
    let query = supabase
      .from('events')
      .select('*')
      .order('start_date', { ascending: true });

    if (limit) query = query.limit(limit);
    if (offset) query = query.range(offset, offset + (limit || 100) - 1);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching events:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get event by ADE ID
   */
  async getEventByAdeId(adeId: number): Promise<DBEvent | null> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('ade_id', adeId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error fetching event:', error);
      throw error;
    }

    return data;
  }

  /**
   * Upsert events (insert or update)
   */
  async upsertEvents(events: ADEEvent[]): Promise<{ inserted: number; updated: number }> {
    console.log(`Processing ${events.length} events...`);
    
    // Clean and transform the events with error handling
    const cleanedEvents: any[] = [];
    for (const event of events) {
      try {
        const cleaned = adeApi.cleanEventData(event);
        cleanedEvents.push(cleaned);
      } catch (error) {
        console.error('Error cleaning event data:', {
          error,
          eventId: event.id,
          eventTitle: event.title,
          rawEvent: event
        });
      }
    }
    
    console.log(`Cleaned ${cleanedEvents.length} events successfully`);
    
    let inserted = 0;
    let updated = 0;

    for (const event of cleanedEvents) {
      // Check if event exists
      const existing = await this.getEventByAdeId(event.ade_id);
      
      if (existing) {
        // Update existing event
        const { data, error } = await supabase
          .from('events')
          .update({
            ...event,
            last_updated_at: new Date().toISOString()
          })
          .eq('ade_id', event.ade_id)
          .select();

        if (!error && data) {
          updated++;
          console.log('Successfully updated event:', data[0]?.title);
        } else {
          console.error('Error updating event:', {
            error,
            eventTitle: event.title,
            adeId: event.ade_id,
            errorMessage: error?.message,
            errorCode: error?.code
          });
        }
      } else {
        // Insert new event
        const eventData = {
          ...event,
          first_seen_at: new Date().toISOString(),
          last_updated_at: new Date().toISOString()
        };
        
        console.log('Attempting to insert event:', eventData.title, { ade_id: eventData.ade_id });
        
        const { data, error } = await supabase
          .from('events')
          .insert(eventData)
          .select();

        if (!error && data) {
          inserted++;
          console.log('Successfully inserted event:', data[0]?.title);
        } else {
          console.error('Error inserting event:', {
            error,
            eventTitle: event.title,
            adeId: event.ade_id,
            errorMessage: error?.message,
            errorCode: error?.code,
            errorDetails: error?.details
          });
        }
      }
    }

    return { inserted, updated };
  }

  /**
   * Link artists to events (many-to-many relationship)
   */
  async linkArtistToEvent(artistAdeId: number, eventAdeId: number, role: string = 'performer') {
    // First get the database IDs
    const artist = await this.getArtistByAdeId(artistAdeId);
    const event = await this.getEventByAdeId(eventAdeId);

    if (!artist || !event) {
      console.error('Artist or event not found', { artistAdeId, eventAdeId });
      return;
    }

    // Check if link already exists
    const { data: existing } = await supabase
      .from('artist_events')
      .select('id')
      .eq('artist_id', artist.id)
      .eq('event_id', event.id)
      .single();

    if (!existing) {
      // Create the link
      const { error } = await supabase
        .from('artist_events')
        .insert({
          artist_id: artist.id,
          event_id: event.id,
          role,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error linking artist to event:', error);
      }
    }
  }

  /**
   * Get events for an artist
   */
  async getArtistEvents(artistId: number): Promise<DBEvent[]> {
    const { data, error } = await supabase
      .from('artist_events')
      .select(`
        events (*)
      `)
      .eq('artist_id', artistId);

    if (error) {
      console.error('Error fetching artist events:', error);
      throw error;
    }

    return data?.map(item => item.events).filter(Boolean) || [];
  }

  /**
   * Get artists for an event
   */
  async getEventArtists(eventId: number): Promise<DBArtist[]> {
    const { data, error } = await supabase
      .from('artist_events')
      .select(`
        artists (*)
      `)
      .eq('event_id', eventId);

    if (error) {
      console.error('Error fetching event artists:', error);
      throw error;
    }

    return data?.map(item => item.artists).filter(Boolean) || [];
  }

  /**
   * Get events happening on a specific date
   */
  async getEventsByDate(date: string): Promise<DBEvent[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gte('start_date', startOfDay.toISOString())
      .lte('start_date', endOfDay.toISOString())
      .order('start_date', { ascending: true });

    if (error) {
      console.error('Error fetching events by date:', error);
      throw error;
    }

    return data || [];
  }
}

export const dbService = new DatabaseService();
