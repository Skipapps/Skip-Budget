/**
 * Step 5: who was paid.
 *
 * Four passes, strict to loose, each on words nothing else has claimed:
 *
 * 1. **Learned aliases** the person taught Skip ("spot a fly" → Spotify). Read
 *    over the same words as pass 2; where both match, the longer wins and a
 *    tie goes to the catalog (`preferCatalog`), so a learned phrase never turns
 *    a store the catalog knows into another one.
 * 2. **Exact** directory names and aliases, matched on whole words with the
 *    spaces ignored, so "star bucks", "Starbucks", "T-Mobile", "t mobile"
 *    and "tmobile" agree, and with number words read as digits, so
 *    "seven eleven" finds 7-Eleven and "twenty four hour fitness" finds
 *    24 Hour Fitness. This runs *before* amounts and dates, so the 7 and the
 *    24 in those names are never read as money.
 * 3. **Fuzzy**, for the recogniser's mishearings ("spot a fly", "come cast"),
 *    using the app's own search rule (`matchesSearch`, src/lib/search.ts):
 *    one letter mistake from four letters, two from seven. Only two- or
 *    three-word stretches (see FUZZY_WORDS_MIN), only names of six letters
 *    or more, only when the first letter agrees, and both ways round so a
 *    longer phrase cannot swallow a short name.
 * 4. **A name after "at" or "from"** that the directory does not know
 *    ("at Joe's Diner"), filed with the same category guess the store field
 *    uses for a typed name.
 *
 * ## Everyday words that are also brands
 * Some names and aliases are ordinary words: Shell, Apple, Chase, Root,
 * Medium, Lemonade, "office" (Microsoft), "max" (HBO Max), "prime" (Amazon).
 * Those count only with a sign they mean the company: "at"/"from"/"to"/
 * "with" in front ("at Shell"), or a word like insurance, bank, card or app
 * after ("Progressive insurance", "Chase card"). "A medium coffee" stays a
 * coffee.
 *
 * `matchBrand` and `guessCategory` in src/api/brands.ts are not imported:
 * that module loads Supabase and React Query at runtime. The category guess
 * is mirrored below and pinned to the original by catalog.test.ts.
 */
import { matchesSearch } from '@/lib/search';

import { findAliasSpans } from './aliases';
import { joinKeys, tokenize, type Token } from './clean';
import { readGroup } from './numbers';
import type { BrandRow, VoiceMerchant, VoiceMerchantSource } from './types';
import { isPlainWord, TRIGGER_WORDS } from './words';

/** Same rules, same order as KEYWORD_CATEGORIES in src/api/brands.ts. */
const KEYWORD_CATEGORIES: [RegExp, string][] = [
  [/\b(market|grocer|grocery|supermarket|foods?|produce|butcher|bakery)\b/i, 'groceries'],
  [
    /\b(cafe|coffee|espresso|restaurant|grill|pizza|sushi|diner|bar|kitchen|bistro|deli)\b/i,
    'dining',
  ],
  [/\b(gas|fuel|petro|petrol|station|convenience)\b/i, 'fuel'],
  [/\b(pharmacy|drug|drugs|chemist|clinic|dental|dentist|medical|health)\b/i, 'pharmacy'],
  [/\b(salon|spa|barber|nails?|beauty|cosmetics)\b/i, 'beauty'],
  [/\b(vet|veterinary|pet|pets)\b/i, 'pets'],
  [/\b(gym|fitness|yoga|pilates|crossfit)\b/i, 'fitness'],
  [/\b(hardware|lumber|builders?|paint|garden|furniture)\b/i, 'home'],
  [/\b(electronics|computers?|phone|mobile|tech)\b/i, 'electronics'],
  [/\b(clothing|apparel|boutique|shoes?|fashion)\b/i, 'clothing'],
  [/\b(parking|transit|taxi|rail|airlines?|airways)\b/i, 'transport'],
];

/** The store field's guess for a name the catalog does not know. */
export function guessSpendCategory(name: string): string {
  const found = KEYWORD_CATEGORIES.find(([pattern]) => pattern.test(name));
  return found ? found[1] : 'other';
}

/** Names (spaces ignored) that are also everyday words; they need a sign they mean the company. */
const COMMON_WORDS = new Set([
  'ace',
  'ally',
  'apple',
  'arlo',
  'athletic',
  'boost',
  'bumble',
  'calm',
  'charter',
  'chase',
  'claude',
  'coop',
  'crave',
  'cricket',
  'crunch',
  'discover',
  'dominion',
  'duke',
  'factor',
  'farmers',
  'frontier',
  'gap',
  'goodfood',
  'hinge',
  'independent',
  'irving',
  'kindle',
  'kinetic',
  'lemonade',
  'lulu',
  'lush',
  'mac',
  'match',
  'max',
  'medium',
  'metro',
  'mint',
  'nationwide',
  'nest',
  'notion',
  'office',
  'optimum',
  'prime',
  'progressive',
  'republic',
  'ring',
  'root',
  'ross',
  'shell',
  'shoppers',
  'smiths',
  'spectrum',
  'sprouts',
  'staples',
  'subway',
  'superstore',
  'travelers',
  'visible',
  'wave',
  'winners',
  'wow',
  'x',
  'zoom',
]);

const LEAD_WORDS = new Set(['at', 'from', 'to', 'with', 'via', 'through']);
const SKIPPABLE = new Set(['the', 'my', 'a', 'an']);
const BRAND_NOUNS = new Set([
  'insurance',
  'bank',
  'card',
  'credit',
  'mobile',
  'wireless',
  'internet',
  'cable',
  'energy',
  'electric',
  'power',
  'app',
  'subscription',
  'membership',
  'store',
  'station',
  'account',
  'bill',
  'payment',
  'plus',
  'premium',
  'pharmacy',
  'gas',
  'music',
  'tv',
  'fiber',
  'phone',
  'plan',
  'loan',
  'mortgage',
  'savings',
  'checking',
]);

/** Places that are not a shop's name: "at the store" names no one. */
const GENERIC_PLACES = new Set([
  'store',
  'shop',
  'mall',
  'market',
  'supermarket',
  'restaurant',
  'cafe',
  'bar',
  'station',
  'gas station',
  'place',
  'work',
  'home',
  'school',
  'office',
  'airport',
  'hospital',
  'pharmacy',
  'doctor',
  'doctors',
  'dentist',
  'gym',
  'bank',
  'atm',
  'online',
  'checkout',
  'counter',
  'drive thru',
  'drive through',
  'corner store',
  'grocery store',
]);

type Variant = {
  brand: BrandRow;
  /** Directory position; the directory is rank-ordered, so lower is more prominent. */
  order: number;
  isName: boolean;
  joined: string;
  digits: string;
  common: boolean;
};

type BrandIndex = {
  byJoined: Map<string, Variant[]>;
  byDigits: Map<string, Variant[]>;
  fuzzy: Variant[];
};

/**
 * "twenty four hour fitness" → "24hourfitness", "seven eleven" → "711",
 * "7-Eleven" → "711": number words and digits read the same way on both
 * sides, so a name with a number in it matches however it was said.
 */
function digitKey(tokens: readonly Token[], start: number, end: number): string {
  let key = '';
  const inside = (index: number) => index >= start && index < end;
  for (let index = start; index < end;) {
    const group = readGroup(tokens, index, inside);
    if (group && group.whole !== null && !group.dollar) {
      key += String(group.whole);
      index = group.end;
    } else {
      key += tokens[index].key;
      index += 1;
    }
  }
  return key;
}

/**
 * Fuzzy matching reads two or three words, never one. iOS writes real words,
 * so its mishearing of a brand comes out as several ("spot a fly", "come
 * cast", "net flicks"); a single word one letter off a brand is far more
 * often just that word ("safety" is not Safeway, "public" is not Publix,
 * "fitness" is not Fit4Less). Names with digits are matched exactly only.
 */
const FUZZY_WORDS_MIN = 2;
const FUZZY_WORDS_MAX = 3;
const FUZZY_MIN = 6;

const indexCache = new WeakMap<readonly BrandRow[], BrandIndex>();

function push(map: Map<string, Variant[]>, key: string, variant: Variant) {
  const list = map.get(key);
  if (list) list.push(variant);
  else map.set(key, [variant]);
}

function brandIndex(directory: readonly BrandRow[]): BrandIndex {
  const cached = indexCache.get(directory);
  if (cached) return cached;

  const index: BrandIndex = { byJoined: new Map(), byDigits: new Map(), fuzzy: [] };
  directory.forEach((brand, order) => {
    if (!brand || typeof brand.id !== 'string' || typeof brand.name !== 'string') return;
    const aliases = Array.isArray(brand.aliases) ? brand.aliases : [];
    [brand.name, ...aliases].forEach((name, position) => {
      if (typeof name !== 'string') return;
      const tokens = tokenize(name);
      const joined = joinKeys(tokens, 0, tokens.length);
      if (joined.length < 2) return;
      const variant: Variant = {
        brand,
        order,
        isName: position === 0,
        joined,
        digits: digitKey(tokens, 0, tokens.length),
        common: COMMON_WORDS.has(joined),
      };
      push(index.byJoined, joined, variant);
      push(index.byDigits, variant.digits, variant);
      if (!variant.common && joined.length >= FUZZY_MIN && /^[a-z]+$/.test(joined)) {
        index.fuzzy.push(variant);
      }
    });
  });
  indexCache.set(directory, index);
  return index;
}

/** Whether an everyday-word brand at [start, end) is clearly the company. */
function namedAsCompany(tokens: readonly Token[], start: number, end: number): boolean {
  let before = start - 1;
  while (before >= 0 && SKIPPABLE.has(tokens[before].key)) before -= 1;
  if (before >= 0 && LEAD_WORDS.has(tokens[before].key)) return true;
  return BRAND_NOUNS.has(tokens[end]?.key ?? '');
}

function best(variants: Variant[]): Variant {
  return [...variants].sort((a, b) => Number(b.isName) - Number(a.isName) || a.order - b.order)[0];
}

function brandMerchant(brand: BrandRow): VoiceMerchant {
  return {
    brandId: brand.id,
    name: brand.name,
    domain: typeof brand.domain === 'string' ? brand.domain : null,
    categoryId: typeof brand.category_id === 'string' ? brand.category_id : 'other',
  };
}

function freeMerchant(name: string): VoiceMerchant {
  return { brandId: null, name, domain: null, categoryId: guessSpendCategory(name) };
}

function titleCase(words: string[]): string {
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export type MerchantSource = VoiceMerchantSource;

export type MerchantSpan = {
  start: number;
  end: number;
  merchant: VoiceMerchant;
  /** Category of the directory brand behind it, for the kind rules; null for a typed name. */
  brandCategory: string | null;
  heard: string;
  source: MerchantSource;
};

function heardText(tokens: readonly Token[], start: number, end: number): string {
  return tokens
    .slice(start, end)
    .map((token) => token.text)
    .join(' ');
}

type Usable = (index: number) => boolean;

function allUsable(usable: Usable, start: number, end: number): boolean {
  for (let index = start; index < end; index += 1) if (!usable(index)) return false;
  return true;
}

/** Pass 1: learned aliases. The name they point to is looked up in the directory. */
export function findLearnedMerchants(
  tokens: readonly Token[],
  aliases: Record<string, string>,
  directory: readonly BrandRow[],
  usable: Usable,
): MerchantSpan[] {
  const index = brandIndex(directory);
  return findAliasSpans(tokens, aliases, usable).map((span) => {
    const nameTokens = tokenize(span.canonical);
    const known = index.byJoined.get(joinKeys(nameTokens, 0, nameTokens.length));
    const brand = known ? best(known).brand : null;
    return {
      start: span.start,
      end: span.end,
      merchant: brand ? brandMerchant(brand) : freeMerchant(span.canonical),
      brandCategory: brand ? brand.category_id : null,
      heard: heardText(tokens, span.start, span.end),
      source: 'learned' as const,
    };
  });
}

const EXACT_WINDOW = 6;

/** Pass 2: exact names and aliases, longest first, left to right. */
export function findExactMerchants(
  tokens: readonly Token[],
  directory: readonly BrandRow[],
  usable: Usable,
): MerchantSpan[] {
  const index = brandIndex(directory);
  const found: MerchantSpan[] = [];
  for (let start = 0; start < tokens.length; start += 1) {
    for (let length = Math.min(EXACT_WINDOW, tokens.length - start); length >= 1; length -= 1) {
      const end = start + length;
      if (!allUsable(usable, start, end)) continue;
      const hits = [
        ...(index.byJoined.get(joinKeys(tokens, start, end)) ?? []),
        ...(index.byDigits.get(digitKey(tokens, start, end)) ?? []),
      ].filter((variant) => !variant.common || namedAsCompany(tokens, start, end));
      if (hits.length === 0) continue;
      const { brand } = best(hits);
      found.push({
        start,
        end,
        merchant: brandMerchant(brand),
        brandCategory: brand.category_id,
        heard: heardText(tokens, start, end),
        source: 'catalog',
      });
      start = end - 1;
      break;
    }
  }
  return found;
}

/** Pass 3: near misses, both ways round through matchesSearch. */
export function findFuzzyMerchants(
  tokens: readonly Token[],
  directory: readonly BrandRow[],
  usable: Usable,
): MerchantSpan[] {
  const index = brandIndex(directory);
  type Hit = { start: number; end: number; variant: Variant; gap: number };
  const hits: Hit[] = [];

  for (let start = 0; start < tokens.length; start += 1) {
    if (!isPlainWord(tokens[start]) || !usable(start)) continue;
    for (
      let length = 1;
      length <= FUZZY_WORDS_MAX && start + length <= tokens.length;
      length += 1
    ) {
      const end = start + length;
      if (!allUsable(usable, start, end)) break;
      const inner = tokens.slice(start, end);
      if (inner.some((token) => token.type !== 'word' || TRIGGER_WORDS.has(token.key))) break;
      if (length < FUZZY_WORDS_MIN || !isPlainWord(tokens[end - 1])) continue;

      const heard = joinKeys(tokens, start, end);
      if (heard.length < FUZZY_MIN) continue;
      for (const variant of index.fuzzy) {
        if (variant.joined[0] !== heard[0]) continue;
        const allowed = variant.joined.length >= 7 ? 2 : 1;
        const gap = Math.abs(variant.joined.length - heard.length);
        if (gap > allowed) continue;
        if (matchesSearch(heard, variant.joined) && matchesSearch(variant.joined, heard)) {
          hits.push({ start, end, variant, gap });
        }
      }
    }
  }

  hits.sort(
    (a, b) =>
      a.gap - b.gap ||
      Number(b.variant.isName) - Number(a.variant.isName) ||
      a.variant.order - b.variant.order ||
      a.start - b.start,
  );
  const taken = new Set<number>();
  const found: MerchantSpan[] = [];
  for (const hit of hits) {
    let free = true;
    for (let i = hit.start; i < hit.end; i += 1) free = free && !taken.has(i);
    if (!free) continue;
    for (let i = hit.start; i < hit.end; i += 1) taken.add(i);
    found.push({
      start: hit.start,
      end: hit.end,
      merchant: brandMerchant(hit.variant.brand),
      brandCategory: hit.variant.brand.category_id,
      heard: heardText(tokens, hit.start, hit.end),
      source: 'fuzzy',
    });
  }
  return found.sort((a, b) => a.start - b.start);
}

const FREE_WORDS = 4;

/** Pass 4: "at Joe's Diner", "from Lucy's Bakery". */
export function findTypedMerchants(tokens: readonly Token[], usable: Usable): MerchantSpan[] {
  const found: MerchantSpan[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const lead = tokens[index].key;
    if ((lead !== 'at' && lead !== 'from') || !usable(index)) continue;

    let start = index + 1;
    while (start < tokens.length && usable(start) && SKIPPABLE.has(tokens[start].key)) start += 1;
    let end = start;
    while (end < tokens.length && usable(end) && end - start < FREE_WORDS) {
      if (isPlainWord(tokens[end])) end += 1;
      else if (tokens[end].key === 'and' && end > start && isPlainWord(tokens[end + 1])) end += 1;
      else break;
    }
    if (end === start) continue;
    const words = tokens.slice(start, end).map((token) => token.text);
    if (GENERIC_PLACES.has(words.join(' '))) continue;

    found.push({
      start,
      end,
      merchant: freeMerchant(titleCase(words)),
      brandCategory: null,
      heard: words.join(' '),
      source: 'heard',
    });
    index = end - 1;
  }
  return found;
}

/**
 * A catalog name is the most certain thing heard, then a learned phrase, then
 * a near miss, then words used as said.
 */
const SOURCE_RANK: Record<MerchantSource, number> = { catalog: 0, learned: 1, fuzzy: 2, heard: 3 };

/** The merchant to show: the most certain pass, then the first said. */
export function pickMerchant(spans: readonly MerchantSpan[]): MerchantSpan | null {
  if (spans.length === 0) return null;
  return [...spans].sort(
    (a, b) => SOURCE_RANK[a.source] - SOURCE_RANK[b.source] || a.start - b.start,
  )[0];
}

/**
 * Learned and catalog matches over the same words: the longer one wins, and on
 * a tie the catalog does. So a learned phrase can name something the catalog
 * does not ("target optical" → "Target Optical"), but can never turn a store
 * the catalog knows into another one ("target" stays Target, whatever was once
 * learned for it). Callers keep to the same rule by never learning when the
 * draft's merchantSource is `catalog`.
 */
export function preferCatalog(
  learned: readonly MerchantSpan[],
  catalog: readonly MerchantSpan[],
): MerchantSpan[] {
  const ordered = [...catalog, ...learned].sort(
    (a, b) =>
      b.end - b.start - (a.end - a.start) ||
      SOURCE_RANK[a.source] - SOURCE_RANK[b.source] ||
      a.start - b.start,
  );
  const taken: MerchantSpan[] = [];
  for (const span of ordered) {
    if (taken.every((other) => span.end <= other.start || span.start >= other.end)) {
      taken.push(span);
    }
  }
  return taken.sort((a, b) => a.start - b.start);
}

/** "at Starbucks", "at the Target": the receipt sign in "paid at". */
export function introducedWithAt(tokens: readonly Token[], span: MerchantSpan): boolean {
  let before = span.start - 1;
  while (before >= 0 && SKIPPABLE.has(tokens[before].key)) before -= 1;
  return before >= 0 && tokens[before].key === 'at';
}

/** Words that lead into how something was paid: "with my Amex", "on the Chase card". */
const PAYMENT_LEADS = new Set(['with', 'using', 'via', 'through', 'by', 'on']);
const POSSESSIVES = new Set(['my', 'our', 'the', 'a', 'an', 'his', 'her', 'their']);
/** After a brand, these make it the card or account paid from: "Chase card", "Citi account". */
const CARD_WORDS = new Set([
  'card',
  'credit',
  'debit',
  'visa',
  'mastercard',
  'account',
  'checking',
  'savings',
]);

/**
 * Whether a matched brand is how the person paid rather than who they paid.
 *
 * - A wallet: the brand followed by "pay" ("Apple Pay", "Google Pay").
 * - A card or bank after payment words: with / using / via / through / by /
 *   on (with "my" or "the" allowed between), when the brand is a bank or card
 *   issuer, or a card word follows it ("on my Amex", "with my Chase card",
 *   "on the Citi card").
 *
 * Payment words alone are not enough, because "with" also names the company
 * itself ("insurance with GEICO", "a subscription with Netflix"). And a card
 * named first with no payment words ("Chase card payment 300 due on the
 * 25th") is the bill's company, so it stays.
 *
 * A payment method is never the merchant, even when it is the only brand
 * heard: "$20 on my Amex" names the card, not the store, so the merchant is
 * left for the person to fill in.
 */
export function isPaymentMethod(tokens: readonly Token[], span: MerchantSpan): boolean {
  const after = tokens[span.end]?.key ?? '';
  if (after === 'pay') return true;

  let before = span.start - 1;
  while (before >= 0 && POSSESSIVES.has(tokens[before].key)) before -= 1;
  if (before < 0 || !PAYMENT_LEADS.has(tokens[before].key)) return false;

  return span.brandCategory === 'finance' || CARD_WORDS.has(after);
}
