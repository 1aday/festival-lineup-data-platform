import type { MetadataRoute } from 'next'
import {
  appBaseUrl,
  artistPath,
  countryGenrePath,
  countryPath,
  eventPath,
  getCountryIndex,
  getCountryGenreIndex,
  getExpandedGenreIndex,
  getEligibleSeoArtists,
  getEligibleSeoEvents,
  getVenueIndex,
  genrePath,
  venuePath,
} from '@/lib/seo-data'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appBaseUrl()
  const now = new Date()

  const staticRoutes = [
    '/',
    '/artists',
    '/countries',
    '/events',
    '/genres',
    '/rising-artists',
    '/festivals/amsterdam-dance-event',
    '/schedule',
    '/insights',
    '/concierge',
    '/monetize',
    '/data',
  ]

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: path === '/' ? 1 : path === '/festivals/amsterdam-dance-event' ? 0.9 : path === '/artists' || path === '/events' || path === '/genres' ? 0.85 : 0.65,
  }))

  const [artists, events, venues, countries, genres, countryGenres] = await Promise.all([
    getEligibleSeoArtists(),
    getEligibleSeoEvents(),
    getVenueIndex(),
    getCountryIndex(),
    getExpandedGenreIndex(),
    getCountryGenreIndex(),
  ])

  const artistEntries: MetadataRoute.Sitemap = artists.map((artist) => ({
    url: `${base}${artistPath(artist)}`,
    lastModified: artist.last_updated_at ? new Date(artist.last_updated_at) : now,
    changeFrequency: 'weekly',
    priority: artist.image_url ? 0.74 : 0.66,
  }))

  const eventEntries: MetadataRoute.Sitemap = events.map((event) => ({
    url: `${base}${eventPath(event)}`,
    lastModified: event.last_updated_at ? new Date(event.last_updated_at) : now,
    changeFrequency: 'weekly',
    priority: 0.76,
  }))

  const venueEntries: MetadataRoute.Sitemap = venues.map((venue) => ({
    url: `${base}${venuePath(venue.name)}`,
    lastModified: venue.lastModified,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const countryEntries: MetadataRoute.Sitemap = countries.map((country) => ({
    url: `${base}${countryPath(country.label)}`,
    lastModified: country.lastModified,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const genreEntries: MetadataRoute.Sitemap = genres.map((genre) => ({
    url: `${base}${genrePath(genre)}`,
    lastModified: genre.lastModified,
    changeFrequency: 'weekly',
    priority: 0.72,
  }))

  const countryGenreEntries: MetadataRoute.Sitemap = countryGenres.map((row) => ({
    url: `${base}${countryGenrePath(row.country.label, row.genre.label)}`,
    lastModified: row.lastModified,
    changeFrequency: 'weekly',
    priority: row.artistCount >= 20 ? 0.74 : 0.68,
  }))

  const similarArtistEntries: MetadataRoute.Sitemap = artists
    .filter((artist) => artist.spotify_id && (artist.all_genres || artist.primary_genres))
    .slice(0, 2500)
    .map((artist) => ({
      url: `${base}${artistPath(artist)}/similar`,
      lastModified: artist.spotify_last_updated ? new Date(artist.spotify_last_updated) : artist.last_updated_at ? new Date(artist.last_updated_at) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.62,
    }))

  return [
    ...staticEntries,
    ...artistEntries,
    ...eventEntries,
    ...venueEntries,
    ...countryEntries,
    ...genreEntries,
    ...countryGenreEntries,
    ...similarArtistEntries,
  ]
}
