import type { ChargeRow } from '@/api/charges';
import type { PayRow } from '@/api/pay';
import {
  ledgerEntries,
  type BillRow,
  type LedgerEntry,
  type LedgerInput,
  type LedgerPayoff,
  type ReceiptRow,
  type SalaryDetailRow,
  type SubscriptionRow,
} from '@/api/queries';
import { monthBounds } from '@/lib/bill-month';
import {
  CURRENT_PERIOD,
  categoryLookups,
  categoryTotals,
  heroFigures,
  insightsBuckets,
  insightsRange,
  merchantTotals,
  spendByBucket,
  spendSummary,
  type InsightsPeriod,
} from '@/lib/insights';
import { scheduledPerMonth } from '@/lib/pay';

/**
 * The hero and every spending figure, read off the real ledger (`ledgerEntries`, which `useLedger`
 * runs) built from rows, never from hand-made entries, so a change in how the ledger lists money
 * shows up here. The design's account, seen on 12 Oct 2026: $10,000.00 pay on the 1st, Housing
 * $1,500.00 on the 1st and Hulu $99.99 on the 11th every month of 2026, AEP $150.00 first due
 * 22 Oct and Netflix $15.99 first due 9 Nov.
 */

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => null }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

const TODAY = '2026-10-12';
const CHECKING = 'acct-checking';
const CARD = 'card-visa';

function bill(id: string, fields: Partial<BillRow>): BillRow {
  return {
    id,
    name: id,
    amount: 0,
    category_id: 'other',
    icon_id: null,
    recurrence: 'monthly',
    next_due_on: null,
    starts_on: null,
    ends_on: null,
    card_id: null,
    bank_account_id: CHECKING,
    created_at: '2025-12-01T12:00:00Z',
    ...fields,
  };
}

function subscription(id: string, fields: Partial<SubscriptionRow>): SubscriptionRow {
  return {
    id,
    brand_id: null,
    name: id,
    amount: 0,
    cycle: 'monthly',
    next_renewal_on: null,
    started_on: null,
    created_at: '2025-12-01T12:00:00Z',
    category_id: 'other',
    card_id: CARD,
    bank_account_id: null,
    note: null,
    active: true,
    brands: null,
    ...fields,
  };
}

function receipt(
  id: string,
  merchant: string,
  amount: number,
  on: string,
  fields: Partial<ReceiptRow> = {},
): ReceiptRow {
  return {
    id,
    brand_id: null,
    merchant,
    amount,
    purchased_on: on,
    category_id: 'other',
    card_id: CARD,
    bank_account_id: null,
    note: null,
    source: 'manual',
    image_path: null,
    brands: null,
    ...fields,
  };
}

type Salary = LedgerInput['salaries'][number];

function salary(
  id: string,
  fields: Partial<Pick<SalaryDetailRow, 'amount' | 'frequency' | 'last_payday'>>,
): Salary {
  return {
    id,
    name: id,
    amount: 0,
    frequency: 'monthly',
    last_payday: null,
    account_ids: [CHECKING],
    ...fields,
  };
}

function charges(
  plan: { bill?: string; subscription?: string },
  label: string,
  amount: number,
  on: readonly string[],
): ChargeRow[] {
  return on.map((date) => ({
    id: `${plan.bill ?? plan.subscription}-${date}`,
    bill_id: plan.bill ?? null,
    subscription_id: plan.subscription ?? null,
    label,
    amount,
    charged_on: date,
    card_id: plan.subscription ? CARD : null,
    bank_account_id: plan.bill ? CHECKING : null,
  }));
}

function paid(salaryId: string, amount: number, on: readonly string[]): PayRow[] {
  return on.map((date) => ({
    id: `${salaryId}-${date}`,
    salary_source_id: salaryId,
    label: salaryId,
    amount,
    paid_on: date,
    bank_account_id: CHECKING,
  }));
}

/** The nth of each month from January to `last` (1-based), 2026. */
const monthly = (day: number, last = 10) =>
  Array.from(
    { length: last },
    (_, index) => `2026-${String(index + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  );

type World = Omit<LedgerInput, 'from' | 'to' | 'today'>;

const EMPTY: World = {
  receipts: [],
  subscriptions: [],
  bills: [],
  salaries: [],
  charges: [],
  pay: [],
  payoffs: [],
  accountOrder: [CHECKING],
};

const DESIGN: World = {
  ...EMPTY,
  salaries: [salary('Salary', { amount: 10_000, frequency: 'monthly', last_payday: '2026-10-01' })],
  pay: paid('Salary', 10_000, monthly(1)),
  bills: [
    bill('housing', {
      name: 'Housing',
      amount: 1500,
      category_id: 'housing',
      next_due_on: '2026-11-01',
      starts_on: '2026-01-01',
    }),
    bill('aep', {
      name: 'AEP',
      amount: 150,
      category_id: 'energy',
      next_due_on: '2026-10-22',
      starts_on: '2026-10-22',
      created_at: '2026-10-02T12:00:00Z',
    }),
  ],
  subscriptions: [
    subscription('hulu', {
      name: 'Hulu',
      amount: 99.99,
      next_renewal_on: '2026-11-11',
      started_on: '2026-01-11',
    }),
    subscription('netflix', {
      name: 'Netflix',
      amount: 15.99,
      next_renewal_on: '2026-11-09',
      started_on: '2026-11-09',
      created_at: '2026-10-02T12:00:00Z',
    }),
  ],
  charges: [
    ...charges({ bill: 'housing' }, 'Housing', 1500, monthly(1)),
    ...charges({ subscription: 'hulu' }, 'Hulu', 99.99, monthly(11)),
  ],
};

function ledger(world: World, range: { from: string; to: string }, today = TODAY): LedgerEntry[] {
  return ledgerEntries({ ...world, ...range, today });
}

/** What the page reads for the hero: the ledger over the whole current month. */
const heroOf = (world: World, today = TODAY) =>
  heroFigures(ledger(world, monthBounds(today.slice(0, 7)), today), today);

/** What the page reads for What goes out: the ledger over the period, cut at today. */
const periodLedger = (world: World, period: InsightsPeriod = CURRENT_PERIOD, today = TODAY) =>
  ledger(world, insightsRange(period, today), today);

const YEAR: InsightsPeriod = { mode: 'year', month: null, year: null };

describe('F3 the hero', () => {
  it('reads the design: $8,400.01 left, $10,000.00 in, $1,599.99 out, 16%', () => {
    expect(heroOf(DESIGN)).toEqual({
      in: 10_000,
      out: 1599.99,
      left: 8400.01,
      over: false,
      spentPercent: 16,
      belowOnePercent: false,
    });
  });

  it('counts each payday in the month: weekly $1,000 is $5,000 in a five-Friday October', () => {
    const weekly = salary('Weekly', {
      amount: 1000,
      frequency: 'weekly',
      last_payday: '2026-10-02',
    });
    expect(heroOf({ ...EMPTY, salaries: [weekly] }).in).toBe(5000);
    // What comes in keeps its every-month figure, which is why the two are labelled apart.
    expect(scheduledPerMonth([{ amount: 1000, frequency: 'weekly', payday: '2026-10-02' }])).toBe(
      4333.33,
    );
  });

  it('adds pay in whole cents: five weekly $1,024.36 are $5,121.80 exactly', () => {
    // 1024.36 × 100 is 102435.99999999999 in a float.
    const weekly = salary('Weekly', {
      amount: 1024.36,
      frequency: 'weekly',
      last_payday: '2026-10-02',
    });
    expect(heroOf({ ...EMPTY, salaries: [weekly] })).toEqual({
      in: 5121.8,
      out: 0,
      left: 5121.8,
      over: false,
      spentPercent: 0,
      belowOnePercent: false,
    });
  });

  it('counts pay on the record as it landed and the rest from the schedule, none twice', () => {
    const weekly = salary('Weekly', {
      amount: 1000,
      frequency: 'weekly',
      last_payday: '2026-10-02',
    });
    const world = {
      ...EMPTY,
      salaries: [weekly],
      // The 9th landed with overtime; the 16th, 23rd and 30th are still to come.
      pay: [...paid('Weekly', 1000, ['2026-10-02']), ...paid('Weekly', 1000.5, ['2026-10-09'])],
    };
    expect(heroOf(world).in).toBe(5000.5);
  });

  it('counts a one-off paid this month, still to come or not, and none from another month', () => {
    const world = {
      ...DESIGN,
      salaries: [
        ...DESIGN.salaries,
        salary('Bonus', { amount: 250, frequency: 'once', last_payday: '2026-10-20' }),
        salary('Refund', { amount: 80, frequency: 'once', last_payday: '2026-09-30' }),
        salary('Gift', { amount: 40, frequency: 'once', last_payday: '2026-11-01' }),
      ],
    };
    expect(heroOf(world)).toMatchObject({
      in: 10_250,
      out: 1599.99,
      left: 8650.01,
      spentPercent: 16,
    });
  });

  it('leaves out spending still to come this month: AEP on the 22nd is not spent on the 12th', () => {
    expect(heroOf(DESIGN, '2026-10-21').out).toBe(1599.99);
    expect(heroOf(DESIGN, '2026-10-22').out).toBe(1749.99);
  });

  it('says over, with the amount below zero, once more went out than came in', () => {
    const world = {
      ...DESIGN,
      salaries: [
        salary('Salary', { amount: 1000, frequency: 'monthly', last_payday: '2026-10-01' }),
      ],
      pay: paid('Salary', 1000, ['2026-10-01']),
    };
    expect(heroOf(world)).toEqual({
      in: 1000,
      out: 1599.99,
      left: -599.99,
      over: true,
      spentPercent: 160,
      belowOnePercent: false,
    });
  });

  it('hides the percent with no pay this month, and is over by what was spent', () => {
    const world = { ...DESIGN, salaries: [], pay: [] };
    expect(heroOf(world)).toEqual({
      in: 0,
      out: 1599.99,
      left: -1599.99,
      over: true,
      spentPercent: null,
      belowOnePercent: false,
    });
    expect(heroOf(EMPTY)).toEqual({
      in: 0,
      out: 0,
      left: 0,
      over: false,
      spentPercent: null,
      belowOnePercent: false,
    });
  });

  it('flags spending that rounds to 0% of income but is not nothing', () => {
    const salaried = {
      ...EMPTY,
      salaries: [
        salary('Salary', { amount: 10_000, frequency: 'monthly', last_payday: '2026-10-01' }),
      ],
      pay: paid('Salary', 10_000, ['2026-10-01']),
    };
    const shareOf = (amount: number) => {
      const receipts = amount > 0 ? [receipt('r', 'Gum', amount, '2026-10-05')] : [];
      const hero = heroOf({ ...salaried, receipts });
      return [amount, hero.spentPercent, hero.belowOnePercent];
    };
    expect([0.01, 49.99, 50, 0].map(shareOf)).toEqual([
      [0.01, 0, true],
      [49.99, 0, true],
      // 0.5% rounds half up.
      [50, 1, false],
      [0, 0, false],
    ]);
  });

  it('reads only the current month, whatever else the entries hold', () => {
    const wide = ledger(DESIGN, { from: '2026-09-01', to: '2026-11-30' });
    expect(heroFigures(wide, TODAY)).toEqual(heroOf(DESIGN));
  });

  it('reads 1 Oct and 31 Oct', () => {
    expect(heroOf(DESIGN, '2026-10-01')).toMatchObject({
      in: 10_000,
      out: 1500,
      left: 8500,
      spentPercent: 15,
    });
    expect(heroOf(DESIGN, '2026-10-31')).toMatchObject({
      out: 1749.99,
      left: 8250.01,
      spentPercent: 17,
    });
  });
});

describe('F4 every sum is in whole cents', () => {
  it('adds three $0.10 receipts and one $0.20 to exactly $0.50', () => {
    const world = {
      ...EMPTY,
      receipts: [
        receipt('r1', 'Gum', 0.1, '2026-10-02'),
        receipt('r2', 'Gum', 0.1, '2026-10-03'),
        receipt('r3', 'Gum', 0.1, '2026-10-04'),
        receipt('r4', 'Gum', 0.2, '2026-10-05'),
      ],
    };
    const entries = periodLedger(world);
    expect(spendSummary(entries)).toEqual({
      receipts: 0.5,
      bills: 0,
      subscriptions: 0,
      total: 0.5,
      count: 4,
    });
    expect(heroOf(world).out).toBe(0.5);
    expect(merchantTotals(entries)[0].amount).toBe(0.5);
    expect(categoryTotals(entries, categoryLookups(world.receipts, []))[0].amount).toBe(0.5);
    const bars = spendByBucket(entries, insightsBuckets(CURRENT_PERIOD, TODAY));
    // 2nd and 3rd on 1–3; 4th and 5th (0.10 + 0.20, a float's 0.30000000000000004) on 4–10.
    expect(bars.map((bar) => bar.amount)).toEqual([0.2, 0.3, 0, 0, 0]);
  });

  it('adds ten $0.10 receipts to exactly $1.00, which a float sum does not', () => {
    const receipts = Array.from({ length: 10 }, (_, index) =>
      receipt(`r${index}`, 'Gum', 0.1, '2026-10-02'),
    );
    expect(receipts.reduce((sum, row) => sum + row.amount, 0)).not.toBe(1);
    const entries = periodLedger({ ...EMPTY, receipts });
    expect(spendSummary(entries).total).toBe(1);
    expect(spendByBucket(entries, insightsBuckets(CURRENT_PERIOD, TODAY))[0].amount).toBe(1);
  });

  it('never counts pay as spending, whatever its sign', () => {
    const entries: LedgerEntry[] = [
      { id: 'r', label: 'Gum', amount: -1.25, date: '2026-10-02', kind: 'receipt', sourceId: CARD },
      // A pay correction written as money out is still pay.
      { id: 'p', label: 'Salary', amount: -50, date: '2026-10-03', kind: 'income', sourceId: '' },
      { id: 'q', label: 'Salary', amount: 900, date: '2026-10-01', kind: 'income', sourceId: '' },
    ];
    expect(spendSummary(entries)).toEqual({
      receipts: 1.25,
      bills: 0,
      subscriptions: 0,
      total: 1.25,
      count: 1,
    });
    expect(heroFigures(entries, TODAY)).toMatchObject({ in: 900, out: 1.25 });
    expect(spendByBucket(entries, insightsBuckets(CURRENT_PERIOD, TODAY))[0].amount).toBe(1.25);
    expect(merchantTotals(entries).map((row) => row.name)).toEqual(['Gum']);
    expect(categoryTotals(entries, categoryLookups([], []))).toEqual([
      { id: 'other', amount: 1.25, count: 1 },
    ]);
  });

  it('makes the bars add up to the card’s total, to the cent, in Month and Year', () => {
    const world = {
      ...DESIGN,
      receipts: Array.from({ length: 40 }, (_, index) =>
        receipt(
          `r${index}`,
          `Shop ${index % 7}`,
          0.01 + index * 1.37,
          `2026-${String((index % 10) + 1).padStart(2, '0')}-${String((index % 27) + 1).padStart(2, '0')}`,
        ),
      ),
    };
    for (const period of [
      CURRENT_PERIOD,
      YEAR,
      { mode: 'month', month: '2026-02', year: null } as const,
    ]) {
      const entries = periodLedger(world, period);
      const bars = spendByBucket(entries, insightsBuckets(period, TODAY));
      const barCents = bars.reduce((sum, bar) => sum + Math.round(bar.amount * 100), 0);
      expect([period.mode, period.month, barCents]).toEqual([
        period.mode,
        period.month,
        Math.round(spendSummary(entries).total * 100),
      ]);
    }
  });
});

describe('the design’s What goes out card', () => {
  it('reads October: $1,599.99, $1,500.00 on 1–3 and $99.99 on 11–17', () => {
    const entries = periodLedger(DESIGN);
    expect(spendSummary(entries)).toEqual({
      receipts: 0,
      bills: 1500,
      subscriptions: 99.99,
      total: 1599.99,
      count: 2,
    });
    expect(
      spendByBucket(entries, insightsBuckets(CURRENT_PERIOD, TODAY)).map((bar) => [
        bar.label,
        bar.amount,
      ]),
    ).toEqual([
      ['1–3', 1500],
      ['4–10', 0],
      ['11–17', 99.99],
      ['18–24', 0],
      ['25–31', 0],
    ]);
  });

  it('reads 2026: $15,999.90, $1,599.99 in each month to October and nothing after', () => {
    const entries = periodLedger(DESIGN, YEAR);
    expect(spendSummary(entries)).toEqual({
      receipts: 0,
      bills: 15_000,
      subscriptions: 999.9,
      total: 15_999.9,
      count: 20,
    });
    expect(spendByBucket(entries, insightsBuckets(YEAR, TODAY)).map((bar) => bar.amount)).toEqual([
      ...Array(10).fill(1599.99),
      0,
      0,
    ]);
  });
});

describe('F5 the hero’s out is What goes out’s figure for this month', () => {
  const WORLD: World = {
    ...DESIGN,
    bills: [
      ...DESIGN.bills,
      // Never recorded: the ledger projects its past from its schedule.
      bill('gym', {
        name: 'Gym',
        amount: 45.5,
        recurrence: 'weekly',
        next_due_on: '2026-09-04',
        starts_on: '2026-09-04',
        created_at: '2026-09-01T12:00:00Z',
      }),
    ],
    subscriptions: [
      ...DESIGN.subscriptions,
      subscription('cloud', {
        name: 'Cloud',
        amount: 2.99,
        cycle: 'weekly',
        next_renewal_on: '2026-10-06',
        started_on: '2026-09-01',
      }),
    ],
    receipts: [
      receipt('a', 'Bakery', 6.4, '2026-10-01'),
      receipt('b', 'Bakery', 3.35, '2026-10-12'),
      receipt('c', 'Hardware', 120.07, '2026-10-19'),
      receipt('d', 'Bakery', 9.99, '2026-10-31'),
    ],
  };

  it('agrees to the cent on every day of October', () => {
    for (let day = 1; day <= 31; day += 1) {
      const today = `2026-10-${String(day).padStart(2, '0')}`;
      const hero = heroOf(WORLD, today).out;
      const out = spendSummary(periodLedger(WORLD, CURRENT_PERIOD, today)).total;
      expect([today, hero]).toEqual([today, out]);
    }
  });
});

describe('F6 loan payoffs count as bills; what does not count toward spending does not', () => {
  const WORLD: World = {
    ...DESIGN,
    bills: [
      ...DESIGN.bills,
      bill('car', {
        name: 'Car loan',
        amount: 424.8,
        category_id: 'loans',
        icon_id: 'loan-car',
        next_due_on: '2026-10-27',
        starts_on: '2026-01-27',
      }),
      // "Add to monthly bills" off: its payments are not spending.
      bill('boat', {
        name: 'Boat loan',
        amount: 300,
        category_id: 'loans',
        icon_id: 'loan-other',
        next_due_on: '2026-10-03',
        starts_on: '2026-01-03',
        in_spending: false,
      }),
    ],
    charges: [
      ...DESIGN.charges,
      ...charges({ bill: 'car' }, 'Car loan', 424.8, monthly(27, 9)),
      // Recorded while the boat loan still counted: that money went out.
      ...charges({ bill: 'boat' }, 'Boat loan', 300, ['2026-08-03']),
    ],
    payoffs: [
      {
        id: 'p1',
        bill_id: 'car',
        paid_on: '2026-10-05',
        amount: 2000,
        kind: 'partial',
        card_id: null,
        bank_account_id: CHECKING,
        counted: true,
      },
      {
        id: 'p2',
        bill_id: 'boat',
        paid_on: '2026-10-06',
        amount: 1000,
        kind: 'partial',
        card_id: null,
        bank_account_id: CHECKING,
        counted: false,
      },
    ] satisfies LedgerPayoff[],
  };

  it('adds the counted payoff to Bills and the hero, and nothing of the uncounted loan', () => {
    const entries = periodLedger(WORLD);
    expect(spendSummary(entries)).toEqual({
      receipts: 0,
      bills: 3500,
      subscriptions: 99.99,
      total: 3599.99,
      count: 3,
    });
    expect(heroOf(WORLD)).toMatchObject({ out: 3599.99, left: 6400.01, spentPercent: 36 });
  });

  it('never adds a loan’s instalment from its schedule on top of its recorded charge', () => {
    // September: Housing, Hulu and the car loan's one recorded instalment.
    const september = periodLedger(WORLD, { mode: 'month', month: '2026-09', year: null });
    expect(spendSummary(september).bills).toBe(1924.8);
  });

  it('keeps a charge the uncounted loan recorded while it counted', () => {
    const august = periodLedger(WORLD, { mode: 'month', month: '2026-08', year: null });
    expect(spendSummary(august).bills).toBe(1500 + 424.8 + 300);
  });

  it('files the payoff under the loan, by name and category', () => {
    const entries = periodLedger(WORLD);
    expect(merchantTotals(entries).map((row) => [row.name, row.amount, row.count])).toEqual([
      ['Car loan', 2000, 1],
      ['Housing', 1500, 1],
      ['Hulu', 99.99, 1],
    ]);
    expect(categoryTotals(entries, categoryLookups([], WORLD.subscriptions))).toEqual([
      { id: 'loans', amount: 2000, count: 1 },
      { id: 'housing', amount: 1500, count: 1 },
      { id: 'other', amount: 99.99, count: 1 },
    ]);
  });
});

describe('F7 where it goes', () => {
  it('reads the design: Housing $1,500.00, Other $99.99; the year $15,000.00 and $999.90', () => {
    const lookups = categoryLookups([], DESIGN.subscriptions);
    expect(categoryTotals(periodLedger(DESIGN), lookups)).toEqual([
      { id: 'housing', amount: 1500, count: 1 },
      { id: 'other', amount: 99.99, count: 1 },
    ]);
    expect(categoryTotals(periodLedger(DESIGN, YEAR), lookups)).toEqual([
      { id: 'housing', amount: 15_000, count: 10 },
      { id: 'other', amount: 999.9, count: 10 },
    ]);
  });

  it('files receipts and subscriptions under their own categories, not Other', () => {
    const world = {
      ...EMPTY,
      receipts: [
        receipt('t1', 'Target', 42.1, '2026-10-03', { category_id: 'shopping' }),
        receipt('t2', 'Kroger', 88.45, '2026-10-04', { category_id: 'groceries' }),
      ],
      subscriptions: [
        subscription('spotify', {
          name: 'Spotify',
          amount: 11.99,
          category_id: 'entertainment',
          next_renewal_on: '2026-11-08',
          started_on: '2026-10-08',
        }),
      ],
      charges: charges({ subscription: 'spotify' }, 'Spotify', 11.99, ['2026-10-08']),
    };
    const entries = periodLedger(world);
    expect(categoryTotals(entries, categoryLookups(world.receipts, world.subscriptions))).toEqual([
      { id: 'groceries', amount: 88.45, count: 1 },
      { id: 'shopping', amount: 42.1, count: 1 },
      { id: 'entertainment', amount: 11.99, count: 1 },
    ]);
    // Without the rows, every one of them is Other: the ledger carries a category on bills only.
    expect(categoryTotals(entries, categoryLookups([], []))).toEqual([
      { id: 'other', amount: 142.54, count: 3 },
    ]);
  });

  it('counts a bill in a retired category under the one it became', () => {
    const world = {
      ...EMPTY,
      bills: [
        bill('dentist', {
          name: 'Dentist',
          amount: 60,
          category_id: 'family',
          next_due_on: '2026-11-02',
          starts_on: '2026-10-02',
        }),
        bill('pharmacy', {
          name: 'Pharmacy',
          amount: 12.5,
          category_id: 'health',
          next_due_on: '2026-11-03',
          starts_on: '2026-10-03',
        }),
      ],
    };
    expect(categoryTotals(periodLedger(world), categoryLookups([], []))).toEqual([
      { id: 'health', amount: 72.5, count: 2 },
    ]);
  });

  it('keeps the six biggest, equal amounts by id, and every category adds up to the total', () => {
    const ids = ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
    const receipts = ids.map((id, index) =>
      receipt(id, `Shop ${id}`, index < 2 ? 5 : 10 + index, '2026-10-05', {
        category_id: `cat-${id}`,
      }),
    );
    const entries = periodLedger({ ...EMPTY, receipts });
    const lookups = categoryLookups(receipts, []);
    expect(categoryTotals(entries, lookups).map((row) => row.id)).toEqual([
      'cat-a',
      'cat-b',
      'cat-c',
      'cat-d',
      'cat-e',
      'cat-f',
    ]);
    // Two at $5.00: by id.
    expect(
      categoryTotals(entries, lookups, 8)
        .slice(6)
        .map((row) => row.id),
    ).toEqual(['cat-g', 'cat-h']);
    const all = categoryTotals(entries, lookups, Infinity);
    expect(all.reduce((sum, row) => sum + Math.round(row.amount * 100), 0)).toBe(
      Math.round(spendSummary(entries).total * 100),
    );
  });
});

describe('F8 where you spend most', () => {
  const at = (
    id: string,
    label: string,
    amount: number,
    fields: Partial<LedgerEntry> = {},
  ): LedgerEntry => ({
    id,
    label,
    amount: -amount,
    date: '2026-10-05',
    kind: 'receipt',
    sourceId: CARD,
    ...fields,
  });

  it('reads the design: Housing then Hulu, once each in October and ten times in 2026', () => {
    expect(
      merchantTotals(periodLedger(DESIGN)).map((row) => [
        row.name,
        row.amount,
        row.count,
        row.kind,
      ]),
    ).toEqual([
      ['Housing', 1500, 1, 'bill'],
      ['Hulu', 99.99, 1, 'subscription'],
    ]);
    expect(
      merchantTotals(periodLedger(DESIGN, YEAR)).map((row) => [row.name, row.amount, row.count]),
    ).toEqual([
      ['Housing', 15_000, 10],
      ['Hulu', 999.9, 10],
    ]);
  });

  it('orders by amount, then by times paid, then by name', () => {
    const entries = [
      at('c1', 'Coffee', 3),
      ...Array.from({ length: 10 }, (_, index) => at(`co${index}`, 'Coffee', 3)),
      at('r1', 'Rent', 31),
      at('k1', 'Cafe', 10),
      at('k2', 'Cafe', 10),
      at('k3', 'Cafe', 10),
      at('b1', 'Bakery', 30),
      at('z1', 'Beta', 7),
      at('a1', 'Alpha', 7),
    ];
    expect(merchantTotals(entries, 10).map((row) => [row.name, row.amount, row.count])).toEqual([
      ['Coffee', 33, 11],
      ['Rent', 31, 1],
      // $30.00 each: three times before once, though Bakery comes first by name.
      ['Cafe', 30, 3],
      ['Bakery', 30, 1],
      // $7.00 once each: by name.
      ['Alpha', 7, 1],
      ['Beta', 7, 1],
    ]);
    expect(merchantTotals(entries)).toHaveLength(5);
  });

  it('keeps the page’s logo rules: letters only when every row chose them and none has a website', () => {
    const entries = [
      at('n1', 'Netflix', 15.99, { kind: 'subscription', logoHidden: true }),
      at('n2', 'Netflix', 15.99, { kind: 'subscription', logoHidden: true }),
      at('t1', 'Target', 5, { logoHidden: true }),
      at('t2', 'Target', 5, { logoHidden: false }),
      at('c1', 'Calm', 4, { logoHidden: true }),
      at('c2', 'Calm', 4, { domain: 'calm.com' }),
      at('s1', 'Spotify', 3, { kind: 'subscription', logoHidden: true }),
      at('s2', 'Spotify', 3, { kind: 'subscription', logoHidden: true, domain: 'spotify.com' }),
    ];
    const byName = Object.fromEntries(merchantTotals(entries).map((row) => [row.name, row]));
    expect(byName.Netflix).toMatchObject({ domain: null, logoHidden: true, kind: 'subscription' });
    expect(byName.Target).toMatchObject({ domain: null, logoHidden: false });
    expect(byName.Calm).toMatchObject({ domain: 'calm.com', logoHidden: false });
    expect(byName.Spotify).toMatchObject({ domain: 'spotify.com', logoHidden: true });
  });

  it('carries a bill’s category and icon from any of its rows', () => {
    const entries = [
      at('l1', 'Car loan', 424.8, { kind: 'bill' }),
      at('l2', 'Car loan', 2000, { kind: 'bill', categoryId: 'loans', iconId: 'loan-car' }),
    ];
    expect(merchantTotals(entries)[0]).toMatchObject({
      amount: 2424.8,
      categoryId: 'loans',
      iconId: 'loan-car',
      kind: 'bill',
    });
  });

  it('counts no pay', () => {
    expect(merchantTotals([at('p', 'Salary', 0, { amount: 10_000, kind: 'income' })])).toEqual([]);
  });
});
