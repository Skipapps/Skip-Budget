/**
 * A small brand directory for the parser's tests, rank-ordered like the real one. Rows copy
 * supabase/migrations/20260829100005_brands_with_billers.sql where the brand exists there (Comcast
 * is an alias of Xfinity, iCloud of Apple). 24 Hour Fitness is not in the catalog; it is here for
 * the integer-named merchant cases.
 */
import type { BrandRow } from './types';

function brand(
  id: string,
  name: string,
  domain: string | null,
  category_id: string,
  aliases: string[] = [],
): BrandRow {
  return { id, name, domain, category_id, logo_path: null, aliases };
}

export const DIRECTORY: BrandRow[] = [
  brand('amazon', 'Amazon', 'amazon.com', 'shopping', [
    'amzn',
    'amazon.ca',
    'amazon music unlimited',
    'amazon music',
    'amazon prime',
    'prime',
    'kindle unlimited',
    'kindle',
    'amazon prime video',
    'prime video',
  ]),
  brand('walmart', 'Walmart', 'walmart.com', 'shopping', [
    'wal mart',
    'wm supercenter',
    'walmart+',
    'walmart plus',
    'walmart pharmacy',
  ]),
  brand('netflix', 'Netflix', 'netflix.com', 'entertainment'),
  brand('spotify', 'Spotify', 'spotify.com', 'entertainment'),
  brand('costco', 'Costco', 'costco.com', 'shopping', ['costco membership', 'costco pharmacy']),
  brand('starbucks', 'Starbucks', 'starbucks.com', 'dining'),
  brand('t-mobile', 'T-Mobile', 't-mobile.com', 'telecom', ['tmobile', 't mobile']),
  brand('verizon', 'Verizon', 'verizon.com', 'telecom', ['verizon wireless']),
  brand('target', 'Target', 'target.com', 'shopping'),
  brand('xfinity', 'Xfinity', 'xfinity.com', 'telecom', ['comcast']),
  brand('geico', 'GEICO', 'geico.com', 'insurance'),
  brand('chase', 'Chase', 'chase.com', 'finance', ['jpmorgan chase']),
  brand('american-express', 'American Express', 'americanexpress.com', 'finance', ['amex']),
  brand('google', 'Google', 'one.google.com', 'software', ['google one', 'google play pass']),
  brand('apple', 'Apple', 'apple.com', 'electronics', [
    'apple store',
    'apple',
    'apple tv+',
    'apple tv plus',
    'apple music',
    'icloud+',
    'icloud',
  ]),
  brand('shell', 'Shell', 'shell.com', 'fuel'),
  brand('duke-energy', 'Duke Energy', 'duke-energy.com', 'utilities', ['duke']),
  brand('no-frills', 'No Frills', 'nofrills.ca', 'groceries', ['nofrills']),
  brand('progressive', 'Progressive', 'progressive.com', 'insurance'),
  brand('hulu', 'Hulu', 'hulu.com', 'entertainment'),
  brand('hbo-max', 'HBO Max', 'hbomax.com', 'entertainment', ['max', 'hbo']),
  brand('7-eleven', '7-Eleven', '7-eleven.com', 'fuel', ['7 eleven', 'seven eleven']),
  brand('trader-joe-s', "Trader Joe's", 'traderjoes.com', 'groceries', ['trader joes']),
  brand('cvs', 'CVS', 'cvs.com', 'pharmacy', ['cvs pharmacy']),
  brand('chipotle', 'Chipotle', 'chipotle.com', 'dining'),
  brand('microsoft', 'Microsoft', 'microsoft.com', 'software', [
    'microsoft 365',
    'office 365',
    'office',
  ]),
  brand('uber', 'Uber', 'uber.com', 'memberships', ['uber one', 'uber']),
  brand('doordash', 'DoorDash', 'doordash.com', 'memberships', [
    'doordash dashpass',
    'dashpass',
    'doordash',
  ]),
  brand('planet-fitness', 'Planet Fitness', 'planetfitness.com', 'fitness'),
  brand('dunkin', "Dunkin'", 'dunkindonuts.com', 'dining', ['dunkin']),
  brand('american-water', 'American Water', 'amwater.com', 'utilities'),
  brand('lemonade', 'Lemonade', 'lemonade.com', 'insurance'),
  brand('medium', 'Medium', 'medium.com', 'news'),
  brand('24-hour-fitness', '24 Hour Fitness', '24hourfitness.com', 'fitness'),
];

/** The fixed "today" for tests: Thursday 1 October 2026. */
export const TODAY = '2026-10-01';
