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

  let lastError: unknown;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const url = new URL(pathname, cloudflareDataUrl.endsWith('/') ? cloudflareDataUrl : `${cloudflareDataUrl}/`);
    url.searchParams.set('_lbv', dataRequestVersion());

    try {
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Cloudflare data fetch failed: ${response.status} ${url.pathname}`);
      }

      const text = await response.text();
      try {
        return JSON.parse(text) as T;
      } catch {
        return JSON.parse(text.replace(/[\u0000-\u001f]/g, ' ')) as T;
      }
    } catch (error) {
      lastError = error;
      if (attempt < 4) {
        await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Cloudflare data fetch failed');
}
