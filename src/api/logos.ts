import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getLocales } from 'expo-localization';
import { useMemo } from 'react';

/**
 * Skip Logos, our own name-to-logo service. `resolve` finds the brand behind a typed name;
 * `report` flags a wrong logo for a human to fix for everyone; images are plain public URLs.
 *
 * Nothing here throws: a missing logo is drawn as letters, so a failed lookup is an answer, not
 * an error state. The app key only keeps casual scrapers off `resolve`; it ships in the bundle
 * and is not a secret, but it is still never logged.
 */

export type LogoCandidate = { domain: string; name: string; confidence: number };

export type LogoMatch = {
  /** False when the service is not confident: show letters, not a guess. */
  matched: boolean;
  name: string | null;
  domain: string | null;
  /** 0..1. */
  confidence: number;
  /** Gap to the runner-up; small with several candidates means ambiguous. */
  margin: number;
  /** The next-best brands, for "Not this one?". */
  candidates: LogoCandidate[];
};

export type LogoHints = { country?: string; category?: string };

/** A lookup can make the service fetch other sites, so give it time, but not forever. */
const RESOLVE_TIMEOUT_MS = 10_000;
const REPORT_TIMEOUT_MS = 10_000;

const MAX_CANDIDATES = 8;

// Direct `process.env.EXPO_PUBLIC_…` reads: the only form Metro inlines into the bundle.
function apiBase(): string | null {
  return process.env.EXPO_PUBLIC_LOGO_API_URL?.trim().replace(/\/+$/, '') || null;
}

function cdnBase(): string | null {
  return process.env.EXPO_PUBLIC_LOGO_CDN_URL?.trim().replace(/\/+$/, '') || null;
}

function appKeyHeader(): Record<string, string> {
  const key = process.env.EXPO_PUBLIC_LOGO_API_KEY?.trim();
  return key ? { 'x-app-key': key } : {};
}

/**
 * fetch and read the answer within one deadline (the body too, not just the headers). A caller's
 * signal (a query being cancelled) aborts it as well. Null instead of a rejection, because every
 * caller here treats "no answer" the same way.
 */
async function fetchWithin<T>(
  url: string,
  init: RequestInit,
  ms: number,
  read: (response: Response) => Promise<T> | T,
  outer?: AbortSignal,
): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  const cancel = () => controller.abort();
  outer?.addEventListener('abort', cancel);
  try {
    if (outer?.aborted) return null;
    const response = await fetch(url, { ...init, signal: controller.signal });
    return await read(response);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    outer?.removeEventListener('abort', cancel);
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A bare host name, the only thing that is safe to put in an image URL's path. */
function cleanDomain(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const domain = value.trim().toLowerCase();
  return domain.length <= 253 && /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain) ? domain : null;
}

function cleanName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return value.trim().slice(0, 200) || null;
}

const unit = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

/**
 * The service's JSON, checked field by field. A match must name a usable domain or it is not a
 * match; a malformed candidate is dropped rather than failing the whole answer.
 */
function readLogoMatch(raw: unknown): LogoMatch | null {
  if (!isRecord(raw) || typeof raw.matched !== 'boolean') return null;

  const candidates: LogoCandidate[] = [];
  for (const item of Array.isArray(raw.candidates) ? raw.candidates : []) {
    if (!isRecord(item)) continue;
    const domain = cleanDomain(item.domain);
    const name = cleanName(item.name);
    if (!domain || !name) continue;
    candidates.push({ domain, name, confidence: unit(item.confidence) });
    if (candidates.length === MAX_CANDIDATES) break;
  }

  const domain = cleanDomain(raw.domain);
  const name = cleanName(raw.name);
  const matched = raw.matched && domain !== null;

  return {
    matched,
    name: matched ? name : null,
    domain: matched ? domain : null,
    confidence: unit(raw.confidence),
    margin: unit(raw.margin),
    candidates,
  };
}

/**
 * The brand behind a typed name (or a typed website, which skips name matching). `country` (ISO
 * code) and `category` (the app's spend category id) separate same-named brands. Null on any
 * failure: not configured, offline, timed out, refused, or an answer that does not parse.
 */
export async function resolveLogo(
  query: string,
  hints: LogoHints,
  signal?: AbortSignal,
): Promise<LogoMatch | null> {
  const base = apiBase();
  const q = query.trim();
  if (!base || !q) return null;

  // Built by hand so a space is %20 for every parser, not '+'.
  const params = [
    ['q', q],
    ['country', hints.country?.trim()],
    ['category', hints.category?.trim()],
  ]
    .filter((pair): pair is [string, string] => Boolean(pair[1]))
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');

  return fetchWithin(
    `${base}/v1/resolve?${params}`,
    { headers: { accept: 'application/json', ...appKeyHeader() } },
    RESOLVE_TIMEOUT_MS,
    async (response) => (response.ok ? readLogoMatch(await response.json()) : null),
    signal,
  );
}

/**
 * The device's Region setting as an ISO country code, which tells same-named brands in different
 * countries apart. Undefined when there is none, or it is not a two-letter code worth sending.
 */
export function deviceCountry(): string | undefined {
  try {
    const region = getLocales()[0]?.regionCode;
    return region && /^[A-Z]{2}$/.test(region) ? region : undefined;
  } catch {
    return undefined;
  }
}

const RESOLVED_FOR = 30 * 60 * 1000;

/**
 * resolveLogo as a query. Pass the settled name (on blur, or the name being confirmed), not every
 * keystroke: each new name can make the service look a brand up on the web.
 *
 * Without a country hint, the device's region is sent (and keys the cache).
 *
 * `data` is null when the lookup failed. That is cached only until the next mount or focus, so a
 * dropped connection does not pin letters on a store for half an hour; a real answer is kept for
 * 30 minutes. Never retried in a loop.
 */
export function useLogoMatch(query: string, hints: LogoHints): UseQueryResult<LogoMatch | null> {
  const needle = query.trim();
  // Read once per mount: a native call, and the region does not change while a form is open.
  const device = useMemo(() => deviceCountry(), []);
  const country = hints.country?.trim() || device || null;
  const category = hints.category?.trim() || null;

  return useQuery({
    queryKey: ['logo-match', needle.toLowerCase(), country, category],
    // One character matches nothing useful and would still cost the service a lookup.
    enabled: needle.length >= 2,
    staleTime: (cached) => (cached.state.data == null ? 0 : RESOLVED_FOR),
    retry: false,
    queryFn: ({ signal }) =>
      resolveLogo(
        needle,
        { country: country ?? undefined, category: category ?? undefined },
        signal,
      ),
  });
}

/**
 * "This logo is wrong" for the review queue. The fix is made once, for everyone, by uploading the
 * right logo to the service; the person's own row is fixed separately with useSetRowLogo. True
 * when the service took the report.
 */
export async function reportWrongLogo(input: { domain: string; query?: string }): Promise<boolean> {
  const base = apiBase();
  const domain = cleanDomain(input.domain);
  if (!base || !domain) return false;

  const accepted = await fetchWithin(
    `${base}/v1/report`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...appKeyHeader() },
      body: JSON.stringify({
        domain,
        query: input.query?.trim() || undefined,
        reason: 'wrong logo (app)',
      }),
    },
    REPORT_TIMEOUT_MS,
    (response) => response.ok,
  );
  return accepted ?? false;
}

/**
 * Where a domain's logo image lives: the CDN when one is configured, else the service's own image
 * route (both key-free). A 404 means there is no logo and the caller draws letters. Null when
 * there is no domain or nowhere to load from.
 */
export function logoImageUrl(domain: string | null | undefined): string | null {
  const host = domain?.trim().toLowerCase();
  if (!host) return null;
  const api = apiBase();
  const base = cdnBase() ?? (api ? `${api}/v1/logo` : null);
  if (!base) return null;
  return `${base}/${encodeURIComponent(host)}`;
}
