import fs from 'node:fs';
import path from 'node:path';

import { parseReceiptFromLines, type ParsedLine } from '@/lib/receipt-parser';

/**
 * Floors under the parser's accuracy on the receipt bench (src/__tests__/fixtures/receipts; see
 * scripts/receipt-corpus/README.md), a few points below what it reached, so a change that loses
 * ground fails here. The bench's tables and failure modes live in src/__tests__/receipts.
 *
 * "Today" is pinned to the day the corpus was drawn: which of two readings of 07/10/2026 is in
 * the future depends on it, and the floors must not move with the calendar.
 */

const FIXTURE_DIR = path.join(__dirname, '..', '__tests__', 'fixtures', 'receipts');
const TODAY = new Date(2026, 9, 7, 12);

type Fixture = {
  id: string;
  expected: { merchant: string | null; totalCents: number; date: string };
  raw: ParsedLine[];
  flat: ParsedLine[];
};

function load(): Fixture[] {
  if (!fs.existsSync(FIXTURE_DIR)) return [];
  return fs
    .readdirSync(FIXTURE_DIR)
    .filter((name) => name.endsWith('.json') && name !== 'baseline.json')
    .map((name) => JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, name), 'utf8')) as Fixture);
}

// The bench's scoring rules: case, accent, punctuation and space blind; a leading THE and
// trailing legal or store-type words ignored; a bare web address names the shop.
const LEGAL = new Set(
  'inc incorporated corp corporation co company ltd limited llc lp plc pty stores store supercenter supercentre sa cv sab srl rl de'.split(
    ' ',
  ),
);
const BARE_URL =
  /^(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+)\.(?:com|net|org|ca|us|mx|co\.uk|com\.au|com\.mx)(?:\/\S*)?$/;

function core(name: string): string {
  let text = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  text = BARE_URL.exec(text)?.[1] ?? text;
  const words = text
    .replace(/[.'’`´-]/g, '')
    .replace(/&/g, ' and ')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  if (words[0] === 'the') words.shift();
  while (words.length > 1 && LEGAL.has(words[words.length - 1])) words.pop();
  return words.join('');
}

type Score = { named: number; abstain: number; total: number; date: number; allThree: number };

function score(fixtures: Fixture[], pass: 'raw' | 'flat'): Score {
  let named = 0;
  let namedRight = 0;
  let nameless = 0;
  let abstained = 0;
  let totals = 0;
  let dates = 0;
  let all = 0;
  for (const { expected, ...lines } of fixtures) {
    const parsed = parseReceiptFromLines(lines[pass], { today: TODAY });
    let merchant: boolean;
    if (expected.merchant === null) {
      nameless += 1;
      merchant = parsed.merchant === undefined;
      if (merchant) abstained += 1;
    } else {
      named += 1;
      const got = parsed.merchant === undefined ? '' : core(parsed.merchant);
      merchant = got.length > 0 && got === core(expected.merchant);
      if (merchant) namedRight += 1;
    }
    const total =
      parsed.total !== undefined && Math.round(parsed.total * 100) === expected.totalCents;
    const date = parsed.date === expected.date;
    if (total) totals += 1;
    if (date) dates += 1;
    if (merchant && total && date) all += 1;
  }
  const n = fixtures.length;
  return {
    named: namedRight / named,
    abstain: nameless ? abstained / nameless : 1,
    total: totals / n,
    date: dates / n,
    allThree: all / n,
  };
}

/** The metrics under their floor, with the value reached: empty when all hold. */
function shortfall(reached: Score, floors: Score): string[] {
  return (Object.keys(floors) as (keyof Score)[])
    .filter((metric) => reached[metric] < floors[metric])
    .map(
      (metric) =>
        `${metric} ${(reached[metric] * 100).toFixed(1)}% < ${(floors[metric] * 100).toFixed(1)}%`,
    );
}

const fixtures = load();
const training = fixtures.filter((f) => !/^(hold|hard)-/.test(f.id));
const holdout = fixtures.filter((f) => f.id.startsWith('hold-'));
const hard = fixtures.filter((f) => f.id.startsWith('hard-'));

// Reached on 2026-10-07 (named / abstain / total / date / all three):
//   training flat 95.6 / 100 / 97.0 / 97.0 / 94.3   raw 95.2 / 96.3 / 91.3 / 98.0 / 87.0
//   holdout  flat 95.7 / 100 / 96.0 / 96.0 / 90.1   raw 91.4 / 100 / 92.1 / 97.4 / 83.4
//   hard     flat 77.0 / 66.7 / 86.3 / 86.3 / 58.8  raw 64.9 / 50.0 / 73.8 / 80.0 / 41.3
// The held-out receipts (other shops, layouts, fonts and seed) catch rules that memorise the
// training set; the hard ones are photographs under stress (glare, fades, text behind the paper).
describe('receipt parser accuracy floors', () => {
  it('has the receipts to measure', () => {
    expect(training.length).toBeGreaterThanOrEqual(240);
    expect(holdout.length).toBeGreaterThanOrEqual(140);
    expect(hard.length).toBeGreaterThanOrEqual(70);
  });

  it.each([
    ['training', 'flat', training, [0.92, 0.92, 0.95, 0.94, 0.91]],
    ['training', 'raw', training, [0.92, 0.88, 0.88, 0.95, 0.84]],
    ['held-out', 'flat', holdout, [0.92, 0.9, 0.93, 0.93, 0.87]],
    ['held-out', 'raw', holdout, [0.88, 0.9, 0.89, 0.94, 0.8]],
    ['hard', 'flat', hard, [0.73, 0.6, 0.82, 0.82, 0.54]],
  ] as const)('holds the %s receipts on the %s pass', (_set, pass, set, floor) => {
    const [named, abstain, total, date, allThree] = floor;
    expect(shortfall(score(set, pass), { named, abstain, total, date, allThree })).toEqual([]);
  });
});
