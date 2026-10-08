/**
 * Which bill category, for bills only. The ids are copied from BILL_CATEGORIES in
 * src/data/bill-categories.ts rather than imported (that module pulls in lucide icons); the test fails
 * if the two lists differ.
 *
 * Order of evidence:
 * 1. Spoken words always win. When several are said, the more specific head noun wins (insurance
 *    and loans, then housing and family, then the utilities), then the one said first: "car
 *    insurance" is insurance, "rent and electric" is housing.
 * 2. A known biller suggests one when no word did (Comcast -> internet, GEICO -> insurance), only
 *    where the company has one obvious category; Verizon and AT&T sell phone and internet, so
 *    suggest nothing. It is a pre-fill the review page shows for a tap, not an override.
 * 3. Otherwise null, and the review page asks.
 */
import type { Token } from './clean';
import type { BrandRow } from './types';

export const BILL_CATEGORY_IDS = [
  'housing',
  'energy',
  'water',
  'internet',
  'mobile',
  'insurance',
  'loans',
  'transport',
  'family',
  'other',
] as const;

export type BillCategoryId = (typeof BILL_CATEGORY_IDS)[number];

/**
 * How a word bears on the kind, as well as the category:
 * - strong: decides "bill" on its own ("rent", "electric", "insurance");
 * - weak: decides "bill" unless a purchase word is there ("bought water");
 * - none: only names the category once something else made it a bill.
 */
export type Signal = 'strong' | 'weak' | 'none';

type Entry = { words: string[]; category: BillCategoryId; signal: Signal };

const HEAD_RANK: Record<BillCategoryId, number> = {
  insurance: 3,
  loans: 3,
  housing: 2,
  family: 2,
  energy: 1,
  water: 1,
  internet: 1,
  mobile: 1,
  transport: 1,
  other: 0,
};

function entries(category: BillCategoryId, signal: Signal, phrases: string[]): Entry[] {
  return phrases.map((phrase) => ({ words: phrase.split(' '), category, signal }));
}

/** Longest phrases first, so "gas bill" beats "gas" and "home loan" beats "loan". */
const ENTRIES: Entry[] = [
  ...entries('housing', 'strong', [
    'rent',
    'rents',
    'rent payment',
    'mortgage',
    'mortgages',
    'home loan',
    'hoa',
    'h o a',
    'homeowners association',
    'home owners association',
    'condo fee',
    'condo fees',
    'strata',
    'property tax',
    'property taxes',
    'landlord',
  ]),
  ...entries('energy', 'strong', [
    'electric',
    'electricity',
    'power bill',
    'gas bill',
    'natural gas',
    'gas and electric',
    'gas company',
    'energy bill',
    'hydro',
  ]),
  ...entries('energy', 'weak', ['power', 'heating', 'heating oil', 'propane']),
  ...entries('water', 'strong', ['water bill', 'sewer', 'sewage']),
  ...entries('water', 'weak', ['water', 'trash', 'garbage', 'recycling']),
  ...entries('internet', 'strong', ['internet', 'wifi', 'wi fi', 'broadband']),
  ...entries('internet', 'weak', ['cable', 'cable tv']),
  ...entries('internet', 'none', ['fiber', 'fios']),
  ...entries('mobile', 'strong', ['phone bill', 'phone plan', 'cell bill', 'cell phone bill']),
  ...entries('mobile', 'weak', ['phone', 'cell phone', 'cellphone', 'cell', 'mobile', 'wireless']),
  ...entries('insurance', 'strong', ['insurance']),
  ...entries('loans', 'strong', [
    'loan',
    'loans',
    'car payment',
    'car note',
    'credit card bill',
    'credit card payment',
    'card payment',
    'minimum payment',
    'line of credit',
  ]),
  ...entries('loans', 'none', ['credit card']),
  ...entries('transport', 'strong', ['car lease']),
  ...entries('transport', 'weak', [
    'bus pass',
    'transit pass',
    'metro pass',
    'train pass',
    'parking pass',
    'parking permit',
  ]),
  ...entries('transport', 'none', ['toll', 'tolls', 'parking', 'transit']),
  ...entries('family', 'strong', [
    'daycare',
    'day care',
    'childcare',
    'child care',
    'tuition',
    'school fees',
    'child support',
    'medical bill',
    'hospital bill',
    'doctor bill',
    'dental bill',
  ]),
  ...entries('family', 'weak', ['nanny', 'babysitter']),
].sort((a, b) => b.words.length - a.words.length);

/**
 * One-word category names. Words inside longer phrases ("car", "home") are left out: they may be a
 * shop's name.
 */
export const SINGLE_CATEGORY_WORDS = new Set(
  ENTRIES.filter((entry) => entry.words.length === 1).map((entry) => entry.words[0]),
);

export type CategorySpan = {
  start: number;
  end: number;
  category: BillCategoryId;
  signal: Signal;
};

/** Every category phrase in the usable tokens, longest match first at each position. */
export function findCategoryWords(
  tokens: readonly Token[],
  usable: (index: number) => boolean,
): CategorySpan[] {
  const found: CategorySpan[] = [];
  for (let index = 0; index < tokens.length;) {
    const entry = ENTRIES.find((candidate) =>
      candidate.words.every(
        (word, offset) => usable(index + offset) && tokens[index + offset]?.key === word,
      ),
    );
    if (entry) {
      found.push({
        start: index,
        end: index + entry.words.length,
        category: entry.category,
        signal: entry.signal,
      });
      index += entry.words.length;
    } else {
      index += 1;
    }
  }
  return found;
}

/** The category the words name: most specific head noun, then first said. */
export function categoryFromWords(spans: readonly CategorySpan[]): BillCategoryId | null {
  let best: CategorySpan | null = null;
  for (const span of spans) {
    if (!best || HEAD_RANK[span.category] > HEAD_RANK[best.category]) best = span;
  }
  return best ? best.category : null;
}

const INTERNET_BRANDS = new Set([
  'xfinity',
  'spectrum',
  'cox',
  'optimum',
  'frontier',
  'centurylink',
  'starlink',
  'google-fiber',
  'astound-broadband',
  'wow',
  'windstream',
]);

const MOBILE_BRANDS = new Set([
  't-mobile',
  'mint-mobile',
  'cricket-wireless',
  'boost-mobile',
  'metro-by-t-mobile',
  'google-fi',
  'visible',
  'uscellular',
  'straight-talk',
]);

const WATER_BRANDS = new Set(['american-water', 'republic-services', 'waste-management']);

/** The category a known biller suggests, or null when it has no single obvious one. */
export function categoryFromBrand(
  brand: Pick<BrandRow, 'id' | 'category_id'> | null,
): BillCategoryId | null {
  if (!brand) return null;
  switch (brand.category_id) {
    case 'insurance':
      return 'insurance';
    case 'finance':
      return 'loans';
    case 'utilities':
      return WATER_BRANDS.has(brand.id) ? 'water' : 'energy';
    case 'telecom':
      if (INTERNET_BRANDS.has(brand.id)) return 'internet';
      if (MOBILE_BRANDS.has(brand.id)) return 'mobile';
      return null;
    default:
      return null;
  }
}
