import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(process.cwd()),
  // Helpful for Vercel runtime and self-hosted deployments.
  output: 'standalone',
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
    ],
  },
};

export default nextConfig;
