import { useState, useCallback } from 'react';
import { adeApi } from '@/lib/ade-api';
import { dbService } from '@/lib/db-service';
import { isSupabaseConfigured } from '@/lib/supabase';
import { SyncProgress, ADEArtist, ADEEvent } from '@/lib/types';
import { toast } from 'sonner';

export function useADESync(syncType: 'artists' | 'events' | 'both' = 'artists') {
  const [progress, setProgress] = useState<SyncProgress>({
    currentPage: 0,
    totalPages: null,
    itemsFetched: 0,
    newItemsAdded: 0,
    itemsUpdated: 0,
    status: 'idle',
    message: 'Ready to sync',
    currentBatch: []
  });

  const [isRunning, setIsRunning] = useState(false);
  const [syncHistoryId, setSyncHistoryId] = useState<number | null>(null);

  const startSync = useCallback(async (fromDate?: string, toDate?: string) => {
    if (isRunning) return;

    setIsRunning(true);
    let historyId: number | null = null;
    let totalFetched = 0;
    let totalInserted = 0;
    let totalUpdated = 0;

    try {
      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        toast.error('Supabase is not configured. Running in demo mode.');
        setProgress(prev => ({
          ...prev,
          status: 'error',
          message: 'Supabase not configured - running in demo mode'
        }));
      }

      // Create sync history entry if Supabase is configured
      if (isSupabaseConfigured()) {
        historyId = await dbService.createSyncHistory(syncType === 'events' ? 'events' : 'artists');
        setSyncHistoryId(historyId);
      }

      setProgress({
        currentPage: 0,
        totalPages: null,
        itemsFetched: 0,
        newItemsAdded: 0,
        itemsUpdated: 0,
        status: 'fetching',
        message: `Starting ${syncType} sync...`,
        currentBatch: []
      });

      if (syncType === 'both') {
        // Sync both artists and events
        toast.info('Syncing artists first, then events...');
        
        // First sync artists
        await adeApi.fetchAllArtists(
          async (page: number, artists: ADEArtist[]) => {
            totalFetched += artists.length;

            setProgress(prev => ({
              ...prev,
              currentPage: page + 1,
              itemsFetched: totalFetched,
              status: 'processing',
              message: `Artists: Fetched page ${page + 1} - Processing ${artists.length} items...`,
              currentBatch: artists
            }));

            // Process batch if Supabase is configured
            if (isSupabaseConfigured()) {
              try {
                const { inserted, updated } = await dbService.upsertArtists(artists);
                totalInserted += inserted;
                totalUpdated += updated;

                setProgress(prev => ({
                  ...prev,
                  newItemsAdded: totalInserted,
                  itemsUpdated: totalUpdated,
                  message: `Artists Page ${page + 1}: Added ${inserted} new, Updated ${updated} existing`
                }));

                // Update sync history
                if (historyId) {
                  await dbService.updateSyncHistory(historyId, {
                    total_items_fetched: totalFetched,
                    new_items_added: totalInserted,
                    items_updated: totalUpdated
                  });
                }
              } catch (dbError) {
                console.error('Database error:', dbError);
                toast.error('Error saving artists to database');
              }
            }
          },
          fromDate,
          toDate
        );

        // Now sync events
        toast.info('Now syncing events...');
        let eventsFetched = 0;
        let eventsInserted = 0;
        let eventsUpdated = 0;
        
        await adeApi.fetchAllEvents(
          async (page: number, events: ADEEvent[]) => {
            eventsFetched += events.length;

            setProgress(prev => ({
              ...prev,
              currentPage: page + 1,
              itemsFetched: totalFetched + eventsFetched,
              status: 'processing',
              message: `Events: Fetched page ${page + 1} - Processing ${events.length} items...`,
              currentBatch: events
            }));

            // Process batch if Supabase is configured
            if (isSupabaseConfigured()) {
              try {
                const { inserted, updated } = await dbService.upsertEvents(events);
                eventsInserted += inserted;
                eventsUpdated += updated;

                setProgress(prev => ({
                  ...prev,
                  newItemsAdded: totalInserted + eventsInserted,
                  itemsUpdated: totalUpdated + eventsUpdated,
                  message: `Events Page ${page + 1}: Added ${inserted} new, Updated ${updated} existing`
                }));
              } catch (dbError) {
                console.error('Database error:', dbError);
                toast.error('Error saving events to database');
              }
            }
          },
          fromDate,
          toDate
        );
        
        totalFetched += eventsFetched;
        totalInserted += eventsInserted;
        totalUpdated += eventsUpdated;
        
      } else if (syncType === 'artists') {
        // Sync only artists
        await adeApi.fetchAllArtists(
          async (page: number, artists: ADEArtist[]) => {
            totalFetched += artists.length;

            setProgress(prev => ({
              ...prev,
              currentPage: page + 1,
              itemsFetched: totalFetched,
              status: 'processing',
              message: `Fetched page ${page + 1} - Processing ${artists.length} artists...`,
              currentBatch: artists
            }));

            // Process batch if Supabase is configured
            if (isSupabaseConfigured()) {
              try {
                const { inserted, updated } = await dbService.upsertArtists(artists);
                totalInserted += inserted;
                totalUpdated += updated;

                setProgress(prev => ({
                  ...prev,
                  newItemsAdded: totalInserted,
                  itemsUpdated: totalUpdated,
                  message: `Page ${page + 1}: Added ${inserted} new, Updated ${updated} existing`
                }));

                // Update sync history
                if (historyId) {
                  await dbService.updateSyncHistory(historyId, {
                    total_items_fetched: totalFetched,
                    new_items_added: totalInserted,
                    items_updated: totalUpdated
                  });
                }
              } catch (dbError) {
                console.error('Database error:', dbError);
                toast.error('Error saving to database');
              }
            }
          },
          fromDate,
          toDate
        );
      } else if (syncType === 'events') {
        // Sync only events
        await adeApi.fetchAllEvents(
          async (page: number, events: ADEEvent[]) => {
            totalFetched += events.length;

            setProgress(prev => ({
              ...prev,
              currentPage: page + 1,
              itemsFetched: totalFetched,
              status: 'processing',
              message: `Fetched page ${page + 1} - Processing ${events.length} events...`,
              currentBatch: events
            }));

            // Process batch if Supabase is configured
            if (isSupabaseConfigured()) {
              try {
                const { inserted, updated } = await dbService.upsertEvents(events);
                totalInserted += inserted;
                totalUpdated += updated;

                setProgress(prev => ({
                  ...prev,
                  newItemsAdded: totalInserted,
                  itemsUpdated: totalUpdated,
                  message: `Page ${page + 1}: Added ${inserted} new, Updated ${updated} existing`
                }));

                // Update sync history
                if (historyId) {
                  await dbService.updateSyncHistory(historyId, {
                    total_items_fetched: totalFetched,
                    new_items_added: totalInserted,
                    items_updated: totalUpdated
                  });
                }
              } catch (dbError) {
                console.error('Database error:', dbError);
                toast.error('Error saving to database');
              }
            }
          },
          fromDate,
          toDate
        );
      }

      // Complete sync
      if (historyId && isSupabaseConfigured()) {
        await dbService.completeSyncHistory(
          historyId,
          totalFetched,
          totalInserted,
          totalUpdated,
          true
        );
      }

      setProgress(prev => ({
        ...prev,
        status: 'completed',
        message: `Sync completed! Fetched ${totalFetched} ${syncType === 'both' ? 'items' : syncType}. Added ${totalInserted} new, Updated ${totalUpdated} existing.`,
        currentBatch: []
      }));

      toast.success(`Sync completed! ${totalInserted} new ${syncType === 'both' ? 'items' : syncType} added.`);

    } catch (error) {
      console.error('Sync error:', error);
      
      if (historyId && isSupabaseConfigured()) {
        await dbService.completeSyncHistory(
          historyId,
          totalFetched,
          totalInserted,
          totalUpdated,
          false,
          String(error)
        );
      }

      setProgress(prev => ({
        ...prev,
        status: 'error',
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        currentBatch: []
      }));

      toast.error('Sync failed. Check console for details.');
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, syncType]);

  const resetSync = useCallback(() => {
    setProgress({
      currentPage: 0,
      totalPages: null,
      itemsFetched: 0,
      newItemsAdded: 0,
      itemsUpdated: 0,
      status: 'idle',
      message: 'Ready to sync',
      currentBatch: []
    });
    setSyncHistoryId(null);
    setIsRunning(false);
  }, []);

  return {
    progress,
    isRunning,
    syncHistoryId,
    startSync,
    resetSync
  };
}
