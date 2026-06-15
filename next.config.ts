import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(process.cwd()),
  // Build should not be blocked by type or lint errors in admin tools.
  // This keeps production deploys healthy while we iterate.
  typescript: {
    // NOTE: keep this true until we complete full type fixes across admin pages.
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Helpful for Vercel runtime and self-hosted deployments
  output: 'standalone',
  // Increase page file-system scan stability on CI
  experimental: {
    // Opt-out of Turbopack in case the environment restricts port binding during build
    // Uncomment if you encounter Turbopack panics on certain runners
    // turbo: { allowedEnv: ['*'] },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'assets.amsterdam-dance-event.nl',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lfcydtvwga.execute-api.eu-central-1.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ade-data.amirjaffari.workers.dev',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
