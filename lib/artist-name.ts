import { countryNameToISO } from './country-mapping';

const KNOWN_COUNTRY_CODES = new Set(
  Object.values(countryNameToISO || {}).map(code => code.toUpperCase())
);

const COUNTRY_LABEL_TO_ISO = new Map(
  Object.entries(countryNameToISO || {}).map(([name, code]) => [name.toLowerCase(), code])
);

const KNOWN_COUNTRY_ABBREVIATIONS: Record<string, string> = {
  USA: 'US',
  UAE: 'AE',
  UK: 'GB',
};

const escapeRegExp = (value: string) => value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

export function stripCountrySuffix(
  name: string,
  countryCode?: string | null,
  countryLabel?: string | null
): string {
  if (!name) return name;

  let sanitized = name.trim();
  const candidates = new Set<string>();

  if (countryCode) {
    candidates.add(countryCode.toUpperCase());
  }

  if (countryLabel) {
    const normalizedLabel = countryLabel.trim();
    candidates.add(normalizedLabel.toUpperCase());
    const derivedCode = COUNTRY_LABEL_TO_ISO.get(normalizedLabel.toLowerCase());
    if (derivedCode) {
      candidates.add(derivedCode.toUpperCase());
    }
  }

  for (const candidate of candidates) {
    if (!candidate) continue;
    const pattern = new RegExp(`\\s*\\(${escapeRegExp(candidate)}\\)$`, 'i');
    if (pattern.test(sanitized)) {
      sanitized = sanitized.replace(pattern, '').trim();
    }
  }

  const fallbackMatch = sanitized.match(/\s*\(([A-Z]{2,3})\)$/);
  if (fallbackMatch) {
    const suffix = fallbackMatch[1].toUpperCase();
    if (
      KNOWN_COUNTRY_CODES.has(suffix) ||
      Object.prototype.hasOwnProperty.call(KNOWN_COUNTRY_ABBREVIATIONS, suffix)
    ) {
      sanitized = sanitized.slice(0, sanitized.length - fallbackMatch[0].length).trim();
    }
  }

  return sanitized;
}

export const sanitizeArtistName = stripCountrySuffix;
