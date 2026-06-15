const cloudflareDataUrl =
  process.env.ADE_DATA_URL ||
  process.env.NEXT_PUBLIC_ADE_DATA_URL ||
  '';

export function isCloudflareDataConfigured() {
  return /^https?:\/\//.test(cloudflareDataUrl);
}

export async function fetchCloudflareData<T>(pathname: string): Promise<T | null> {
  if (!isCloudflareDataConfigured()) return null;

  const url = new URL(pathname, cloudflareDataUrl.endsWith('/') ? cloudflareDataUrl : `${cloudflareDataUrl}/`);
  const response = await fetch(url, {
    cache: 'no-store',
    headers: { accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Cloudflare data fetch failed: ${response.status} ${url.pathname}`);
  }

  return response.json() as Promise<T>;
}
