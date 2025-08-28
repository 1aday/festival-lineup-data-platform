interface SpotifyToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at?: number;
}

interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  followers: {
    total: number;
  };
  images: Array<{
    url: string;
    height: number;
    width: number;
  }>;
  external_urls: {
    spotify: string;
  };
}

interface SpotifyTrack {
  id: string;
  name: string;
  popularity: number;
  preview_url: string | null;
  external_urls: {
    spotify: string;
  };
  album: {
    name: string;
    images: Array<{
      url: string;
      height: number;
      width: number;
    }>;
  };
}

interface SpotifyTopTracks {
  tracks: SpotifyTrack[];
}

interface AudioFeatures {
  id: string;
  energy: number;
  danceability: number;
  valence: number;
  tempo: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  speechiness: number;
  loudness: number;
}

class SpotifyAPI {
  private token: SpotifyToken | null = null;
  private clientId: string;
  private clientSecret: string;

  constructor() {
    // These should only be used server-side
    this.clientId = process.env.SPOTIFY_CLIENT_ID || process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || '';
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET || process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET || '';
  }

  private async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.token && this.token.expires_at && this.token.expires_at > Date.now()) {
      return this.token.access_token;
    }

    // Check if credentials are configured
    if (!this.clientId || !this.clientSecret) {
      console.error('Spotify API credentials are not configured.');
      throw new Error('Spotify API credentials are not configured. Please add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to your .env.local file.');
    }

    // Get a new token
    const authString = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error(`Failed to get Spotify token: ${response.statusText}`);
    }

    const data: SpotifyToken = await response.json();
    this.token = {
      ...data,
      expires_at: Date.now() + (data.expires_in * 1000) - 60000, // Subtract 1 minute for safety
    };

    return this.token.access_token;
  }

  async searchArtist(artistName: string): Promise<SpotifyArtist | null> {
    const token = await this.getAccessToken();
    
    const query = encodeURIComponent(artistName);
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${query}&type=artist&limit=1`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      console.error('Spotify search failed:', response.statusText);
      return null;
    }

    const data = await response.json();
    
    if (data.artists && data.artists.items && data.artists.items.length > 0) {
      return data.artists.items[0];
    }

    return null;
  }

  async getArtistById(spotifyId: string): Promise<SpotifyArtist | null> {
    const token = await this.getAccessToken();
    
    const response = await fetch(
      `https://api.spotify.com/v1/artists/${spotifyId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      console.error('Failed to get artist:', response.statusText);
      return null;
    }

    return await response.json();
  }

  async getArtistTopTracks(spotifyId: string, market = 'US'): Promise<SpotifyTopTracks | null> {
    const token = await this.getAccessToken();
    
    // Try multiple markets to find one with preview URLs
    const markets = [market, 'US', 'GB', 'NL', 'DE', 'FR', 'ES'];
    
    for (const currentMarket of markets) {
      console.log(`Trying market: ${currentMarket} for artist ${spotifyId}`);
      const response = await fetch(
        `https://api.spotify.com/v1/artists/${spotifyId}/top-tracks?market=${currentMarket}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        console.error(`Failed to get top tracks for market ${currentMarket}:`, response.statusText);
        continue; // Try next market
      }

      const data = await response.json();
      
      // Check if we have tracks with preview URLs
      if (data.tracks && data.tracks.length > 0) {
        const hasPreview = data.tracks.some((track: any) => track.preview_url !== null);
        if (hasPreview) {
          console.log(`Found preview URLs in market: ${currentMarket}`);
          return data;
        } else {
          console.log(`No preview URLs in market: ${currentMarket}, trying next...`);
        }
      }
    }
    
    // If no market has previews, return the first successful response
    console.warn('No preview URLs found in any market, returning tracks without previews');
    const fallbackResponse = await fetch(
      `https://api.spotify.com/v1/artists/${spotifyId}/top-tracks?market=${market}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );
    
    if (!fallbackResponse.ok) {
      console.error('Failed to get top tracks:', fallbackResponse.statusText);
      return null;
    }
    
    return await fallbackResponse.json();
  }

  async getRelatedArtists(spotifyId: string): Promise<SpotifyArtist[]> {
    try {
      const token = await this.getAccessToken();
      
      console.log(`Fetching related artists for: ${spotifyId}`);
      const response = await fetch(
        `https://api.spotify.com/v1/artists/${spotifyId}/related-artists`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        // 404 is expected for some artists who don't have related artists data
        if (response.status === 404) {
          console.log(`No related artists data available for artist: ${spotifyId}`);
        } else {
          console.error(`Failed to get related artists (${response.status}):`, response.statusText);
        }
        // Return empty array for related artists if not available
        return [];
      }

      const data = await response.json();
      const relatedArtists = data.artists || [];
      console.log(`Found ${relatedArtists.length} related artists for ${spotifyId}`);
      return relatedArtists;
    } catch (error) {
      console.error('Error fetching related artists:', error);
      return [];
    }
  }

  // Diagnostic method to test Spotify API access
  async testApiAccess(): Promise<void> {
    console.log('🔍 Testing Spotify API access levels...');

    try {
      const token = await this.getAccessToken();
      console.log('✅ Successfully got access token');

      // Test basic artist search
      const testResponse = await fetch('https://api.spotify.com/v1/search?q=spotify&type=artist&limit=1', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (testResponse.ok) {
        console.log('✅ Basic search API: Working');
      } else {
        console.log('❌ Basic search API:', testResponse.status, testResponse.statusText);
      }

      // Test audio features (this will likely fail)
      const featuresResponse = await fetch('https://api.spotify.com/v1/audio-features/4iV5W9uYEdYUVa79Axb7Rh', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (featuresResponse.ok) {
        console.log('✅ Audio features API: Working (you have premium access!)');
      } else {
        console.log('❌ Audio features API:', featuresResponse.status, featuresResponse.statusText);
        console.log('📊 This is normal for Client Credentials - synthetic data will be used');
      }

    } catch (error) {
      console.error('❌ API access test failed:', error);
    }
  }

  async getAudioFeatures(trackIds: string[]): Promise<AudioFeatures[]> {
    if (trackIds.length === 0) return [];

    const token = await this.getAccessToken();
    const ids = trackIds.slice(0, 100).join(','); // Spotify API limit is 100

    const response = await fetch(
      `https://api.spotify.com/v1/audio-features?ids=${ids}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      console.error('Failed to get audio features:', response.statusText);

      // Check if it's a Forbidden error (403) which is common with Client Credentials
      if (response.status === 403) {
        console.warn('🎵 Spotify API Restriction: Audio features endpoint blocked (403 Forbidden)');
        console.warn('📊 This is normal for Client Credentials auth - using smart synthetic data instead');
        console.warn('🔄 Synthetic features are generated based on artist genres and popularity');
        return []; // Return empty array instead of throwing
      }

      // For other errors, still throw
      throw new Error(`Audio features API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.audio_features?.filter((f: any) => f !== null) || [];
  }

  async getTrack(trackId: string): Promise<SpotifyTrack | null> {
    const token = await this.getAccessToken();
    
    const response = await fetch(
      `https://api.spotify.com/v1/tracks/${trackId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      console.error('Failed to get track:', response.statusText);
      return null;
    }

    return await response.json();
  }
}

export const spotifyApi = new SpotifyAPI();
export type { SpotifyArtist, SpotifyTopTracks, SpotifyTrack, AudioFeatures };
