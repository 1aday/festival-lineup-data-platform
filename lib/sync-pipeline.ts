import { createHash } from 'crypto';
import { supabase, isSupabaseConfigured } from './supabase';
import { adeApi } from './ade-api';
import { eventParser } from './event-parser';
import { ADEArtist, ADEEvent } from './types';

export interface ScrapeRun {
  id: number;
  run_id: string;
  status: 'running' | 'success' | 'error' | 'partial';
  sync_type: 'artists' | 'events' | 'both' | 'linking';
  started_at: string;
  completed_at?: string;
  from_date?: string;
  to_date?: string;
  total_pages_fetched: number;
  total_items_processed: number;
  items_created: number;
  items_updated: number;
  items_unchanged: number;
  links_added: number;
  links_removed: number;
  stubs_created: number;
  error_count: number;
  progress_percent: number;
}

export interface ProgressCallback {
  (update: {
    step: string;
    progress: number;
    message: string;
    details?: any;
  }): void;
}

export class SyncPipeline {
  private runId: string | null = null;
  private progressCallback?: ProgressCallback;

  /**
   * Compute content hash for an artist
   */
  private computeArtistHash(artist: any): string {
    const content = [
      artist.title || '',
      artist.subtitle || '',
      artist.country_label || '',
      artist.country_value || '',
      artist.url || '',
      artist.image_url || ''
    ].join('|');
    
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Compute content hash for an event
   */
  private computeEventHash(event: any): string {
    const content = [
      event.title || '',
      event.subtitle || '',
      event.start_date || '',
      event.end_date || '',
      event.venue_name || '',
      event.categories || '',
      event.url || '',
      event.sold_out ? '1' : '0'
    ].join('|');
    
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Start a new scrape run
   */
  async startRun(
    syncType: 'artists' | 'events' | 'both' | 'linking',
    fromDate?: string,
    toDate?: string
  ): Promise<string> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase
      .from('scrape_runs')
      .insert({
        sync_type: syncType,
        status: 'running',
        from_date: fromDate,
        to_date: toDate,
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    
    this.runId = data.run_id;
    await this.logProgress('info', `Started ${syncType} sync run`, { run_id: this.runId });
    
    return this.runId;
  }

  /**
   * Log progress to database
   */
  async logProgress(level: string, message: string, details?: any) {
    if (!this.runId || !isSupabaseConfigured()) return;

    await supabase
      .from('progress_logs')
      .insert({
        run_id: this.runId,
        log_level: level,
        message,
        details
      });

    // Call progress callback if set
    if (this.progressCallback) {
      this.progressCallback({
        step: level,
        progress: 0,
        message,
        details
      });
    }
  }

  /**
   * Update run statistics
   */
  async updateRunStats(updates: Partial<ScrapeRun>) {
    if (!this.runId || !isSupabaseConfigured()) return;

    await supabase
      .from('scrape_runs')
      .update(updates)
      .eq('run_id', this.runId);
  }

  /**
   * Sync artists with change detection
   */
  async syncArtists(fromDate?: string, toDate?: string): Promise<{
    created: number;
    updated: number;
    unchanged: number;
    totalPages: number;
  }> {
    let created = 0;
    let updated = 0;
    let unchanged = 0;
    let totalPages = 0;
    let totalProcessed = 0;

    await this.logProgress('info', 'Starting artist sync');

    // Fetch all artists
    const allArtists = await adeApi.fetchAllArtists(
      async (page, artists) => {
        totalPages++;
        totalProcessed += artists.length;
        
        await this.updateRunStats({
          artists_pages: totalPages,
          total_items_processed: totalProcessed,
          progress_percent: Math.min(50, totalPages * 2) // Estimate
        });

        await this.logProgress('info', `Fetched page ${page + 1} with ${artists.length} artists`);

        // Process batch
        for (const artist of artists) {
          const cleanedArtist = adeApi.cleanArtistData(artist);
          const contentHash = this.computeArtistHash(cleanedArtist);

          // Check if artist exists
          const { data: existing } = await supabase
            .from('artists')
            .select('id, content_hash')
            .eq('ade_id', artist.id)
            .single();

          if (!existing) {
            // Create new artist
            await supabase
              .from('artists')
              .insert({
                ...cleanedArtist,
                content_hash: contentHash,
                added_by_run: this.runId,
                first_seen_at: new Date().toISOString(),
                last_updated_at: new Date().toISOString()
              });

            created++;
            await this.logProgress('debug', `➕ Created artist: ${artist.title}`, { ade_id: artist.id });
            
            // Log change
            await this.logChange('artist', artist.id, 'created', null, contentHash, null, cleanedArtist);
          } else if (existing.content_hash !== contentHash) {
            // Update existing artist
            await supabase
              .from('artists')
              .update({
                ...cleanedArtist,
                content_hash: contentHash,
                updated_by_run: this.runId,
                last_updated_at: new Date().toISOString()
              })
              .eq('ade_id', artist.id);

            updated++;
            await this.logProgress('debug', `✏️ Updated artist: ${artist.title}`, { ade_id: artist.id });
            
            // Log change
            await this.logChange('artist', artist.id, 'updated', existing.content_hash, contentHash, null, cleanedArtist);
          } else {
            unchanged++;
          }
        }

        await this.updateRunStats({
          items_created: created,
          items_updated: updated,
          items_unchanged: unchanged
        });
      },
      fromDate,
      toDate
    );

    await this.logProgress('info', `Artist sync complete: ${created} created, ${updated} updated, ${unchanged} unchanged`);
    
    return { created, updated, unchanged, totalPages };
  }

  /**
   * Sync events with change detection
   */
  async syncEvents(fromDate?: string, toDate?: string): Promise<{
    created: number;
    updated: number;
    unchanged: number;
    totalPages: number;
  }> {
    let created = 0;
    let updated = 0;
    let unchanged = 0;
    let totalPages = 0;
    let totalProcessed = 0;

    await this.logProgress('info', 'Starting event sync');

    // Fetch all events
    const allEvents = await adeApi.fetchAllEvents(
      async (page, events) => {
        totalPages++;
        totalProcessed += events.length;
        
        await this.updateRunStats({
          events_pages: totalPages,
          total_items_processed: totalProcessed,
          progress_percent: Math.min(100, 50 + totalPages) // Estimate
        });

        await this.logProgress('info', `Fetched page ${page + 1} with ${events.length} events`);

        // Process batch
        for (const event of events) {
          const cleanedEvent = adeApi.cleanEventData(event);
          const contentHash = this.computeEventHash(cleanedEvent);

          // Check if event exists
          const { data: existing } = await supabase
            .from('events')
            .select('id, content_hash')
            .eq('ade_id', event.id)
            .single();

          if (!existing) {
            // Create new event
            await supabase
              .from('events')
              .insert({
                ...cleanedEvent,
                content_hash: contentHash,
                added_by_run: this.runId,
                first_seen_at: new Date().toISOString(),
                last_updated_at: new Date().toISOString(),
                lineup_parsed: false
              });

            created++;
            await this.logProgress('debug', `➕ Created event: ${event.title}`, { ade_id: event.id });
            
            // Log change
            await this.logChange('event', event.id, 'created', null, contentHash, null, cleanedEvent);
          } else if (existing.content_hash !== contentHash) {
            // Update existing event
            await supabase
              .from('events')
              .update({
                ...cleanedEvent,
                content_hash: contentHash,
                updated_by_run: this.runId,
                last_updated_at: new Date().toISOString()
              })
              .eq('ade_id', event.id);

            updated++;
            await this.logProgress('debug', `✏️ Updated event: ${event.title}`, { ade_id: event.id });
            
            // Log change
            await this.logChange('event', event.id, 'updated', existing.content_hash, contentHash, null, cleanedEvent);
          } else {
            unchanged++;
          }
        }

        await this.updateRunStats({
          items_created: created,
          items_updated: updated,
          items_unchanged: unchanged
        });
      },
      fromDate,
      toDate
    );

    await this.logProgress('info', `Event sync complete: ${created} created, ${updated} updated, ${unchanged} unchanged`);
    
    return { created, updated, unchanged, totalPages };
  }

  /**
   * Parse event lineups and link artists
   */
  async parseAndLinkLineups(onlyNewOrUpdated: boolean = true): Promise<{
    eventsParsed: number;
    linksAdded: number;
    stubsCreated: number;
  }> {
    await this.logProgress('info', 'Starting lineup parsing and linking');

    // Get events to parse
    let query = supabase
      .from('events')
      .select('id, ade_id, title, url');

    if (onlyNewOrUpdated && this.runId) {
      query = query.or(`added_by_run.eq.${this.runId},updated_by_run.eq.${this.runId}`);
    } else {
      query = query.eq('lineup_parsed', false);
    }

    const { data: events, error } = await query.limit(100); // Process in batches
    
    if (error || !events) {
      await this.logProgress('error', 'Failed to fetch events for parsing', error);
      return { eventsParsed: 0, linksAdded: 0, stubsCreated: 0 };
    }

    let eventsParsed = 0;
    let linksAdded = 0;
    let stubsCreated = 0;

    for (const event of events) {
      if (!event.url) continue;

      try {
        await this.logProgress('debug', `Parsing lineup for: ${event.title}`, { ade_id: event.ade_id });
        
        // Fetch and parse event page
        const { lineup, html } = await eventParser.fetchAndParseEventPage(event.url);
        
        eventsParsed++;
        
        // Store the HTML for debugging
        await supabase
          .from('events')
          .update({
            lineup_parsed: true,
            lineup_html: html.substring(0, 10000) // Store first 10KB for debugging
          })
          .eq('id', event.id);

        // Process lineup artists
        for (const lineupArtist of lineup) {
          // Check if artist exists
          const { data: artist } = await supabase
            .from('artists')
            .select('id')
            .eq('ade_id', lineupArtist.adeId)
            .single();

          let artistDbId: number;

          if (!artist) {
            // Create stub artist
            const { data: newArtist, error: artistError } = await supabase
              .from('artists')
              .insert({
                ade_id: lineupArtist.adeId,
                title: lineupArtist.name,
                url: lineupArtist.profileUrl,
                is_stub: true,
                added_by_run: this.runId,
                first_seen_at: new Date().toISOString(),
                last_updated_at: new Date().toISOString()
              })
              .select()
              .single();

            if (artistError) {
              await this.logProgress('error', `Failed to create stub artist: ${lineupArtist.name}`, artistError);
              continue;
            }

            artistDbId = newArtist.id;
            stubsCreated++;
            await this.logProgress('debug', `🆕 Created stub artist: ${lineupArtist.name}`, { ade_id: lineupArtist.adeId });
          } else {
            artistDbId = artist.id;
          }

          // Check if link exists
          const { data: existingLink } = await supabase
            .from('artist_events')
            .select('id')
            .eq('artist_id', artistDbId)
            .eq('event_id', event.id)
            .single();

          if (!existingLink) {
            // Create link
            const { error: linkError } = await supabase
              .from('artist_events')
              .insert({
                artist_id: artistDbId,
                event_id: event.id,
                role: lineupArtist.role || 'performer',
                source: 'lineup',
                added_by_run: this.runId,
                confidence: 1.0
              });

            if (!linkError) {
              linksAdded++;
              await this.logProgress('debug', `🔗 Linked ${lineupArtist.name} to ${event.title}`);
            }
          }
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await this.updateRunStats({
          event_details_fetched: eventsParsed,
          links_added: linksAdded,
          stubs_created: stubsCreated
        });

      } catch (error) {
        await this.logProgress('error', `Failed to parse lineup for event: ${event.title}`, error);
      }
    }

    await this.logProgress('info', `Lineup parsing complete: ${eventsParsed} events parsed, ${linksAdded} links added, ${stubsCreated} stubs created`);
    
    return { eventsParsed, linksAdded, stubsCreated };
  }

  /**
   * Log a change to the change_logs table
   */
  private async logChange(
    entityType: string,
    externalId: number,
    changeType: string,
    oldHash: string | null,
    newHash: string,
    oldData: any,
    newData: any
  ) {
    if (!this.runId || !isSupabaseConfigured()) return;

    // Compute diff (simplified)
    const changedFields: string[] = [];
    if (oldData && newData) {
      for (const key in newData) {
        if (oldData[key] !== newData[key]) {
          changedFields.push(key);
        }
      }
    }

    await supabase
      .from('change_logs')
      .insert({
        run_id: this.runId,
        entity_type: entityType,
        external_id: externalId,
        change_type: changeType,
        old_content_hash: oldHash,
        new_content_hash: newHash,
        old_data: oldData,
        new_data: newData,
        changed_fields: changedFields
      });
  }

  /**
   * Complete the run
   */
  async completeRun(status: 'success' | 'error' | 'partial' = 'success', errorMessage?: string) {
    if (!this.runId || !isSupabaseConfigured()) return;

    await this.updateRunStats({
      status,
      completed_at: new Date().toISOString(),
      error_message: errorMessage,
      progress_percent: 100
    });

    await this.logProgress('info', `Run completed with status: ${status}`);
  }

  /**
   * Run the complete sync pipeline
   */
  async runFullSync(
    fromDate?: string,
    toDate?: string,
    progressCallback?: ProgressCallback
  ): Promise<{
    runId: string;
    stats: any;
  }> {
    this.progressCallback = progressCallback;
    
    try {
      // Start run
      const runId = await this.startRun('both', fromDate, toDate);
      
      // Step 1: Sync artists
      if (progressCallback) {
        progressCallback({ step: 'artists', progress: 0, message: 'Syncing artists...' });
      }
      const artistStats = await this.syncArtists(fromDate, toDate);
      
      // Step 2: Sync events
      if (progressCallback) {
        progressCallback({ step: 'events', progress: 50, message: 'Syncing events...' });
      }
      const eventStats = await this.syncEvents(fromDate, toDate);
      
      // Step 3: Parse lineups and link
      if (progressCallback) {
        progressCallback({ step: 'linking', progress: 75, message: 'Parsing lineups and linking...' });
      }
      const linkStats = await this.parseAndLinkLineups();
      
      // Complete run
      await this.completeRun('success');
      
      if (progressCallback) {
        progressCallback({ step: 'complete', progress: 100, message: 'Sync complete!' });
      }
      
      return {
        runId,
        stats: {
          artists: artistStats,
          events: eventStats,
          linking: linkStats
        }
      };
      
    } catch (error) {
      await this.completeRun('error', String(error));
      throw error;
    }
  }

  /**
   * Get recent runs
   */
  static async getRecentRuns(limit: number = 10): Promise<ScrapeRun[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('scrape_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent runs:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get run progress logs
   */
  static async getRunLogs(runId: string): Promise<any[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('progress_logs')
      .select('*')
      .eq('run_id', runId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching run logs:', error);
      return [];
    }

    return data || [];
  }
}

export const syncPipeline = new SyncPipeline();
