import crypto from 'crypto';
import type { NextRequest } from 'next/server';

export function hashSecret(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function safeTrim(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }

  return request.headers.get('x-real-ip') || 'unknown';
}

export function getOriginHost(request: NextRequest): string | null {
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      return new URL(origin).hostname;
    } catch {
      return null;
    }
  }

  const referer = request.headers.get('referer');
  if (referer) {
    try {
      return new URL(referer).hostname;
    } catch {
      return null;
    }
  }

  return null;
}

export function createAccessCode(prefix: string): string {
  const rand = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `${prefix}-${rand}`;
}

export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }

  return s;
}

export function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const columns = Object.keys(rows[0]);
  const header = columns.join(',');
  const body = rows
    .map((row) => columns.map((col) => csvEscape(row[col])).join(','))
    .join('\n');

  return `${header}\n${body}`;
}

export function toDateKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function isFetchFailure(error: unknown): boolean {
  if (!error) return false;

  if (error instanceof Error) {
    return error.message.toLowerCase().includes('fetch failed');
  }

  if (typeof error === 'object' && error !== null) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === 'string') {
      return maybeMessage.toLowerCase().includes('fetch failed');
    }
  }

  return false;
}
