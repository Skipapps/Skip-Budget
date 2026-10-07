import fs from 'node:fs';
import path from 'node:path';

import catalogue from '@/lib/__fixtures__/brand-catalogue.json';
import { parseReceiptFromLines, type ParsedLine } from '@/lib/receipt-parser';

/**
 * Floors under the parser's accuracy on the receipt bench (src/__tests__/fixtures/receipts; see
 * scripts/receipt-corpus/README.md), measured the way the app ships: the native reader's `next`
 * pass, the real brand catalogue passed in, and `dayFirst` as the phone in each receipt's market
 * would give it. Floors sit two points under what was reached; ceilings cap the confidently wrong
 * answers, since a wrong store, total or date is worse than a blank one.
 *
 * "Today" is pinned to the day the corpus was drawn: which of two readings of 07/10/2026 lies in
 * the future depends on it, and the numbers must not move with the calendar.
 */

const FIXTURE_DIR = path.join(__dirname, '..', '__tests__', 'fixtures', 'receipts');
const TODAY = new Date(2026, 9, 7, 12);

type Brand = { name: string; aliases: string[]; domain: string | null };
const BRANDS: Brand[] = catalogue.brands;
const BY_NAME = new Map(BRANDS.map((brand) => [brand.name, brand]));

type Fixture = {
  id: string;
  expected: { merchant: string | null; totalCents: number; date: string; market: string };
  next?: ParsedLine[];
};

function load(): Fixture[] {
  if (!fs.existsSync(FIXTURE_DIR)) return [];
  return fs
    .readdirSync(FIXTURE_DIR)
    .filter((name) => name.endsWith('.json') && name !== 'baseline.json')
    .map((name) => JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, name), 'utf8')) as Fixture);
}

/** What the app passes: USD month first, GBP/MXN/AUD day first, CAD undecided. */
function dayFirstFor(market: string): boolean | undefined {
  if (market === 'US') return false;
  return market.startsWith('CA') ? undefined : true;
}

// The bench's scoring rules: case, accent and punctuation blind; a leading THE and trailing legal
// or store-type words ignored; a bare web address names the shop.
const LEGAL = new Set(
  'inc incorporated corp corporation co company ltd limited llc lp plc pty stores store supercenter supercentre sa cv sab srl rl de'.split(
    ' ',
  ),
);
const BARE_URL =
  /^(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+)\.(?:com|net|org|ca|us|mx|co\.uk|com\.au|com\.mx)(?:\/\S*)?$/;

function words(name: string): string[] {
  let text = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  text = BARE_URL.exec(text)?.[1] ?? text;
  const out = text
    .replace(/[.'’`´-]/g, '')
    .replace(/&/g, ' and ')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  if (out[0] === 'the') out.shift();
  return out;
}

function core(name: string): string {
  const out = words(name);
  while (out.length > 1 && LEGAL.has(out[out.length - 1])) out.pop();
  return out.join('');
}

/**
 * With the catalogue, its own spelling of a brand is right: "Costco" for a receipt printed COSTCO
 * WHOLESALE, "CVS" for CVS PHARMACY (the brand's words then store-type words, or an alias).
 */
function catalogueSpelling(returned: string, expected: string): boolean {
  const brand = BY_NAME.get(returned);
  if (!brand) return false;
  if (brand.aliases.some((alias) => core(alias) === core(expected))) return true;
  const got = words(returned);
  const want = words(expected);
  return got.length < want.length && got.every((word, i) => want[i] === word);
}

type Score = {
  named: number;
  abstain: number;
  total: number;
  date: number;
  allThree: number;
  wrongMerchant: number;
  wrongTotal: number;
  wrongDate: number;
};

function score(fixtures: Fixture[]): Score {
  let named = 0;
  let namedRight = 0;
  let nameless = 0;
  let abstained = 0;
  let totals = 0;
  let dates = 0;
  let all = 0;
  let wrongMerchant = 0;
  let wrongTotal = 0;
  let wrongDate = 0;
  for (const { expected, next } of fixtures) {
    const parsed = parseReceiptFromLines(next ?? [], {
      today: TODAY,
      dayFirst: dayFirstFor(expected.market),
      brands: BRANDS,
    });
    let merchant: boolean;
    if (expected.merchant === null) {
      nameless += 1;
      merchant = parsed.merchant === undefined;
      if (merchant) abstained += 1;
    } else {
      named += 1;
      const got = parsed.merchant === undefined ? '' : core(parsed.merchant);
      merchant =
        got.length > 0 &&
        (got === core(expected.merchant) || catalogueSpelling(parsed.merchant!, expected.merchant));
      if (merchant) namedRight += 1;
    }
    if (!merchant && parsed.merchant !== undefined) wrongMerchant += 1;
    const total =
      parsed.total !== undefined && Math.round(parsed.total * 100) === expected.totalCents;
    if (total) totals += 1;
    else if (parsed.total !== undefined) wrongTotal += 1;
    const date = parsed.date === expected.date;
    if (date) dates += 1;
    else if (parsed.date !== undefined) wrongDate += 1;
    if (merchant && total && date) all += 1;
  }
  const n = fixtures.length;
  return {
    named: namedRight / named,
    abstain: nameless ? abstained / nameless : 1,
    total: totals / n,
    date: dates / n,
    allThree: all / n,
    wrongMerchant: wrongMerchant / n,
    wrongTotal: wrongTotal / n,
    wrongDate: wrongDate / n,
  };
}

type Limits = { floors: Partial<Score>; ceilings: Partial<Score> };

/** Every metric outside its limit, with the value reached: empty when all hold. */
function outside(reached: Score, { floors, ceilings }: Limits): string[] {
  const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
  const below = (Object.keys(floors) as (keyof Score)[])
    .filter((metric) => reached[metric] < floors[metric]!)
    .map((metric) => `${metric} ${pct(reached[metric])} < ${pct(floors[metric]!)}`);
  const above = (Object.keys(ceilings) as (keyof Score)[])
    .filter((metric) => reached[metric] > ceilings[metric]!)
    .map((metric) => `${metric} ${pct(reached[metric])} > ${pct(ceilings[metric]!)}`);
  return [...below, ...above];
}

const fixtures = load();
const training = fixtures.filter((f) => !/^(hold|hard)-/.test(f.id));
const holdout = fixtures.filter((f) => f.id.startsWith('hold-'));
const hard = fixtures.filter((f) => f.id.startsWith('hard-'));

// Reached on 2026-10-07, `next` pass with the catalogue (named / abstain / total / date / all
// three; confidently wrong store / total / date out of n):
//   training 300  97.1 / 100 / 97.0 / 99.0 / 94.3   wrong 6 / 2 / 1
//   holdout  151  96.4 / 100 / 96.0 / 100 / 92.7    wrong 3 / 1 / 0
//   hard      80  78.4 / 66.7 / 76.3 / 86.3 / 56.3  wrong 16 / 6 / 3
// The held-out receipts (other shops, layouts, fonts and seed) catch rules that memorise the
// training set; the hard ones are photographs under stress (glare, fades, text behind the paper).
const LIMITS: [string, Fixture[], Limits][] = [
  [
    'training',
    training,
    {
      floors: { named: 0.95, abstain: 0.98, total: 0.95, date: 0.97, allThree: 0.92 },
      ceilings: { wrongMerchant: 0.024, wrongTotal: 0.01, wrongDate: 0.007 },
    },
  ],
  [
    'held-out',
    holdout,
    {
      floors: { named: 0.94, abstain: 0.98, total: 0.94, date: 0.98, allThree: 0.9 },
      ceilings: { wrongMerchant: 0.027, wrongTotal: 0.014, wrongDate: 0.007 },
    },
  ],
  [
    'hard',
    hard,
    {
      floors: { named: 0.76, abstain: 0.64, total: 0.74, date: 0.84, allThree: 0.54 },
      ceilings: { wrongMerchant: 0.215, wrongTotal: 0.09, wrongDate: 0.05 },
    },
  ],
];

describe('receipt parser accuracy floors (as shipped: next pass, catalogue, phone region)', () => {
  it('has the receipts to measure, each read by the current native reader', () => {
    expect(training.length).toBeGreaterThanOrEqual(240);
    expect(holdout.length).toBeGreaterThanOrEqual(140);
    expect(hard.length).toBeGreaterThanOrEqual(70);
    expect(fixtures.filter((f) => !f.next).map((f) => f.id)).toEqual([]);
  });

  it.each(LIMITS)('holds the %s receipts', (_set, set, limits) => {
    expect(outside(score(set), limits)).toEqual([]);
  });
});
