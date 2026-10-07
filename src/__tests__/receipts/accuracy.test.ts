import fs from 'node:fs';
import path from 'node:path';

import type * as ParserModule from '@/lib/receipt-parser';

type ParsedLine = ParserModule.ParsedLine;
type ParsedReceipt = ParserModule.ParsedReceipt;

/**
 * RECEIPT_PARSER=/path/to/receipt-parser.ts measures another version of the parser on the same
 * fixtures: the original, committed one is `git show c7a607c:src/lib/receipt-parser.ts`. Unset, it is
 * the parser in the tree.
 */
const parser: typeof ParserModule = process.env.RECEIPT_PARSER
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    require(require('node:path').resolve(process.env.RECEIPT_PARSER))
  : // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/lib/receipt-parser');
const { parseReceiptFromLines } = parser;

/**
 * Receipt-scanning bench. Every fixture is one synthetic receipt photograph, its ground truth, and
 * what Apple Vision made of it three ways (see scripts/receipt-corpus/README.md):
 *   raw   the app's Vision request on the untouched photo (the upload path)
 *   flat  after normalised + flattened (the camera path the app ships)
 *   fixed the flattened page read with languages Vision actually has models for
 *
 * The first describe MEASURES the parser, per set (training, holdout, hard), and writes baseline.json.
 * It never fails on low accuracy: that is the number to beat. The other describes keep the bench honest.
 */

const FIXTURE_DIR =
  process.env.RECEIPT_FIXTURES ?? path.join(__dirname, '..', 'fixtures', 'receipts');
const BASELINE_FILE = process.env.RECEIPT_BASELINE_OUT ?? path.join(FIXTURE_DIR, 'baseline.json');

const PASSES = ['raw', 'flat', 'fixed'] as const;
type Pass = (typeof PASSES)[number];

type Expected = {
  id: string;
  merchant: string | null;
  total: number;
  totalCents: number;
  date: string;
  country: string;
  language: string;
  headerStyle: string;
  distortion: string;
  notes: string;
  kind: string;
  market: string;
  template: string;
  totalLayout: string;
  wordless: boolean;
  dateFormat: string | null;
  datePrinted: string | null;
  totalPrinted: string | null;
  last4: string | null;
  logoHint: string | null;
  nameRows: string[];
  exifOrientation: number;
  set?: string;
  stress?: string[];
  source?: string;
  photo: { paperQuad: number[][]; level: string; canvas: number[]; fill: number };
};

type Fixture = {
  id: string;
  expected: Expected;
  meta: {
    ms: { raw: number; flat: number; fixed: number; flatten: number };
    flattened: boolean;
    flattenQuad: number[][];
  };
  raw: ParsedLine[];
  flat: ParsedLine[];
  fixed: ParsedLine[];
};

function loadFixtures(): Fixture[] {
  if (!fs.existsSync(FIXTURE_DIR)) return [];
  return fs
    .readdirSync(FIXTURE_DIR)
    .filter((name) => name.endsWith('.json') && !name.startsWith('baseline'))
    .sort()
    .map((name) => JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, name), 'utf8')) as Fixture);
}

// ---------------------------------------------------------------------------------------------
// Scoring rules
// ---------------------------------------------------------------------------------------------

/** Legal forms and store-type words a till prints after the trading name. */
const LEGAL_SUFFIX = new Set([
  'inc',
  'incorporated',
  'corp',
  'corporation',
  'co',
  'company',
  'ltd',
  'limited',
  'llc',
  'lp',
  'plc',
  'pty',
  'stores',
  'store',
  'supercenter',
  'supercentre',
  'sa',
  'cv',
  'sab',
  'srl',
  'rl',
  'de',
]);

function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

const BARE_URL =
  /^(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+)\.(?:com|net|org|ca|us|mx|co\.uk|com\.au|com\.mx)(?:\/\S*)?$/;

function wordsOf(raw: string): string[] {
  let text = fold(raw).trim();
  // A web address names the shop too: "www.target.com" is Target.
  const url = BARE_URL.exec(text);
  if (url) text = url[1];
  return text
    .replace(/[.'’`´-]/g, '')
    .replace(/&/g, ' and ')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Case, accent and punctuation insensitive; a leading "THE" and trailing legal words do not count. */
function coreWords(raw: string): string[] {
  const words = wordsOf(raw);
  if (words[0] === 'the') words.shift();
  while (words.length > 1 && LEGAL_SUFFIX.has(words[words.length - 1])) words.pop();
  return words;
}

function sameMerchant(returned: string, expected: string): boolean {
  // Spaces are ignored too: Vision reads "BEST BUY" as "BESTBUY" and "MACY'S" as "MACY 'S".
  const a = coreWords(returned).join('');
  return a.length > 0 && a === coreWords(expected).join('');
}

/** Looser, reported beside the strict number: the expected name sits whole inside what came back. */
function containsMerchant(returned: string, expected: string): boolean {
  const needle = coreWords(expected).join('');
  return needle.length > 0 && squash(returned).includes(needle);
}

type MerchantOutcome = 'correct' | 'wrong' | 'missed' | 'null-correct' | 'null-wrong';

function scoreMerchant(expected: string | null, returned: string | undefined): MerchantOutcome {
  if (expected === null) return returned === undefined ? 'null-correct' : 'null-wrong';
  if (returned === undefined) return 'missed';
  return sameMerchant(returned, expected) ? 'correct' : 'wrong';
}

type ValueOutcome = 'correct' | 'wrong' | 'missed';

function scoreTotal(expectedCents: number, returned: number | undefined): ValueOutcome {
  if (returned === undefined) return 'missed';
  return Math.round(returned * 100) === expectedCents ? 'correct' : 'wrong';
}

function scoreDate(expected: string, returned: string | undefined): ValueOutcome {
  if (returned === undefined) return 'missed';
  return returned === expected ? 'correct' : 'wrong';
}

// ---------------------------------------------------------------------------------------------
// What Vision actually read: is the answer anywhere in its output?
// ---------------------------------------------------------------------------------------------

function readingOrder(lines: ParsedLine[]): ParsedLine[] {
  return [...lines].sort((a, b) => {
    const sameRow = Math.abs(a.y - b.y) < Math.max(a.height, b.height) * 0.5;
    return sameRow ? a.x - b.x : a.y - b.y;
  });
}

function squash(text: string): string {
  return fold(text)
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, '');
}

function nameInLines(lines: ParsedLine[], merchant: string): boolean {
  const needle = coreWords(merchant).join('');
  if (!needle) return false;
  if (
    readingOrder(lines)
      .map((line) => squash(line.text))
      .join('')
      .includes(needle)
  )
    return true;
  return lines.some((line) => (line.candidates ?? []).some((c) => squash(c).includes(needle)));
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function amountInLines(lines: ParsedLine[], printed: string): boolean {
  const base = printed.replace(/\s/g, '');
  const swapped = base.replace(/[.,]/g, (c) => (c === '.' ? ',' : '.'));
  const patterns = [base, swapped].map((v) => new RegExp(`(?<!\\d)${escapeRegExp(v)}(?!\\d)`));
  return lines.some((line) =>
    [line.text, ...(line.candidates ?? [])].some((text) => {
      const stripped = text.replace(/\s/g, '');
      return patterns.some((pattern) => pattern.test(stripped));
    }),
  );
}

function dateKey(text: string): string {
  return text
    .replace(/^(mon|tue|wed|thu|fri|sat|sun)\s+/i, '')
    .replace(/\s/g, '')
    .replace(/[-–—./]/g, '/')
    .toLowerCase();
}

function dateInLines(lines: ParsedLine[], printed: string): boolean {
  const needle = dateKey(printed);
  return lines.some((line) =>
    [line.text, ...(line.candidates ?? [])].some((text) => dateKey(text).includes(needle)),
  );
}

// ---------------------------------------------------------------------------------------------
// Why a merchant was wrong
// ---------------------------------------------------------------------------------------------

function levenshteinRatio(a: string, b: string): number {
  if (!a.length || !b.length) return 0;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const held = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = held;
    }
  }
  return 1 - row[b.length] / Math.max(a.length, b.length);
}

/** What kind of line the parser handed back, for grouping failures by what it mistook for a name. */
function kindOf(text: string): string {
  const t = text.trim();
  // A drawn logo read as letters: "OIII", "IIIO", "O11I".
  if (t.length <= 7 && [...t].filter((c) => 'Il|O0o1!'.includes(c)).length >= t.length * 0.7)
    return 'a logo graphic read as junk text ("OIII")';
  if (/\b(welcome|bienvenid[oa]?|bienvenue)\b/i.test(t)) return 'a "welcome" line';
  if (/\b(thank\s*you|merci|gracias|thanks)\b/i.test(t)) return 'a thank-you line';
  if (
    /\b(inc|ltd|llc|corp|corporation|limited|plc|pty|ltee|s\.?a\.?\s*(b\.?\s*)?de\s*c\.?v\.?)\b/i.test(
      t,
    )
  )
    return 'a legal-entity line';
  if (
    /\b(store|magasin|tienda|suc\.?|sucursal|terminal|tax\s*id|vat|abn|r\.?f\.?c\.?|gst|hst|tps|tvq)\b|#\s*\d/i.test(
      t,
    )
  )
    return 'a store number / tax id line';
  if (/\d{3}[-.\s)]*\d{3,4}[-.\s]*\d{4}|\(\d{2,3}\)\s*\d/.test(t)) return 'a phone number';
  if (/\b\d{1,4}[/.-]\d{1,2}[/.-]\d{1,4}\b|\b\d{1,2}:\d{2}\b/.test(t)) return 'a date or time';
  if (/\b(till|reg|register|pos|trans|lane|caja|caisse|folio|ticket)\b/i.test(t))
    return 'a till / register / ticket line';
  if (
    /\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\s+\d{4}\b/.test(t) ||
    /^[\p{L} ]+,\s*[A-Z][A-Za-z.\s]{1,9}\.?$/u.test(t)
  )
    return 'an address / city line';
  if (
    /\b[A-Z]{2}\s+\d{5}\b|\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b|\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b|C\.?P\.?\s*\d{5}|\b(st|street|ave|avenue|rd|road|blvd|dr|drive|calle|av\.?|boul\.?|rue|hwy|lane)\b/i.test(
      t,
    )
  )
    return 'an address / city line';
  if (/^(table|mesa|guests|check|server|operator|cashier|cajero|mesero|caissier)/i.test(t))
    return 'a table / server line';
  if (
    /\b(receipt|invoice|customer copy|merchant copy|purchase|sale|approved|total|subtotal|visa|mastercard|amount)\b/i.test(
      t,
    )
  )
    return 'receipt boilerplate';
  if (/\d+[.,]\d{2}\b|\bkg\b.*@/.test(t)) return 'an item or price line';
  if (t.replace(/\D/g, '').length > t.length / 2) return 'a number line';
  if (t.split(/\s+/).length >= 3 && /[a-z]/.test(t))
    return 'a multi-word text line (a slogan or an item name)';
  return 'other text';
}

function topLines(lines: ParsedLine[], count = 8): string[] {
  return readingOrder(lines)
    .slice(0, count)
    .map((line) => `y=${line.y.toFixed(3)} h=${line.height.toFixed(3)} ${line.text}`);
}

function classify(truth: Expected, returned: string | undefined, lines: ParsedLine[]): string {
  const expected = truth.merchant;
  if (expected === null) {
    return returned === undefined
      ? 'ok'
      : `no name printed anywhere: returned ${kindOf(returned)} as the store`;
  }
  const present = nameInLines(lines, expected);
  if (returned === undefined) {
    if (truth.headerStyle === 'logo-only')
      return 'logo-only receipt, name only in footer text: parser returned nothing';
    return present
      ? 'name was read, but the parser returned nothing'
      : 'name never read by Vision, parser returned nothing';
  }
  if (sameMerchant(returned, expected)) return 'ok';
  // The name is only in the footer, a legal line or a web address: there is nothing at the top.
  if (truth.headerStyle === 'logo-only') {
    return `logo-only receipt, name only in its ${truth.logoHint} text: returned ${kindOf(returned)}`;
  }
  const near = levenshteinRatio(squash(returned), coreWords(expected).join(''));
  if (near >= 0.75) return 'name misread by Vision (near miss); the parser found the line';
  if (!present) return `name never read by Vision: returned ${kindOf(returned)}`;
  const returnedWords = coreWords(returned);
  const expectedWords = coreWords(expected);
  if (
    returnedWords.length < expectedWords.length &&
    returnedWords.every((word) => expectedWords.includes(word))
  )
    return 'name was read; only one line of a split name returned';
  if (containsMerchant(returned, expected))
    return 'name was read; returned with extra words on the same line';
  return `name was read; parser picked ${kindOf(returned)} instead`;
}

// ---------------------------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------------------------

type Outcome = {
  merchant: MerchantOutcome;
  merchantLenient: boolean;
  total: ValueOutcome;
  date: ValueOutcome;
  last4: boolean;
  parsed: ParsedReceipt;
  ms: number;
  crashed: boolean;
  failure: string;
};

function evaluate(fixture: Fixture, pass: Pass): Outcome {
  const lines = fixture[pass];
  const { expected } = fixture;
  let parsed: ParsedReceipt = {};
  let crashed = false;
  // Best of three: one slow sample on a busy machine (a whole suite runs in parallel) says nothing
  // about the parser, while a parser that really is slow is slow every time.
  let ms = Infinity;
  for (let attempt = 0; attempt < 3; attempt++) {
    const started = performance.now();
    try {
      parsed = parseReceiptFromLines(lines);
    } catch {
      crashed = true;
    }
    ms = Math.min(ms, performance.now() - started);
  }
  const merchant = scoreMerchant(expected.merchant, parsed.merchant);
  return {
    merchant,
    merchantLenient:
      expected.merchant === null
        ? parsed.merchant === undefined
        : parsed.merchant !== undefined && containsMerchant(parsed.merchant, expected.merchant),
    total: scoreTotal(expected.totalCents, parsed.total),
    date: scoreDate(expected.date, parsed.date),
    last4: (expected.last4 ?? undefined) === parsed.last4,
    parsed,
    ms,
    crashed,
    failure: classify(expected, parsed.merchant, lines),
  };
}

type Evaluated = { fixture: Fixture; outcomes: Record<Pass, Outcome> };

function evaluateAll(fixtures: Fixture[]): Evaluated[] {
  // One parse first so JIT warm-up is not charged to the first receipt.
  if (fixtures.length) parseReceiptFromLines(fixtures[0].raw);
  return fixtures.map((fixture) => ({
    fixture,
    outcomes: {
      raw: evaluate(fixture, 'raw'),
      flat: evaluate(fixture, 'flat'),
      fixed: evaluate(fixture, 'fixed'),
    },
  }));
}

type Rate = { correct: number; wrong: number; missed: number; rate: number };
type Summary = {
  n: number;
  merchant: Rate;
  merchantLenient: number;
  total: Rate;
  date: Rate;
  last4: number;
  allThree: number;
};

const ratio = (a: number, b: number) => (b === 0 ? 0 : Math.round((a / b) * 10000) / 10000);

function summarise(items: Evaluated[], pass: Pass): Summary {
  const n = items.length;
  const count = (test: (o: Outcome) => boolean) =>
    items.filter((i) => test(i.outcomes[pass])).length;
  const merchantCorrect = count((o) => o.merchant === 'correct' || o.merchant === 'null-correct');
  const merchantWrong = count((o) => o.merchant === 'wrong' || o.merchant === 'null-wrong');
  const merchantMissed = count((o) => o.merchant === 'missed');
  const totalCorrect = count((o) => o.total === 'correct');
  const dateCorrect = count((o) => o.date === 'correct');
  return {
    n,
    merchant: {
      correct: merchantCorrect,
      wrong: merchantWrong,
      missed: merchantMissed,
      rate: ratio(merchantCorrect, n),
    },
    merchantLenient: ratio(
      count((o) => o.merchantLenient),
      n,
    ),
    total: {
      correct: totalCorrect,
      wrong: count((o) => o.total === 'wrong'),
      missed: count((o) => o.total === 'missed'),
      rate: ratio(totalCorrect, n),
    },
    date: {
      correct: dateCorrect,
      wrong: count((o) => o.date === 'wrong'),
      missed: count((o) => o.date === 'missed'),
      rate: ratio(dateCorrect, n),
    },
    last4: ratio(
      count((o) => o.last4),
      n,
    ),
    allThree: ratio(
      count(
        (o) =>
          (o.merchant === 'correct' || o.merchant === 'null-correct') &&
          o.total === 'correct' &&
          o.date === 'correct',
      ),
      n,
    ),
  };
}

type Slice = Record<Pass, Summary>;

function summariseAll(items: Evaluated[]): Slice {
  return {
    raw: summarise(items, 'raw'),
    flat: summarise(items, 'flat'),
    fixed: summarise(items, 'fixed'),
  };
}

/** Which of the parser's date assumptions a receipt exercises (it reads 12/10 as 10 December). */
function dateKind(e: Expected): string {
  const format = e.dateFormat ?? '';
  if (format.startsWith('YYYY')) return 'year first (2026-10-06)';
  if (/Mon|MMM|mois/.test(format)) return 'month name';
  const [, month, day] = e.date.split('-').map(Number);
  if (day > 12) return 'numeric, day above 12 (unambiguous)';
  if (day === month) return 'numeric, day equals month';
  return /^DD[/.-]/.test(format)
    ? 'numeric day-first, ambiguous'
    : 'numeric month-first, ambiguous';
}

const DIMENSIONS: [string, (e: Expected) => string | string[]][] = [
  ['country', (e) => e.country],
  ['language', (e) => e.language],
  ['market', (e) => e.market],
  ['headerStyle', (e) => e.headerStyle],
  [
    'headerDetail',
    (e) =>
      e.headerStyle === 'logo-only' ? `logo-only, name ${e.logoHint ?? 'nowhere'}` : e.headerStyle,
  ],
  ['distortion', (e) => e.distortion],
  ['kind', (e) => e.kind],
  ['totalLayout', (e) => e.totalLayout],
  ['totalWord', (e) => (e.wordless ? 'no TOTAL word' : 'TOTAL word printed')],
  ['dateFormat', (e) => e.dateFormat ?? 'unknown'],
  ['dateKind', dateKind],
  [
    'storedOrientation',
    (e) =>
      e.exifOrientation === 6
        ? 'sideways + EXIF 6 (iPhone portrait)'
        : e.exifOrientation === 8
          ? 'sideways + EXIF 8'
          : 'upright',
  ],
  ['template', (e) => e.template],
  ['stress', (e) => e.stress ?? []],
  ['source', (e) => e.source ?? []],
  [
    'frameFill',
    (e) => {
      const fill = e.photo.fill;
      return fill < 0.25
        ? 'receipt under 25% of the width'
        : fill < 0.4
          ? 'receipt 25-40% of the width'
          : fill < 0.6
            ? 'receipt 40-60% of the width'
            : 'receipt over 60% of the width';
    },
  ],
];

function slices(items: Evaluated[]): Record<string, Record<string, Slice & { n: number }>> {
  const out: Record<string, Record<string, Slice & { n: number }>> = {};
  for (const [name, key] of DIMENSIONS) {
    const groups = new Map<string, Evaluated[]>();
    for (const item of items) {
      for (const k of ([] as string[]).concat(key(item.fixture.expected))) {
        groups.set(k, [...(groups.get(k) ?? []), item]);
      }
    }
    if (!groups.size) continue;
    out[name] = {};
    for (const k of [...groups.keys()].sort()) {
      out[name][k] = { n: groups.get(k)!.length, ...summariseAll(groups.get(k)!) };
    }
  }
  return out;
}

type FailureMode = {
  mode: string;
  count: number;
  examples: { id: string; expected: string | null; parsed: string | null; topLines: string[] }[];
};

function failureModes(items: Evaluated[], pass: Pass): FailureMode[] {
  const members = new Map<string, Evaluated[]>();
  for (const item of items) {
    const failure = item.outcomes[pass].failure;
    if (failure !== 'ok') members.set(failure, [...(members.get(failure) ?? []), item]);
  }
  return [...members.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 15)
    .map(([mode, group]) => ({
      mode,
      count: group.length,
      // The first and a middle one, so the examples are not all from the same market.
      examples: [group[0], group[Math.floor(group.length / 2)]]
        .filter((item, index, list) => list.indexOf(item) === index)
        .map(({ fixture, outcomes }) => ({
          id: fixture.id,
          expected: fixture.expected.merchant,
          parsed: outcomes[pass].parsed.merchant ?? null,
          topLines: topLines(fixture[pass]),
        })),
    }));
}

/** Where the answer is lost: Vision never read it, or it read it and the parser chose otherwise. */
function funnel(items: Evaluated[], pass: Pass) {
  const named = items.filter((i) => i.fixture.expected.merchant !== null);
  const read = (i: Evaluated) => nameInLines(i.fixture[pass], i.fixture.expected.merchant!);
  const nameRead = named.filter(read);
  const totalRead = items.filter((i) =>
    amountInLines(i.fixture[pass], i.fixture.expected.totalPrinted ?? ''),
  );
  const dateRead = items.filter((i) =>
    dateInLines(i.fixture[pass], i.fixture.expected.datePrinted ?? ''),
  );
  const ok = (i: Evaluated, field: 'merchant' | 'total' | 'date') =>
    field === 'merchant'
      ? i.outcomes[pass].merchant === 'correct'
      : i.outcomes[pass][field] === 'correct';
  return {
    merchant: {
      withPrintedName: named.length,
      visionReadIt: nameRead.length,
      visionReadItRate: ratio(nameRead.length, named.length),
      parserCorrectGivenRead: ratio(
        nameRead.filter((i) => ok(i, 'merchant')).length,
        nameRead.length,
      ),
      parserCorrectOverall: ratio(named.filter((i) => ok(i, 'merchant')).length, named.length),
    },
    total: {
      visionReadIt: totalRead.length,
      visionReadItRate: ratio(totalRead.length, items.length),
      parserCorrectGivenRead: ratio(
        totalRead.filter((i) => ok(i, 'total')).length,
        totalRead.length,
      ),
      parserCorrectOverall: ratio(items.filter((i) => ok(i, 'total')).length, items.length),
    },
    date: {
      visionReadIt: dateRead.length,
      visionReadItRate: ratio(dateRead.length, items.length),
      parserCorrectGivenRead: ratio(dateRead.filter((i) => ok(i, 'date')).length, dateRead.length),
      parserCorrectOverall: ratio(items.filter((i) => ok(i, 'date')).length, items.length),
    },
  };
}

function boundingBox(quad: number[][]) {
  const xs = quad.map((p) => p[0]);
  const ys = quad.map((p) => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

/** What `flattened` did to the page, against where the paper really was. */
function flattenAnalysis(items: Evaluated[]) {
  const area = (b: ReturnType<typeof boundingBox>) => (b.x1 - b.x0) * (b.y1 - b.y0);
  const geometry = (group: Evaluated[]) => {
    let found = 0;
    let cutsHeader = 0;
    let cutsFooter = 0;
    let cutsSide = 0;
    let tooSmall = 0;
    let looser = 0;
    for (const { fixture } of group) {
      if (!fixture.meta.flattened) continue;
      found += 1;
      const paper = boundingBox(fixture.expected.photo.paperQuad);
      const crop = boundingBox(fixture.meta.flattenQuad);
      const height = paper.y1 - paper.y0;
      const width = paper.x1 - paper.x0;
      if (crop.y0 - paper.y0 > height * 0.03) cutsHeader += 1;
      if (paper.y1 - crop.y1 > height * 0.03) cutsFooter += 1;
      if (crop.x0 - paper.x0 > width * 0.03 || paper.x1 - crop.x1 > width * 0.03) cutsSide += 1;
      if (area(crop) < area(paper) * 0.6) tooSmall += 1;
      if (area(crop) > area(paper) * 1.25) looser += 1;
    }
    return {
      receipts: group.length,
      pageFound: found,
      pageFoundRate: ratio(found, group.length),
      cropCutsHeader: cutsHeader,
      cropCutsFooter: cutsFooter,
      cropCutsSide: cutsSide,
      cropUnder60PercentOfPaper: tooSmall,
      cropMuchLooserThanPaper: looser,
    };
  };
  const named = items.filter((i) => i.fixture.expected.merchant !== null);
  const printedTotal = (i: Evaluated) => i.fixture.expected.totalPrinted ?? '';
  const nameIn = (i: Evaluated, pass: Pass) =>
    nameInLines(i.fixture[pass], i.fixture.expected.merchant!);
  return {
    photographs: geometry(items.filter((i) => i.fixture.expected.distortion !== 'clean')),
    cleanScans: geometry(items.filter((i) => i.fixture.expected.distortion === 'clean')),
    nameInRawButNotInFlat: named
      .filter((i) => nameIn(i, 'raw') && !nameIn(i, 'flat'))
      .map((i) => i.fixture.id),
    nameInFlatButNotInRaw: named.filter((i) => !nameIn(i, 'raw') && nameIn(i, 'flat')).length,
    totalInRawButNotInFlat: items
      .filter(
        (i) =>
          amountInLines(i.fixture.raw, printedTotal(i)) &&
          !amountInLines(i.fixture.flat, printedTotal(i)),
      )
      .map((i) => i.fixture.id),
    totalInFlatButNotInRaw: items.filter(
      (i) =>
        !amountInLines(i.fixture.raw, printedTotal(i)) &&
        amountInLines(i.fixture.flat, printedTotal(i)),
    ).length,
  };
}

function distribution(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] ?? 0;
  const mean = sorted.reduce((a, b) => a + b, 0) / (sorted.length || 1);
  return {
    mean: Math.round(mean * 10) / 10,
    median: at(0.5),
    p95: at(0.95),
    max: sorted[sorted.length - 1] ?? 0,
  };
}

function buildBaseline(items: Evaluated[]) {
  const named = items.filter((i) => i.fixture.expected.merchant !== null);
  const nulls = items.filter((i) => i.fixture.expected.merchant === null);
  return {
    receipts: items.length,
    passes: {
      raw: 'Vision as the app calls it, photo untouched (upload path)',
      flat: 'after normalised + flattened (camera path, what ships)',
      fixed: 'flat page, languages en-US/fr-FR/es-ES, automatic detection',
    },
    overall: summariseAll(items),
    merchantNamed: summariseAll(named),
    merchantNullExpected: summariseAll(nulls),
    slices: slices(items),
    merchantFailureModes: {
      raw: failureModes(items, 'raw'),
      flat: failureModes(items, 'flat'),
      fixed: failureModes(items, 'fixed'),
    },
    funnel: {
      raw: funnel(items, 'raw'),
      flat: funnel(items, 'flat'),
      fixed: funnel(items, 'fixed'),
    },
    flatten: flattenAnalysis(items),
    ocrMs: {
      raw: distribution(items.map((i) => i.fixture.meta.ms.raw)),
      flat: distribution(items.map((i) => i.fixture.meta.ms.flat)),
      fixed: distribution(items.map((i) => i.fixture.meta.ms.fixed)),
      flattenStep: distribution(items.map((i) => i.fixture.meta.ms.flatten)),
    },
    parseMs: distribution(items.flatMap((i) => PASSES.map((p) => i.outcomes[p].ms))),
  };
}

// ---------------------------------------------------------------------------------------------
// Printing
// ---------------------------------------------------------------------------------------------

const pct = (value: number) => `${(value * 100).toFixed(1)}`.padStart(5);

function table(baseline: ReturnType<typeof buildBaseline>, title: string): string {
  const head = (title: string) =>
    `${title.padEnd(34)} ${'n'.padStart(4)} | merchant raw/flat/fixed | total raw/flat/fixed | date raw/flat/fixed`;
  const row = (name: string, n: number, slice: Slice) =>
    `${name.padEnd(34)} ${String(n).padStart(4)} | ${PASSES.map((p) => pct(slice[p].merchant.rate)).join(' ')} | ${PASSES.map((p) => pct(slice[p].total.rate)).join(' ')} | ${PASSES.map((p) => pct(slice[p].date.rate)).join(' ')}`;
  const out = [
    '',
    `RECEIPT SCANNING ${title}: percent correct (current parseReceiptFromLines)`,
    head('overall'),
    row('all receipts', baseline.receipts, baseline.overall),
    row('  merchant printed (non-null)', baseline.merchantNamed.flat.n, baseline.merchantNamed),
    row(
      '  no merchant printed (null)',
      baseline.merchantNullExpected.flat.n,
      baseline.merchantNullExpected,
    ),
  ];
  for (const [name, groups] of Object.entries(baseline.slices)) {
    out.push('', head(name));
    for (const [key, slice] of Object.entries(groups)) out.push(row(key, slice.n, slice));
  }
  out.push(
    '',
    'Is the answer in what Vision returned (read), and does the parser then pick it (given read)?',
  );
  for (const pass of PASSES) {
    const f = baseline.funnel[pass];
    const cell = (x: { visionReadItRate: number; parserCorrectGivenRead: number }) =>
      `read ${pct(x.visionReadItRate)} then right ${pct(x.parserCorrectGivenRead)}`;
    out.push(
      `${pass.padEnd(6)} merchant ${cell(f.merchant)} | total ${cell(f.total)} | date ${cell(f.date)}`,
    );
  }
  const ms = baseline.ocrMs;
  out.push(
    '',
    `OCR ms per image (mean/median/p95): raw ${ms.raw.mean}/${ms.raw.median}/${ms.raw.p95}, flat ${ms.flat.mean}/${ms.flat.median}/${ms.flat.p95} (of which flatten ${ms.flattenStep.mean}), fixed ${ms.fixed.mean}/${ms.fixed.median}/${ms.fixed.p95}; parser ${baseline.parseMs.mean} ms mean, ${baseline.parseMs.max} ms max`,
    '',
  );
  return out.join('\n');
}

// ---------------------------------------------------------------------------------------------

const SETS = ['training', 'holdout', 'hard'] as const;
type SetName = (typeof SETS)[number];

/** training: the first 300. holdout: other layouts, brands, fonts and seed. hard: photographs under stress. */
function setOf(fixture: Fixture): SetName {
  if (fixture.id.startsWith('hold-')) return 'holdout';
  if (fixture.id.startsWith('hard-')) return 'hard';
  return 'training';
}

const fixtures = loadFixtures();
const bySet = (name: SetName) => fixtures.filter((f) => setOf(f) === name);
let evaluated: Evaluated[] | null = null;
const results = () => (evaluated ??= evaluateAll(fixtures));
const resultsFor = (name: SetName) => results().filter((r) => setOf(r.fixture) === name);

function setSummary(baseline: ReturnType<typeof buildBaseline>) {
  const rates = (field: 'merchant' | 'total' | 'date') =>
    Object.fromEntries(PASSES.map((pass) => [pass, baseline.overall[pass][field].rate]));
  return {
    receipts: baseline.receipts,
    merchant: rates('merchant'),
    total: rates('total'),
    date: rates('date'),
    allThree: Object.fromEntries(PASSES.map((pass) => [pass, baseline.overall[pass].allThree])),
  };
}

function comparison(summaries: Record<string, ReturnType<typeof setSummary>>): string {
  const lines = [
    '',
    'THE THREE SETS: percent correct (raw/flat/fixed)    n | merchant            | total               | date                | all three (flat)',
  ];
  for (const [name, x] of Object.entries(summaries)) {
    const cell = (r: Record<string, number>) => PASSES.map((p) => pct(r[p])).join(' ');
    lines.push(
      `${name.padEnd(46)} ${String(x.receipts).padStart(4)} | ${cell(x.merchant)} | ${cell(x.total)} | ${cell(x.date)} | ${pct(x.allThree.flat)}`,
    );
  }
  lines.push('');
  return lines.join('\n');
}

describe('receipt scanning baseline (measures; never fails on accuracy)', () => {
  it('runs the current parser over every fixture, per set, and records the numbers', () => {
    const baselines: Partial<Record<SetName, ReturnType<typeof buildBaseline>>> = {};
    for (const name of SETS) {
      const items = resultsFor(name);
      if (!items.length) continue;
      baselines[name] = buildBaseline(items);
      process.stdout.write(table(baselines[name]!, name.toUpperCase()));
    }
    const summaries = Object.fromEntries(
      Object.entries(baselines).map(([name, baseline]) => [name, setSummary(baseline!)]),
    );
    process.stdout.write(comparison(summaries));
    // The training numbers stay where they always were; the other sets sit beside them.
    const file = {
      ...baselines.training,
      ...(baselines.holdout ? { holdout: baselines.holdout } : {}),
      ...(baselines.hard ? { hard: baselines.hard } : {}),
      sets: summaries,
    };
    fs.writeFileSync(BASELINE_FILE, `${JSON.stringify(file, null, 2)}\n`);
    // Per-receipt answers, for digging into a number: RECEIPT_RESULTS_OUT=/tmp/results.json
    if (process.env.RECEIPT_RESULTS_OUT) {
      const perReceipt = results().map(({ fixture, outcomes }) => ({
        id: fixture.id,
        set: setOf(fixture),
        expected: fixture.expected,
        outcomes: Object.fromEntries(
          PASSES.map((pass) => [
            pass,
            {
              parsed: outcomes[pass].parsed,
              merchant: outcomes[pass].merchant,
              total: outcomes[pass].total,
              date: outcomes[pass].date,
              failure: outcomes[pass].failure,
            },
          ]),
        ),
      }));
      fs.writeFileSync(process.env.RECEIPT_RESULTS_OUT, JSON.stringify(perReceipt));
    }
    expect(Object.values(baselines).reduce((n, b) => n + b!.receipts, 0)).toBe(fixtures.length);
  });
});

const COUNTRIES = ['US', 'CA', 'UK', 'MX', 'AU'];
const FIRST_HEADERS = [
  'big-centred',
  'same-size',
  'split-two-lines',
  'slogan-above',
  'store-id-above',
  'lowercase-mixed',
  'logo-only',
  'boxed-name',
];
const STRESSORS = [
  'small',
  'glare',
  'crease',
  'fold',
  'shadow',
  'motion',
  'faded',
  'two',
  'bgtext',
  'angle25',
];

type Rules = {
  minCount: number;
  headers: string[];
  distortions: string[];
  /** Share of receipts Vision must have read at least one raw line from. */
  readable: number;
  /** Receipts whose printed name must be found in the flattened page's upper half. */
  topDownMin: number;
  /** Each header style and each distortion level must hold at least n / floor receipts (0 = unchecked). */
  headerFloor: number;
  levelFloor: number;
  orientations: number[];
};

function harness(name: SetName, rules: Rules) {
  describe(`receipt bench harness: ${name}`, () => {
    const items = bySet(name);

    it(`loads at least ${rules.minCount} fixtures`, () => {
      expect(items.length).toBeGreaterThanOrEqual(rules.minCount);
    });

    it('keeps ids unique and fixture names equal to ids', () => {
      expect(new Set(items.map((f) => f.id)).size).toBe(items.length);
      for (const f of items) {
        expect(f.expected.id).toBe(f.id);
        expect(fs.existsSync(path.join(FIXTURE_DIR, `${f.id}.json`))).toBe(true);
        if (name !== 'training') expect(f.expected.set).toBe(name);
      }
    });

    it('has complete, plausible ground truth on every receipt', () => {
      const problems: string[] = [];
      for (const { expected, id } of items) {
        const check = (ok: boolean, what: string) => {
          if (!ok) problems.push(`${id}: ${what}`);
        };
        check(typeof expected.merchant === 'string' || expected.merchant === null, 'merchant');
        check(Number.isInteger(expected.totalCents) && expected.totalCents > 0, 'totalCents');
        check(Math.round(expected.total * 100) === expected.totalCents, 'total matches totalCents');
        check(/^2026-\d{2}-\d{2}$/.test(expected.date), 'date shape');
        check(expected.date >= '2026-01-01' && expected.date <= '2026-10-06', 'date range');
        check(COUNTRIES.includes(expected.country), 'country');
        check(['en', 'fr', 'es'].includes(expected.language), 'language');
        check(rules.headers.includes(expected.headerStyle), `headerStyle ${expected.headerStyle}`);
        check(rules.distortions.includes(expected.distortion), `distortion ${expected.distortion}`);
        check(rules.orientations.includes(expected.exifOrientation), 'exifOrientation');
        check(typeof expected.notes === 'string', 'notes');
        check(
          typeof expected.totalPrinted === 'string' && typeof expected.datePrinted === 'string',
          'printed strings',
        );
        if (name === 'hard') {
          check(
            Array.isArray(expected.stress) &&
              expected.stress.length > 0 &&
              expected.stress.every((x) => STRESSORS.includes(x)),
            'stress',
          );
          check(['training-frame', 'holdout-frame'].includes(expected.source ?? ''), 'source');
        }
      }
      expect(problems).toEqual([]);
    });

    it('expects no merchant only where the name is a drawn logo printed nowhere else', () => {
      const wrong = items
        .filter(({ expected }) => {
          const nowhere = expected.headerStyle === 'logo-only' && expected.logoHint === null;
          return (expected.merchant === null) !== nowhere;
        })
        .map((f) => f.id);
      expect(wrong).toEqual([]);
    });

    it('is balanced over the five markets and the languages', () => {
      const count = (pick: (e: Expected) => string) => {
        const tally: Record<string, number> = {};
        for (const { expected } of items) tally[pick(expected)] = (tally[pick(expected)] ?? 0) + 1;
        return tally;
      };
      const countries = count((e) => e.country);
      for (const country of COUNTRIES)
        expect(countries[country]).toBeGreaterThanOrEqual(items.length / 5 - 6);
      expect(count((e) => e.market)['CA_fr']).toBeGreaterThanOrEqual(items.length / 10 - 4);
      expect(count((e) => e.market)['CA_en']).toBeGreaterThanOrEqual(items.length / 10 - 4);
      if (rules.headerFloor) {
        const headers = count((e) => e.headerStyle);
        for (const header of FIRST_HEADERS)
          expect(headers[header] ?? 0).toBeGreaterThanOrEqual(items.length / rules.headerFloor);
      }
      if (rules.levelFloor) {
        const levels = count((e) => e.distortion);
        for (const level of rules.distortions)
          expect(levels[level] ?? 0).toBeGreaterThanOrEqual(items.length / rules.levelFloor);
      }
    });

    it('has Vision output in every pass, in the module’s line shape', () => {
      const problems: string[] = [];
      for (const fixture of items) {
        for (const pass of PASSES) {
          if (!Array.isArray(fixture[pass])) problems.push(`${fixture.id}/${pass}: not an array`);
          for (const line of fixture[pass]) {
            const finite = (['x', 'y', 'width', 'height'] as const).every((k) =>
              Number.isFinite(line[k]),
            );
            if (typeof line.text !== 'string' || !finite)
              problems.push(`${fixture.id}/${pass}: shape`);
            // Vision's boxes overhang the frame a little (worst on a bad crop); far outside means
            // pixels or an unflipped y, not a reading.
            else if (line.y < -0.1 || line.y > 1.1) problems.push(`${fixture.id}/${pass}: y`);
            else if ((line.candidates ?? []).length > 2)
              problems.push(`${fixture.id}/${pass}: cands`);
          }
        }
      }
      expect(problems).toEqual([]);
      const readable = items.filter((f) => f.raw.length > 0).length;
      expect(readable / items.length).toBeGreaterThan(rules.readable);
    });

    it('keeps y top-down: a printed name sits in the upper half of the flattened page', () => {
      const topHeaders = [
        'big-centred',
        'boxed-name',
        'same-size',
        'lowercase-mixed',
        'slogan-above',
        'sans-large',
      ];
      let checked = 0;
      let upper = 0;
      for (const { expected, flat } of items) {
        if (expected.merchant === null || !topHeaders.includes(expected.headerStyle)) continue;
        const needle = coreWords(expected.merchant).join('');
        const line = readingOrder(flat).find((l) => squash(l.text).includes(needle));
        if (!line) continue;
        checked += 1;
        if (line.y + line.height / 2 < 0.5) upper += 1;
      }
      expect(checked).toBeGreaterThan(rules.topDownMin);
      expect(upper / checked).toBeGreaterThan(0.9);
    });

    it('parses every receipt in every pass without throwing, each in under 50 ms', () => {
      const all = resultsFor(name);
      const crashed = all.flatMap((e) =>
        PASSES.filter((p) => e.outcomes[p].crashed).map((p) => `${e.fixture.id}/${p}`),
      );
      expect(crashed).toEqual([]);
      const slow = all.flatMap((e) =>
        PASSES.filter((p) => e.outcomes[p].ms >= 50).map(
          (p) => `${e.fixture.id}/${p}: ${e.outcomes[p].ms.toFixed(1)} ms`,
        ),
      );
      expect(slow).toEqual([]);
    });
  });
}

harness('training', {
  minCount: 240,
  headers: FIRST_HEADERS,
  distortions: ['clean', 'light', 'medium', 'heavy'],
  readable: 0.95,
  topDownMin: 100,
  headerFloor: 20,
  levelFloor: 12,
  orientations: [1, 6],
});
harness('holdout', {
  minCount: 140,
  headers: [...FIRST_HEADERS, 'sans-large', 'digital'],
  distortions: ['clean', 'light', 'medium', 'heavy'],
  readable: 0.95,
  topDownMin: 40,
  headerFloor: 40,
  levelFloor: 20,
  orientations: [1, 6],
});
harness('hard', {
  minCount: 70,
  headers: [...FIRST_HEADERS, 'sans-large'],
  distortions: ['stress'],
  readable: 0.9,
  topDownMin: 10,
  headerFloor: 0,
  levelFloor: 0,
  orientations: [1, 6, 8],
});

describe('the three sets are kept apart', () => {
  const training = bySet('training');
  const holdout = bySet('holdout');
  const hard = bySet('hard');

  it('shares no id and keeps the prefixes', () => {
    const ids = fixtures.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(training.some((f) => /^(hold|hard)-/.test(f.id))).toBe(false);
  });

  it('gives the holdout no template and no shop that the training set has', () => {
    const trainingTemplates = new Set(training.map((f) => f.expected.template));
    const trainingShops = new Set(
      training
        .filter((f) => f.expected.merchant)
        .map((f) => coreWords(f.expected.merchant!).join('')),
    );
    const templateOverlap = holdout.filter((f) => trainingTemplates.has(f.expected.template));
    const shopOverlap = holdout.filter(
      (f) => f.expected.merchant && trainingShops.has(coreWords(f.expected.merchant).join('')),
    );
    expect(templateOverlap.map((f) => f.id)).toEqual([]);
    expect(shopOverlap.map((f) => f.id)).toEqual([]);
  });

  it('has at least ten frames of its own in every market in the holdout', () => {
    const frames = new Map<string, Set<string>>();
    for (const f of holdout) {
      const country = f.expected.country;
      frames.set(country, (frames.get(country) ?? new Set()).add(f.expected.template));
    }
    for (const country of COUNTRIES)
      expect(frames.get(country)?.size ?? 0).toBeGreaterThanOrEqual(10);
  });

  it('covers every stressor in the hard set at least eight times', () => {
    for (const stressor of STRESSORS) {
      expect(
        hard.filter((f) => f.expected.stress?.includes(stressor)).length,
      ).toBeGreaterThanOrEqual(8);
    }
  });

  it('has digital receipts in all five markets and all three languages in the holdout', () => {
    const digital = holdout.filter((f) => f.expected.headerStyle === 'digital');
    expect(new Set(digital.map((f) => f.expected.country)).size).toBe(5);
    expect(new Set(digital.map((f) => f.expected.language)).size).toBe(3);
  });
});

describe('receipt bench harness: scoring', () => {
  describe('scoring rules', () => {
    it('ignores case, accents and punctuation', () => {
      expect(sameMerchant('RENO-DEPOT', 'Réno-Dépôt')).toBe(true);
      expect(sameMerchant("MACY'S", "Macy's")).toBe(true);
      expect(sameMerchant('wal-mart', 'Walmart')).toBe(true);
      expect(sameMerchant('A&W', 'A&W')).toBe(true);
    });

    it('tolerates a leading THE and a legal or store-type suffix', () => {
      expect(sameMerchant('HOME DEPOT', 'The Home Depot')).toBe(true);
      expect(sameMerchant('THE HOME DEPOT', 'The Home Depot')).toBe(true);
      expect(sameMerchant('WALMART SUPERCENTER', 'Walmart')).toBe(true);
      expect(sameMerchant('TARGET CORPORATION', 'Target')).toBe(true);
      expect(sameMerchant('Shoppers Drug Mart Inc.', 'Shoppers Drug Mart')).toBe(true);
      expect(sameMerchant('Costco Wholesale Stores', 'Costco Wholesale')).toBe(true);
    });

    it('ignores the spaces Vision adds or drops', () => {
      expect(sameMerchant('BESTBUY', 'Best Buy')).toBe(true);
      expect(sameMerchant("MACY 'S", "Macy's")).toBe(true);
      expect(sameMerchant('TIM HORTONS', 'Tim Hortons')).toBe(true);
    });

    it('does not accept a different or partial name', () => {
      expect(sameMerchant('THE HOME', 'The Home Depot')).toBe(false);
      expect(sameMerchant('DEPOT', 'The Home Depot')).toBe(false);
      expect(sameMerchant('WALMART DE MEXICO', 'Walmart')).toBe(false);
      expect(sameMerchant('Store 1234', 'Target')).toBe(false);
      expect(sameMerchant('', 'Target')).toBe(false);
    });

    it('reads a bare web address as the shop', () => {
      expect(sameMerchant('www.target.com', 'Target')).toBe(true);
      expect(sameMerchant('www.homedepot.com', 'The Home Depot')).toBe(true);
    });

    it('scores a null expectation as correct only when nothing is returned', () => {
      expect(scoreMerchant(null, undefined)).toBe('null-correct');
      expect(scoreMerchant(null, 'Store 1234')).toBe('null-wrong');
      expect(scoreMerchant('Target', undefined)).toBe('missed');
      expect(scoreMerchant('Target', 'TARGET')).toBe('correct');
      expect(scoreMerchant('Target', 'Walmart')).toBe('wrong');
    });

    it('scores totals to the cent and dates exactly', () => {
      expect(scoreTotal(673, 6.73)).toBe('correct');
      expect(scoreTotal(673, 6.72)).toBe('wrong');
      expect(scoreTotal(123456, 1234.56)).toBe('correct');
      expect(scoreTotal(673, undefined)).toBe('missed');
      expect(scoreDate('2026-10-06', '2026-10-06')).toBe('correct');
      expect(scoreDate('2026-10-06', '2026-06-10')).toBe('wrong');
    });

    it('finds a printed amount in Vision output whatever the separators', () => {
      const line = (text: string): ParsedLine => ({ text, x: 0, y: 0, width: 1, height: 0.01 });
      expect(amountInLines([line('TOTAL 1 234,56 $')], '1 234,56')).toBe(true);
      expect(amountInLines([line('393.75 USD')], '393.75')).toBe(true);
      expect(amountInLines([line('1393.75')], '393.75')).toBe(false);
    });
  });
});
