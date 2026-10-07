import type { LogoHints, LogoMatch } from '@/api/logos';

/**
 * The logo service's categories, keyed by the app's spend and bill category ids. The service only
 * weighs these names (others are ignored), so each app id maps to the one it honestly is, and ids
 * with no honest match (housing, water, family, other) are left out rather than guessed.
 */
const SERVICE_CATEGORY: Record<string, string> = {
  // Spend categories with the same name on both sides.
  groceries: 'groceries',
  dining: 'dining',
  fuel: 'fuel',
  pharmacy: 'pharmacy',
  shopping: 'shopping',
  clothing: 'clothing',
  electronics: 'electronics',
  home: 'home',
  beauty: 'beauty',
  pets: 'pets',
  entertainment: 'entertainment',
  software: 'software',
  fitness: 'fitness',
  news: 'news',
  meals: 'meals',
  memberships: 'memberships',
  transport: 'transport',
  telecom: 'telecom',
  insurance: 'insurance',
  // The service files any "utility" under energy, which is what most utility billers are.
  utilities: 'energy',
  finance: 'banking',
  // Bill categories.
  energy: 'energy',
  mobile: 'telecom',
  internet: 'telecom',
  loans: 'banking',
};

/** The service's name for an app category, or undefined when it has no honest match. */
export function logoCategory(appCategory: string | null | undefined): string | undefined {
  return appCategory ? SERVICE_CATEGORY[appCategory] : undefined;
}

/** What to tell the service about a store, from the app's category for it. */
export function logoHints(appCategory: string | null | undefined): LogoHints {
  const category = logoCategory(appCategory);
  return category ? { category } : {};
}

const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const TOP_LEVEL = /^(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/;

/**
 * The bare host in what someone typed as a website, or null when it cannot be one:
 * "https://www.PlanetFitness.com/gyms?x=1" is planetfitness.com. The service matches a host
 * exactly, so anything around it (scheme, www, port, path) would only make it miss.
 */
export function websiteHost(typed: string): string | null {
  const host = typed
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split(/[/?#]/)[0]
    .replace(/^www\./, '')
    .replace(/:\d+$/, '')
    .replace(/\.$/, '');

  if (!host || host.length > 253) return null;
  const labels = host.split('.');
  if (labels.length < 2 || !labels.every((label) => LABEL.test(label))) return null;
  return TOP_LEVEL.test(labels[labels.length - 1]) ? host : null;
}

/** An exact name, alias or website: the brand is known, not guessed from a spelling. */
const EXACT_KINDS = new Set(['alias', 'domain']);

/**
 * The service found this brand by an exact name or website, with no other brand nearly as good:
 * there is nothing to ask. A close spelling ("starbuck") or two plausible brands ("Delta") is still
 * a question, because a wrong logo is worse than letters.
 */
export function isSureMatch(
  match: LogoMatch | null | undefined,
): match is LogoMatch & { domain: string } {
  if (!match?.matched || !match.domain) return false;
  if (!match.kind || !EXACT_KINDS.has(match.kind) || match.confidence < 0.95) return false;
  return !match.candidates.some(
    (candidate) => candidate.domain !== match.domain && candidate.confidence >= 0.8,
  );
}
