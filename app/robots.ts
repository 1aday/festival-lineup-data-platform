import type { MetadataRoute } from 'next'
import { appBaseUrl } from '@/lib/entity-slugs'

export default function robots(): MetadataRoute.Robots {
  const base = appBaseUrl()
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${base}/sitemap.xml`,
    host: base.replace(/\/$/, ''),
  }
}
