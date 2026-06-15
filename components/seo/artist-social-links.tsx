import Link from 'next/link';

import { getArtistSocialLinks, type ArtistWithSocials } from '@/lib/artist-socials';

type ArtistSocialLinksProps = {
  artist: ArtistWithSocials;
  limit?: number;
  heading?: string;
  compact?: boolean;
};

export function ArtistSocialLinks({ artist, limit, heading, compact = false }: ArtistSocialLinksProps) {
  const links = getArtistSocialLinks(artist).slice(0, limit || undefined);
  if (!links.length) return null;

  return (
    <div className={compact ? 'mt-3' : ''}>
      {heading ? <p className="text-xs uppercase text-muted-foreground">{heading}</p> : null}
      <div className={`flex flex-wrap gap-2 ${heading ? 'mt-2' : ''}`}>
        {links.map((link) => (
          <Link
            key={`${link.key}:${link.url}`}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
