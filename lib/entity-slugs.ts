export function slugifyEntity(value: string | null | undefined, id?: number | string | null) {
  const base = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item';

  return id ? `${base}-${id}` : base;
}

export function parseEntitySlug(slug: string) {
  const match = slug.match(/-(\d+)$/);
  return {
    id: match ? Number(match[1]) : null,
    baseSlug: match ? slug.slice(0, -match[0].length) : slug,
  };
}

export function appBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (explicit && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(explicit)) {
    return explicit;
  }

  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercelHost) {
    return `https://${vercelHost.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;
  }

  return (explicit || 'https://ade-eta.vercel.app').replace(/\/$/, '');
}

export function absoluteUrl(pathname: string) {
  return `${appBaseUrl()}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}
