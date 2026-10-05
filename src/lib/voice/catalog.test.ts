import { readFileSync } from 'fs';
import { join } from 'path';

import { guessCategory } from '@/api/brands';
import { sentenceText, VOICE_EXAMPLES } from '@/data/voice-examples';

import { guessSpendCategory } from './merchant';
import { parseVoice } from './parse';
import type { BrandRow } from './types';

// brands.ts imports the Supabase client, which refuses to load without env.
jest.mock('@/lib/supabase', () => ({ supabase: {} }));

/**
 * The real catalog, read from the migration that seeds it, so these checks
 * run against every name and alias the app ships — the place where an
 * everyday word ("medium", "lemonade", "good food") could turn into a brand.
 */
function realCatalog(): BrandRow[] {
  const sql = readFileSync(
    join(__dirname, '../../../supabase/migrations/20260829100005_brands_with_billers.sql'),
    'utf8',
  );
  const pattern =
    /\('([^']+)', '((?:[^']|'')+)', (?:'([^']*)'|null), array\[([^\]]*)\]::text\[\], '([^']+)', '([^']+)', (\d+)\)/g;
  const rows: { row: BrandRow; rank: number }[] = [];
  for (const match of sql.matchAll(pattern)) {
    rows.push({
      rank: Number(match[7]),
      row: {
        id: match[1],
        name: match[2].replace(/''/g, "'"),
        domain: match[3] ?? null,
        category_id: match[5],
        logo_path: null,
        aliases: (match[4].match(/'((?:[^']|'')*)'/g) ?? []).map((alias) =>
          alias.slice(1, -1).replace(/''/g, "'"),
        ),
      },
    });
  }
  // useBrandDirectory orders by rank, highest first.
  return rows.sort((a, b) => b.rank - a.rank).map(({ row }) => row);
}

const CATALOG = realCatalog();
const parse = (said: string) =>
  parseVoice([said], { today: '2026-10-01', directory: CATALOG, aliases: {} });

/**
 * The hints exactly as the voice page shows them (src/data/voice-examples.ts),
 * each pinned below to what it must read back as on Thursday 1 Oct 2026. A
 * sentence added or reworded on the page without a pinned row here fails the
 * suite, so the page and the parser cannot drift.
 */
const SHOWN = VOICE_EXAMPLES.map(({ kind, parts }) => ({ kind, parts, said: sentenceText(parts) }));

type Pinned = {
  amount: number;
  merchant: string | null;
  date: string | null;
  cycle: string | null;
  category: string | null;
};

const PINNED: Record<string, Pinned> = {
  'Spent $12.50 at Starbucks today': {
    amount: 12.5,
    merchant: 'Starbucks',
    date: '2026-10-01',
    cycle: null,
    category: null,
  },
  'Electric bill $85, due on the 15th': {
    amount: 85,
    merchant: null,
    date: '2026-10-15',
    cycle: null,
    category: 'energy',
  },
  'Netflix $15.99 every month': {
    amount: 15.99,
    merchant: 'Netflix',
    date: null,
    cycle: 'monthly',
    category: null,
  },
};

describe('the hints on the voice page', () => {
  it('pins every sentence the page shows, and only those', () => {
    expect(SHOWN.map((example) => example.said).sort()).toEqual(Object.keys(PINNED).sort());
    expect(SHOWN).toHaveLength(3);
  });
});

describe('against the real brand catalog', () => {
  it('reads the whole catalog from the migration', () => {
    expect(CATALOG.length).toBeGreaterThan(300);
  });

  it.each([
    'a medium coffee 4 bucks',
    'bought lemonade 3 bucks',
    'root beer 3 dollars',
    'prime rib dinner 45',
    'brussels sprouts 4',
    'good food 20 bucks',
    'bought a ring 200',
    'my office rent 2000',
    'subway fare 2.90',
    'lunch with sarah 20',
    'super 8 motel 90',
    'paid 40 for safety glasses',
    'public transit 2.50',
    'new bed sheets 40',
    'golf course 60',
    'had a calm day',
    'hello there',
    'wait a second',
    'shell out 45 for dinner',
  ])('finds no brand in %j', (said) => {
    expect(parse(said).merchant).toBeNull();
  });

  it.each([
    ['comcast 79.99', 'Xfinity'],
    ['Spent $12.50 at Starbucks', 'Starbucks'],
    ['seven eleven 12.40', '7-Eleven'],
    ['7-Eleven 12.40', '7-Eleven'],
    ['t mobile 70 monthly', 'T-Mobile'],
    ['AT&T 80 a month', 'AT&T'],
    ['PG&E 140', 'PG&E'],
    ['duke energy 120', 'Duke Energy'],
    ['paid 45 at shell', 'Shell'],
    ['Amazon Prime $139 a year', 'Amazon'],
    ['icloud 2.99 monthly', 'Apple'],
    ['chick fil a 12', 'Chick-fil-A'],
    ["mcdonald's 8", "McDonald's"],
    ["trader joe's 60", "Trader Joe's"],
    ['wal mart 30', 'Walmart'],
    ['door dash 25', 'DoorDash'],
    ['spot a fly', 'Spotify'],
    ['come cast 80', 'Xfinity'],
    ['No Frills groceries 40', 'No Frills'],
    ['hbo max 15.99 a month', 'HBO Max'],
    ['the new york times 4 a week', 'The New York Times'],
    ['progressive insurance 140 a month', 'Progressive'],
    ['spent 20 at the gap', 'Gap'],
  ])('finds the brand in %j', (said, name) => {
    expect(parse(said).merchant?.name).toBe(name);
  });

  it.each(SHOWN.map((example) => [example.said, example] as const))(
    'reads the example %j back exactly',
    (said, { kind, parts }) => {
      const draft = parse(said);
      const pinned = PINNED[said];
      expect(pinned).toBeDefined();
      expect({
        kind: draft.kind,
        amount: draft.amount,
        choices: draft.amountChoices,
        merchant: draft.merchant?.name ?? null,
        date: draft.date,
        cycle: draft.cycle,
        category: draft.billCategoryId,
      }).toEqual({ kind, choices: [], ...pinned });

      // What the page puts in bold is what comes back: the brand shown is one
      // of the bold words, and the amount is the one bold figure that reads as
      // money on its own.
      const bold = parts.filter((part) => part.strong).map((part) => part.text);
      if (draft.merchant) expect(bold).toContain(draft.merchant.name);
      const boldAmounts = bold
        .map((text) => parse(text).amount)
        .filter((amount): amount is number => amount !== null);
      expect(boldAmounts).toEqual([draft.amount]);
    },
  );

  // A card or wallet named as how it was paid is never the merchant.
  it.each([
    ['paid $20 at Target on my Amex', 'Target'],
    ['paid $20 at Target with Apple Pay', 'Target'],
    ['spent 40 at Target using my Citi card', 'Target'],
    ['$999 at the Apple Store with my Visa', 'Apple'],
    ['$12 at Starbucks with Google Pay', 'Starbucks'],
    ['$20 on my Amex', null],
    ['$20 with Google Pay', null],
    ['Wells Fargo mortgage 1800 due on the 1st', 'Wells Fargo'],
  ])('reads %j as paid to %p', (said, name) => {
    expect(parse(said).merchant?.name ?? null).toBe(name);
  });

  it('keeps every brand-suggested bill category a real one', () => {
    for (const said of ['comcast 80 due on the 5th', 'mint mobile 15 a month', 'duke energy 120']) {
      expect(['internet', 'mobile', 'energy']).toContain(parse(said).billCategoryId);
    }
  });
});

describe('guessSpendCategory', () => {
  it('matches guessCategory in src/api/brands.ts for every rule', () => {
    for (const name of [
      "Joe's Diner",
      'Lucy Bakery',
      'Corner Market',
      'Main St Gas',
      'Downtown Pharmacy',
      'Glow Salon',
      'Paws Vet',
      'Iron Gym',
      'Ace Hardware Store',
      'Phone Repair',
      'Shoe Boutique',
      'City Parking',
      'Plain Name',
      '',
    ]) {
      expect(guessSpendCategory(name)).toBe(guessCategory(name));
    }
  });
});
