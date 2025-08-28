// Cache for Spotify preview URLs to reduce API calls
interface PreviewCacheEntry {
  trackId: string;
  trackName: string;
  artistName: string;
  previewUrl: string | null;
  popularity?: number;
  fetchedAt: number;
}

class PreviewCache {
  private cache: Map<string, PreviewCacheEntry> = new Map();
  private maxAge = 24 * 60 * 60 * 1000; // 24 hours cache
  
  // Store preview data
  set(artistId: string, data: Omit<PreviewCacheEntry, 'fetchedAt'>): void {
    this.cache.set(artistId, {
      ...data,
      fetchedAt: Date.now()
    });
    
    // Store in localStorage for persistence (browser only)
    if (typeof window !== 'undefined') {
      try {
        const storageData = JSON.stringify(Array.from(this.cache.entries()));
        localStorage.setItem('spotify_preview_cache', storageData);
      } catch (e) {
        console.warn('Failed to store preview cache:', e);
      }
    }
  }
  
  // Get preview data if not expired
  get(artistId: string): PreviewCacheEntry | null {
    const entry = this.cache.get(artistId);
    
    if (!entry) {
      // Try to load from localStorage
      if (typeof window !== 'undefined') {
        this.loadFromStorage();
        return this.cache.get(artistId) || null;
      }
      return null;
    }
    
    // Check if cache is expired
    if (Date.now() - entry.fetchedAt > this.maxAge) {
      this.cache.delete(artistId);
      return null;
    }
    
    return entry;
  }
  
  // Load cache from localStorage
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem('spotify_preview_cache');
      if (!stored) return;
      
      const entries = JSON.parse(stored) as Array<[string, PreviewCacheEntry]>;
      const now = Date.now();
      
      // Restore non-expired entries
      entries.forEach(([key, value]) => {
        if (now - value.fetchedAt < this.maxAge) {
          this.cache.set(key, value);
        }
      });
    } catch (e) {
      console.warn('Failed to load preview cache:', e);
    }
  }
  
  // Clear expired entries
  cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];
    
    this.cache.forEach((value, key) => {
      if (now - value.fetchedAt > this.maxAge) {
        toDelete.push(key);
      }
    });
    
    toDelete.forEach(key => this.cache.delete(key));
  }
  
  // Get all cached entries (for debugging)
  getAll(): Map<string, PreviewCacheEntry> {
    return new Map(this.cache);
  }
  
  // Clear all cache
  clear(): void {
    this.cache.clear();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('spotify_preview_cache');
    }
  }
}

export const previewCache = new PreviewCache();
export type { PreviewCacheEntry };
