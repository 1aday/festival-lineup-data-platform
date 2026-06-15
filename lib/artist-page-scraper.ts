import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ArtistPageData {
  adeId: number;
  title: string;
  spotifyUrl?: string;
  spotifyId?: string;
  socialLinks: {
    spotify?: string;
    instagram?: string;
    twitter?: string;
    facebook?: string;
    soundcloud?: string;
    youtube?: string;
    website?: string;
  };
  bio?: string;
  genres?: string[];
  location?: string;
}

export class ArtistPageScraper {
  private baseUrl = 'https://www.amsterdam-dance-event.nl';

  /**
   * Scrape an individual artist page to extract Spotify and social media links
   */
  async scrapeArtistPage(artistUrl: string): Promise<ArtistPageData | null> {
    try {
      console.log(`Scraping artist page: ${artistUrl}`);
      
      const response = await axios.get(artistUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      
      // Extract ADE ID from URL
      const adeIdMatch = artistUrl.match(/\/artists-speakers\/[^\/]+\/(\d+)\/?$/);
      const adeId = adeIdMatch ? parseInt(adeIdMatch[1], 10) : 0;
      
      // Extract title
      const title = $('h1').first().text().trim() || 
                   $('.artist-title').text().trim() ||
                   $('title').text().trim().split(' | ')[0];
      
      // Extract social media links
      const socialLinks = this.extractSocialLinks($);
      
      // Extract Spotify ID from URL
      let spotifyId: string | undefined;
      if (socialLinks.spotify) {
        spotifyId = this.extractSpotifyId(socialLinks.spotify);
      }
      
      // Extract bio/description
      const bio = this.extractBio($);
      
      // Extract genres
      const genres = this.extractGenres($);
      
      // Extract location
      const location = this.extractLocation($);
      
      return {
        adeId,
        title,
        spotifyUrl: socialLinks.spotify,
        spotifyId,
        socialLinks,
        bio,
        genres,
        location
      };
      
    } catch (error) {
      console.error(`Error scraping artist page ${artistUrl}:`, error);
      return null;
    }
  }

  /**
   * Extract social media links from the page
   */
  private extractSocialLinks($: cheerio.CheerioAPI): ArtistPageData['socialLinks'] {
    const socialLinks: ArtistPageData['socialLinks'] = {};
    
    // Look for social media links in various places
    const linkSelectors = [
      'a[href*="spotify.com"]',
      'a[href*="instagram.com"]',
      'a[href*="twitter.com"]',
      'a[href*="facebook.com"]',
      'a[href*="soundcloud.com"]',
      'a[href*="youtube.com"]',
      'a[href*="youtu.be"]',
      'a[href^="http"]:not([href*="amsterdam-dance-event.nl"])'
    ];
    
    // Check social media sections
    const socialSections = [
      '.social-links',
      '.social-media',
      '.artist-social',
      '.social',
      '.links',
      '.external-links'
    ];
    
    for (const section of socialSections) {
      $(section).find('a').each((_, element) => {
        const href = $(element).attr('href');
        if (href) {
          this.categorizeLink(href, socialLinks);
        }
      });
    }
    
    // Check all links on the page
    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (href) {
        this.categorizeLink(href, socialLinks);
      }
    });
    
    return socialLinks;
  }

  /**
   * Categorize a link into the appropriate social media type
   */
  private categorizeLink(href: string, socialLinks: ArtistPageData['socialLinks']): void {
    const url = href.toLowerCase();
    
    if (url.includes('spotify.com/artist/') || url.includes('open.spotify.com/artist/')) {
      socialLinks.spotify = href;
    } else if (url.includes('instagram.com/')) {
      socialLinks.instagram = href;
    } else if (url.includes('twitter.com/') || url.includes('x.com/')) {
      socialLinks.twitter = href;
    } else if (url.includes('facebook.com/')) {
      socialLinks.facebook = href;
    } else if (url.includes('soundcloud.com/')) {
      socialLinks.soundcloud = href;
    } else if (url.includes('youtube.com/') || url.includes('youtu.be/')) {
      socialLinks.youtube = href;
    } else if (!url.includes('amsterdam-dance-event.nl') && 
               !url.includes('mailto:') && 
               !url.includes('tel:') &&
               !url.includes('#') &&
               !socialLinks.website) {
      // First external website link (not social media)
      socialLinks.website = href;
    }
  }

  /**
   * Extract Spotify ID from Spotify URL
   */
  private extractSpotifyId(spotifyUrl: string): string | undefined {
    const patterns = [
      /spotify\.com\/artist\/([a-zA-Z0-9]+)/,
      /open\.spotify\.com\/artist\/([a-zA-Z0-9]+)/,
      /spotify:artist:([a-zA-Z0-9]+)/
    ];
    
    for (const pattern of patterns) {
      const match = spotifyUrl.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return undefined;
  }

  /**
   * Extract bio/description from the page
   */
  private extractBio($: cheerio.CheerioAPI): string | undefined {
    const bioSelectors = [
      '.artist-bio',
      '.bio',
      '.description',
      '.artist-description',
      '.content p',
      '.artist-content p'
    ];
    
    for (const selector of bioSelectors) {
      const bio = $(selector).first().text().trim();
      if (bio && bio.length > 20) {
        return bio;
      }
    }
    
    return undefined;
  }

  /**
   * Extract genres from the page
   */
  private extractGenres($: cheerio.CheerioAPI): string[] {
    const genres: string[] = [];
    
    const genreSelectors = [
      '.genres',
      '.tags',
      '.categories',
      '.artist-genres',
      '.genre-tags'
    ];
    
    for (const selector of genreSelectors) {
      $(selector).find('span, a, .tag, .genre').each((_, element) => {
        const genre = $(element).text().trim();
        if (genre && !genres.includes(genre)) {
          genres.push(genre);
        }
      });
    }
    
    return genres;
  }

  /**
   * Extract location from the page
   */
  private extractLocation($: cheerio.CheerioAPI): string | undefined {
    const locationSelectors = [
      '.location',
      '.artist-location',
      '.country',
      '.origin'
    ];
    
    for (const selector of locationSelectors) {
      const location = $(selector).text().trim();
      if (location) {
        return location;
      }
    }
    
    return undefined;
  }

  /**
   * Scrape multiple artist pages in parallel
   */
  async scrapeMultipleArtists(artistUrls: string[], batchSize: number = 5): Promise<ArtistPageData[]> {
    const results: ArtistPageData[] = [];
    
    for (let i = 0; i < artistUrls.length; i += batchSize) {
      const batch = artistUrls.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(url => this.scrapeArtistPage(url))
      );
      
      results.push(...batchResults.filter(Boolean) as ArtistPageData[]);
      
      // Rate limiting
      if (i + batchSize < artistUrls.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }
}
