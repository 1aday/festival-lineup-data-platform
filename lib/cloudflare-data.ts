const DEFAULT_DATA_URL = 'https://ade-data.amirjaffari.workers.dev';

const cloudflareDataUrl =
  process.env.ADE_DATA_URL ||
  process.env.NEXT_PUBLIC_ADE_DATA_URL ||
  DEFAULT_DATA_URL;

export function isCloudflareDataConfigured() {
  return /^https?:\/\//.test(cloudflareDataUrl);
}

function dataRequestVersion() {
  if (process.env.ADE_DATA_VERSION) return process.env.ADE_DATA_VERSION;
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA;
  return String(Math.floor(Date.now() / 60_000));
}

export async function fetchCloudflareData<T>(pathname: string): Promise<T | null> {
  if (!isCloudflareDataConfigured()) return null;

  const url = new URL(pathname, cloudflareDataUrl.endsWith('/') ? cloudflareDataUrl : `${cloudflareDataUrl}/`);
  url.searchParams.set('_lbv', dataRequestVersion());
  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      accept: 'application/json',
      'cache-control': 'no-cache',
      pragma: 'no-cache',
    },
  });

  if (!response.ok) {
    throw new Error(`Cloudflare data fetch failed: ${response.status} ${url.pathname}`);
  }

  return response.json() as Promise<T>;
}
