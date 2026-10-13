import type { ChargeRow } from '@/api/charges';
import {
  ledgerEntries,
  type BillRow,
  type LedgerPayoff,
  type SubscriptionRow,
} from '@/api/queries';
import { historyFloor } from '@/lib/allowance';
import { addMonths, monthChoices } from '@/lib/bill-month';
import { toCents } from '@/lib/money';
import { ofKind, paymentEntries, type PaymentEntry } from '@/lib/payment-entries';
import {
  averageCents,
  avgMonths,
  hidesOlder,
  isProOnlyYear,
  monthGroups,
  paymentFloor,
  yearsList,
  yearSummary,
  type Paid,
} from '@/lib/payment-years';

/**
 * Payment history by year over the Founder's design (3.png, 2.png, 7.png), seen on 12 Oct 2026:
 * 2026 $18,548.81 · 67 payments · Avg / month $1,854.88 (÷ 10), October $1,205.99, September
 * $1,922.98; Netflix 2025 $191.88 · 12; All years $131,251.84 · 499 payments · 7 years. The 2026
 * payments come through the real ledger and `paymentEntries`, as the page reads them. Every
 * expected figure is worked by hand in cents.
 */

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => null }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

const TODAY = '2026-10-12';
const KOMAL = 'acct-komal-7010';
const DISCOVER = 'card-discover-6334';
const PRO_FLOOR = paymentFloor(TODAY);
/** The free list floor on 12 Oct 2026: the 90 days ending today. */
const FREE_FLOOR = historyFloor(false, new Date(`${TODAY}T00:00:00`));

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
    bank_account_id: null,
    created_at: '2024-12-20T12:00:00Z',
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
    created_at: '2024-12-20T12:00:00Z',
    category_id: 'entertainment',
    card_id: null,
    bank_account_id: null,
    note: null,
    active: true,
    brands: null,
    ...fields,
  };
}

/** A charge on `day` of every month from `from` to `to` (yyyy-mm), as the recorders write them. */
function monthly(
  plan: { bill?: string; subscription?: string },
  label: string,
  day: string,
  from: string,
  to: string,
  amount: (month: string) => number,
  source: { card?: string; account?: string } = {},
): ChargeRow[] {
  const rows: ChargeRow[] = [];
  for (let month = from; month <= to; month = addMonths(month, 1)) {
    const on = `${month}-${day}`;
    rows.push({
      id: `${plan.bill ?? plan.subscription}-${on}`,
      bill_id: plan.bill ?? null,
      subscription_id: plan.subscription ?? null,
      label,
      amount: amount(month),
      charged_on: on,
      card_id: source.card ?? null,
      bank_account_id: source.account ?? null,
    });
  }
  return rows;
}

const flat = (amount: number) => () => amount;

// The design account: four bills and three subscriptions, each charged on its day.
const BILLS = [
  bill('rent', {
    name: 'Ashword Hill Apartments',
    amount: 1035,
    category_id: 'housing',
    next_due_on: '2026-01-01',
    starts_on: '2026-01-01',
    bank_account_id: KOMAL,
  }),
  bill('nationwide', {
    name: 'Nationwide',
    amount: 145,
    category_id: 'insurance',
    next_due_on: '2026-01-11',
    starts_on: '2026-01-11',
  }),
  bill('aep', {
    name: 'AEP',
    amount: 150,
    category_id: 'energy',
    next_due_on: '2026-01-22',
    starts_on: '2026-01-22',
    bank_account_id: KOMAL,
  }),
  bill('car', {
    name: 'Car loan',
    amount: 554,
    category_id: 'loans',
    next_due_on: '2026-01-28',
    starts_on: '2026-01-28',
    ends_on: '2030-12-28',
    card_id: DISCOVER,
  }),
];
const SUBSCRIPTIONS = [
  subscription('netflix', {
    name: 'Netflix',
    amount: 15.99,
    next_renewal_on: '2025-01-09',
    started_on: '2025-01-09',
  }),
  subscription('spotify', {
    name: 'Spotify',
    amount: 10,
    next_renewal_on: '2026-01-09',
    started_on: '2026-01-09',
  }),
  subscription('icloud', {
    name: 'iCloud+',
    amount: 12.99,
    next_renewal_on: '2026-01-15',
    started_on: '2026-01-15',
    card_id: DISCOVER,
  }),
];
const CHARGES: ChargeRow[] = [
  ...monthly({ bill: 'rent' }, 'Ashword Hill Apartments', '01', '2026-01', '2026-10', flat(1035), {
    account: KOMAL,
  }),
  ...monthly({ bill: 'nationwide' }, 'Nationwide', '11', '2026-01', '2026-10', flat(145)),
  // A cold January: AEP was $186.00, $36.00 over its usual $150.00.
  ...monthly(
    { bill: 'aep' },
    'AEP',
    '22',
    '2026-01',
    '2026-09',
    (month) => (month === '2026-01' ? 186 : 150),
    { account: KOMAL },
  ),
  ...monthly({ bill: 'car' }, 'Car loan', '28', '2026-01', '2026-09', flat(554), {
    card: DISCOVER,
  }),
  ...monthly({ subscription: 'netflix' }, 'Netflix', '09', '2025-01', '2026-10', flat(15.99)),
  ...monthly({ subscription: 'spotify' }, 'Spotify', '09', '2026-01', '2026-10', flat(10)),
  ...monthly({ subscription: 'icloud' }, 'iCloud+', '15', '2026-01', '2026-09', flat(12.99), {
    card: DISCOVER,
  }),
];

/** The payment window as `usePayments` reads it: the ledger from the floor to today. */
function payments(
  today = TODAY,
  data: { charges?: ChargeRow[]; payoffs?: LedgerPayoff[] } = {},
): PaymentEntry[] {
  const entries = ledgerEntries({
    receipts: [],
    subscriptions: SUBSCRIPTIONS,
    bills: BILLS,
    salaries: [],
    charges: data.charges ?? CHARGES,
    pay: [],
    payoffs: data.payoffs ?? [],
    accountOrder: [],
    from: paymentFloor(today),
    to: today,
    today,
  });
  return paymentEntries(entries, { bills: BILLS, subscriptions: SUBSCRIPTIONS }, today);
}

const ALL = payments();
const inYear = <T extends Paid>(rows: readonly T[], year: number) =>
  rows.filter((row) => row.date.startsWith(`${year}-`));

describe('the design year: Payment history 2026 on 12 Oct', () => {
  it('Paid in 2026: $18,548.81 · 67 payments · Avg / month $1,854.88 over 10 months', () => {
    const card = yearSummary(ofKind(ALL, 'all'), 2026, TODAY);

    // Summed as floats newest first, as the page gets them, these 67 are 18548.809999999998.
    expect(card).toMatchObject({
      year: 2026,
      total: 18548.81,
      count: 67,
      months: 10,
      average: 1854.88,
      highlight: 9,
    });
  });

  it('twelve bars: January the cold month, October so far, November and December flat', () => {
    const { bars } = yearSummary(ALL, 2026, TODAY);

    expect(bars).toEqual([
      1958.98, 1922.98, 1922.98, 1922.98, 1922.98, 1922.98, 1922.98, 1922.98, 1922.98, 1205.99, 0,
      0,
    ]);
    expect(bars.reduce((sum, bar) => sum + toCents(bar), 0)).toBe(1854881);
  });

  it('October $1,205.99 over 4 rows and September $1,922.98 over 7, newest first', () => {
    const groups = monthGroups(inYear(ALL, 2026), PRO_FLOOR);

    expect(groups.map((group) => group.month)).toEqual([
      '2026-10',
      '2026-09',
      '2026-08',
      '2026-07',
      '2026-06',
      '2026-05',
      '2026-04',
      '2026-03',
      '2026-02',
      '2026-01',
    ]);
    expect(groups[0]).toMatchObject({ total: 1205.99, count: 4 });
    expect(groups[0].rows.map((row) => `${row.name} ${row.date} ${row.amount}`)).toEqual([
      'Nationwide 2026-10-11 145',
      'Netflix 2026-10-09 15.99',
      'Spotify 2026-10-09 10',
      'Ashword Hill Apartments 2026-10-01 1035',
    ]);
    expect(groups[1]).toMatchObject({ total: 1922.98, count: 7 });
    expect(groups[1].rows.map((row) => row.name)).toEqual([
      'Car loan',
      'AEP',
      'iCloud+',
      'Nationwide',
      'Netflix',
      'Spotify',
      'Ashword Hill Apartments',
    ]);
    expect(groups.reduce((sum, group) => sum + toCents(group.total), 0)).toBe(1854881);
  });

  it('the Bills and Subscriptions tabs split the year to the cent', () => {
    const bills = yearSummary(ofKind(ALL, 'bill'), 2026, TODAY);
    const subscriptions = yearSummary(ofKind(ALL, 'subscription'), 2026, TODAY);

    // 9 × 1,884.00 + 36.00 + 1,035.00 + 145.00; 38 payments; ÷ 10.
    expect(bills).toMatchObject({ total: 18172, count: 38, months: 10, average: 1817.2 });
    // 9 × 38.98 + 15.99 + 10.00; 29 payments; 376.81 ÷ 10 = 37.681.
    expect(subscriptions).toMatchObject({ total: 376.81, count: 29, months: 10, average: 37.68 });
    expect(toCents(bills.total) + toCents(subscriptions.total)).toBe(1854881);
    expect(bills.count + subscriptions.count).toBe(67);
  });

  it('Netflix 2025: $191.88 · 12, a past year with no bar highlighted', () => {
    const netflix = ALL.filter((row) => row.planId === 'netflix');
    const card = yearSummary(netflix, 2025, TODAY);

    expect(card).toMatchObject({
      total: 191.88,
      count: 12,
      months: 12,
      average: 15.99,
      highlight: null,
    });
    expect(card.bars).toEqual(new Array(12).fill(15.99));
  });
});

/** `count` payments in `year` summing exactly `total`, spread over its months. */
function yearOfPayments(year: number, count: number, total: number): Paid[] {
  const cents = toCents(total);
  const base = Math.floor(cents / count);
  const over = cents - base * count;
  return Array.from({ length: count }, (_, i) => ({
    date: `${year}-${String((i % 12) + 1).padStart(2, '0')}-${String(1 + Math.floor(i / 12)).padStart(2, '0')}`,
    amount: (base + (i < over ? 1 : 0)) / 100,
  }));
}

describe('All years (2.png) and Choose year (7.png)', () => {
  const DESIGN_YEARS: [number, number, number][] = [
    [2025, 84, 22407.36],
    [2024, 84, 21630.12],
    [2023, 72, 19264.0],
    [2022, 72, 17880.5],
    [2021, 60, 16402.75],
    [2020, 60, 15118.3],
  ];
  const ROWS: Paid[] = [
    ...inYear(ALL, 2026),
    ...DESIGN_YEARS.flatMap(([year, count, total]) => yearOfPayments(year, count, total)),
    // Kept by the ledger (back to 12 Oct 2019) but older than the seven calendar years.
    { date: '2019-11-03', amount: 99.99 },
    { date: '2019-12-31', amount: 10 },
  ];

  it('Paid since 2020: $131,251.84 · 499 payments · 7 years, newest first', () => {
    const list = yearsList(ROWS, TODAY, PRO_FLOOR);

    expect(list.first).toBe(2020);
    expect(list.total).toBe(131251.84);
    expect(list.count).toBe(499);
    expect(list.years.map((y) => [y.year, y.total, y.count])).toEqual([
      [2026, 18548.81, 67],
      ...DESIGN_YEARS.map(([year, count, total]) => [year, total, count]),
    ]);
  });

  it('Pro: no year carries the badge; free: every year wholly older than the floor does', () => {
    expect(yearsList(ROWS, TODAY, PRO_FLOOR).years.every((y) => !y.proOnly)).toBe(true);
    expect(yearsList(ROWS, TODAY, FREE_FLOOR).years.map((y) => [y.year, y.proOnly])).toEqual([
      [2026, false],
      [2025, true],
      [2024, true],
      [2023, true],
      [2022, true],
      [2021, true],
      [2020, true],
    ]);
  });

  it('free sums the whole window: the same totals and counts as Pro', () => {
    const pro = yearsList(ROWS, TODAY, PRO_FLOOR);
    const free = yearsList(ROWS, TODAY, FREE_FLOOR);

    expect(free.total).toBe(pro.total);
    expect(free.count).toBe(pro.count);
    expect(free.years.map((y) => [y.year, y.total, y.count])).toEqual(
      pro.years.map((y) => [y.year, y.total, y.count]),
    );
  });
});

describe('the average a month', () => {
  it('runs from January, or the first payment month in the year, to this month or December', () => {
    expect(avgMonths(2026, TODAY, '2020-01-05')).toBe(10);
    expect(avgMonths(2025, TODAY, '2020-01-05')).toBe(12);
    // Edge case 12: first payment 9 May.
    expect(avgMonths(2026, TODAY, '2026-05-09')).toBe(6);
    expect(avgMonths(2025, TODAY, '2025-05-09')).toBe(8);
    expect(avgMonths(2026, '2026-01-03', '2025-11-30')).toBe(1);
    expect(avgMonths(2026, TODAY, '2026-10-01')).toBe(1);
  });

  it('a year with nothing yet shares over no months', () => {
    expect(avgMonths(2024, TODAY, '2025-03-01')).toBe(0);
    expect(avgMonths(2027, TODAY, '2020-01-01')).toBe(0);
    expect(avgMonths(2026, TODAY, null)).toBe(0);
  });

  it('rounds half away from zero on whole cents', () => {
    expect(averageCents(1854881, 10)).toBe(185488);
    expect(averageCents(5, 2)).toBe(3);
    expect(averageCents(15, 2)).toBe(8);
    expect(averageCents(25, 10)).toBe(3);
    expect(averageCents(24, 10)).toBe(2);
    expect(averageCents(-5, 2)).toBe(-3);
    expect(averageCents(1000, 0)).toBe(0);
    expect(Object.is(averageCents(-1, 10), 0)).toBe(true);
    expect(averageCents(99_999_999_999_999, 7)).toBe(14_285_714_285_714);
  });

  it('agrees with exact long division for every total up to $50 over 1–12 months', () => {
    const wrong: string[] = [];
    for (let cents = -5000; cents <= 5000; cents += 1) {
      for (let months = 1; months <= 12; months += 1) {
        const size = Math.abs(cents);
        const quotient = Math.trunc(size / months);
        const remainder = size - quotient * months;
        const magnitude = 2 * remainder >= months ? quotient + 1 : quotient;
        const expected = cents < 0 ? -magnitude : magnitude;
        if (averageCents(cents, months) !== expected + 0) wrong.push(`${cents}/${months}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('first payment 9 May 2026: six months to October', () => {
    const rows: Paid[] = ['05', '06', '07', '08', '09', '10'].map((month) => ({
      date: `2026-${month}-09`,
      amount: 33.33,
    }));

    expect(yearSummary(rows, 2026, TODAY)).toMatchObject({
      total: 199.98,
      count: 6,
      months: 6,
      average: 33.33,
    });
    expect(yearSummary(rows, 2025, TODAY)).toMatchObject({ total: 0, months: 0, average: 0 });
  });

  it('a past year starting 9 May shares over eight months', () => {
    const rows: Paid[] = ['05', '06', '07', '08', '09', '10', '11', '12'].map((month) => ({
      date: `2025-${month}-09`,
      amount: 120.5,
    }));
    rows.push({ date: '2026-01-09', amount: 120.5 });

    expect(yearSummary(rows, 2025, TODAY)).toMatchObject({
      total: 964,
      count: 8,
      months: 8,
      average: 120.5,
    });
    // 2026 counts from January: a payment came before the year began.
    expect(yearSummary(rows, 2026, TODAY)).toMatchObject({
      total: 120.5,
      months: 10,
      average: 12.05,
    });
  });

  it('a payment on 31 Dec is December of its own year', () => {
    const rows: Paid[] = [
      { date: '2025-12-31', amount: 50 },
      { date: '2026-01-01', amount: 20 },
    ];

    expect(yearSummary(rows, 2025, TODAY).bars[11]).toBe(50);
    expect(yearSummary(rows, 2026, TODAY).bars[0]).toBe(20);
    expect(yearSummary(rows, 2026, TODAY).total).toBe(20);
  });

  it('payoffs count like any payment: total, count, bars, average and groups', () => {
    const withPayoff = payments(TODAY, {
      payoffs: [
        {
          id: 'extra',
          bill_id: 'car',
          paid_on: '2026-10-03',
          amount: 1000,
          kind: 'partial',
          card_id: null,
          bank_account_id: KOMAL,
          counted: true,
        },
      ],
    });
    const card = yearSummary(ofKind(withPayoff, 'bill'), 2026, TODAY);

    expect(withPayoff.find((row) => row.status === 'extraPayment')?.amount).toBe(1000);
    expect(card).toMatchObject({ total: 19172, count: 39, average: 1917.2 });
    expect(card.bars[9]).toBe(2180);
    expect(monthGroups(inYear(ofKind(withPayoff, 'bill'), 2026), PRO_FLOOR)[0]).toMatchObject({
      month: '2026-10',
      total: 2180,
      count: 3,
    });
  });
});

describe('10. the free floor mid-month and mid-year', () => {
  it('is 15 Jul 2026 on 12 Oct', () => {
    expect(FREE_FLOOR).toBe('2026-07-15');
  });

  it('2026: whole-year figures; Oct, Sep, Aug and Jul drawn; July whole in its total', () => {
    const rows = inYear(ALL, 2026);
    const groups = monthGroups(rows, FREE_FLOOR);

    // The card is the whole year; 21 of its 67 rows are drawn: 4 + 7 + 7 + 3 from 15 Jul.
    expect(yearSummary(ALL, 2026, TODAY)).toMatchObject({ total: 18548.81, count: 67 });
    expect(groups.flatMap((group) => group.rows)).toHaveLength(21);
    expect(groups.map((group) => group.month)).toEqual([
      '2026-10',
      '2026-09',
      '2026-08',
      '2026-07',
    ]);
    expect(groups[3]).toMatchObject({ total: 1922.98, count: 7 });
    expect(groups[3].rows.map((row) => `${row.name} ${row.date}`)).toEqual([
      'Car loan 2026-07-28',
      'AEP 2026-07-22',
      'iCloud+ 2026-07-15',
    ]);
    expect(hidesOlder(rows, FREE_FLOOR)).toBe(true);
    expect(hidesOlder(rows, PRO_FLOOR)).toBe(false);
    expect(hidesOlder(groups[0].rows, FREE_FLOOR)).toBe(false);
    expect(hidesOlder([{ date: FREE_FLOOR, amount: 1 }], FREE_FLOOR)).toBe(false);
  });

  it('2025 opens with its figures, no rows, and the notice', () => {
    const rows = inYear(ALL, 2025);

    expect(isProOnlyYear(2025, FREE_FLOOR)).toBe(true);
    expect(isProOnlyYear(2026, FREE_FLOOR)).toBe(false);
    expect(monthGroups(rows, FREE_FLOOR)).toEqual([]);
    expect(hidesOlder(rows, FREE_FLOOR)).toBe(true);
    expect(yearSummary(ALL, 2025, TODAY)).toMatchObject({ total: 191.88, count: 12 });
  });

  it('the badge goes by the last day of the year', () => {
    expect(isProOnlyYear(2025, '2025-12-31')).toBe(false);
    expect(isProOnlyYear(2025, '2026-01-01')).toBe(true);
    expect(isProOnlyYear(2020, PRO_FLOOR)).toBe(false);
    expect(isProOnlyYear(2019, PRO_FLOOR)).toBe(true);
  });
});

describe('13. seven calendar years', () => {
  it('reads from 1 Jan 2020 today; 2020 drops off on 1 Jan 2027', () => {
    expect(paymentFloor(TODAY)).toBe('2020-01-01');
    expect(paymentFloor('2026-12-31')).toBe('2020-01-01');
    expect(paymentFloor('2027-01-01')).toBe('2021-01-01');
  });

  it('the month picker on Pro starts in January 2020', () => {
    const months = monthChoices(TODAY, paymentFloor(TODAY));
    expect(months[months.length - 1]).toBe('2020-01');
  });

  it('on 1 Jan 2027 the list is 2027 (nothing yet) back to 2021', () => {
    const rows: Paid[] = [2019, 2020, 2021, 2026].map((year) => ({
      date: `${year}-06-01`,
      amount: 10,
    }));

    expect(yearsList(rows, '2027-01-01', paymentFloor('2027-01-01'))).toEqual({
      first: 2021,
      total: 20,
      count: 2,
      years: [
        { year: 2027, total: 0, count: 0, proOnly: false },
        { year: 2026, total: 10, count: 1, proOnly: false },
        { year: 2021, total: 10, count: 1, proOnly: false },
      ],
    });
  });

  it('never counts a payment after today', () => {
    const rows: Paid[] = [
      { date: TODAY, amount: 5 },
      { date: '2026-10-13', amount: 7 },
    ];

    expect(yearSummary(rows, 2026, TODAY)).toMatchObject({ total: 5, count: 1 });
    expect(yearsList(rows, TODAY, PRO_FLOOR)).toMatchObject({ total: 5, count: 1 });
  });
});

describe('11. an empty account', () => {
  it('$0.00, 0 payments, Avg $0.00, flat bars; this month still highlighted', () => {
    expect(yearSummary([], 2026, TODAY)).toEqual({
      year: 2026,
      total: 0,
      count: 0,
      average: 0,
      months: 0,
      bars: new Array(12).fill(0),
      highlight: 9,
    });
    expect(monthGroups([], FREE_FLOOR)).toEqual([]);
    expect(hidesOlder([], FREE_FLOOR)).toBe(false);
  });

  it('Paid since 2026 · 0 payments · 1 year, one 2026 card', () => {
    expect(yearsList([], TODAY, FREE_FLOOR)).toEqual({
      first: 2026,
      total: 0,
      count: 0,
      years: [{ year: 2026, total: 0, count: 0, proOnly: false }],
    });
  });
});
