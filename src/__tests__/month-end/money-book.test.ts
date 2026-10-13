import type { ChargeRow } from '@/api/charges';
import type { PayRow } from '@/api/pay';
import { bookFlows, ledgerEntries, type BillRow, type SubscriptionRow } from '@/api/queries';
import { historyFloor } from '@/lib/allowance';
import { nextOccurrenceFrom } from '@/lib/card-ledger';
import { unrecordedDates } from '@/lib/charges';
import { toCents } from '@/lib/money';
import { moneyBook } from '@/lib/money-book';
import { unrecordedPaydays } from '@/lib/pay';

/**
 * Month-end dates carried through to money: an account's running balance and Home's Current
 * balance, read off the real book (rows → ledgerEntries → bookFlows → moneyBook), to the cent.
 *
 * 2028, a leap year, swept every day the way the app does it: write what has come due (charges and
 * pay), then roll each stored date on. The book at the end of each day is built from the rows the
 * sweep left. Every expected balance was worked out by hand and again by a separate script.
 */

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => null }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

const ACCOUNT = 'acct-everyday';
const CREATED = '2028-01-01T09:00:00Z';

function plus(iso: string, count: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + count)).toISOString().slice(0, 10);
}

function bill(id: string, fields: Partial<BillRow>): BillRow {
  return {
    id,
    name: id,
    amount: 0,
    category_id: 'housing',
    icon_id: null,
    recurrence: 'monthly',
    next_due_on: null,
    starts_on: null,
    ends_on: null,
    card_id: null,
    bank_account_id: ACCOUNT,
    created_at: CREATED,
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
    created_at: CREATED,
    category_id: 'entertainment',
    card_id: null,
    bank_account_id: ACCOUNT,
    note: null,
    active: true,
    brands: null,
    ...fields,
  };
}

type Salary = {
  id: string;
  name: string;
  amount: number;
  frequency: 'monthly';
  last_payday: string;
  account_ids: string[];
};

type Rows = {
  bills: BillRow[];
  subscriptions: SubscriptionRow[];
  salaries: Salary[];
  charges: ChargeRow[];
  pay: PayRow[];
  /** The account's typed balance and the day it was true. */
  typed: { balance: number; asOf: string };
};

/** One sweep on `today`: write every due and payday not on the record, then roll stored dates on. */
function sweep(rows: Rows, today: string): Rows {
  const charges = [...rows.charges];
  const pay = [...rows.pay];

  const plans = [
    ...rows.bills.map((row) => ({
      key: { bill_id: row.id, subscription_id: null },
      row,
      plan: {
        id: row.id,
        recurrence: row.recurrence,
        nextDate: row.next_due_on,
        anchorDay: row.anchor_day ?? null,
        startsOn: row.starts_on,
        createdAt: row.created_at,
        endsOn: row.ends_on,
      },
    })),
    ...rows.subscriptions.map((row) => ({
      key: { bill_id: null, subscription_id: row.id },
      row,
      plan: {
        id: row.id,
        recurrence: row.cycle,
        nextDate: row.next_renewal_on,
        anchorDay: row.anchor_day ?? null,
        startsOn: row.started_on,
        createdAt: row.created_at,
        endsOn: null,
      },
    })),
  ];
  for (const { key, row, plan } of plans) {
    const recorded = new Set(
      charges
        .filter((charge) => (charge.bill_id ?? charge.subscription_id) === plan.id)
        .map((charge) => charge.charged_on),
    );
    for (const date of unrecordedDates(plan, today, recorded)) {
      charges.push({
        id: `${plan.id}-${date}`,
        ...key,
        label: row.name,
        amount: row.amount,
        charged_on: date,
        card_id: null,
        bank_account_id: ACCOUNT,
      });
    }
  }

  const floor = historyFloor(true, new Date(`${today}T00:00:00`));
  for (const salary of rows.salaries) {
    const recorded = pay
      .filter((row) => row.salary_source_id === salary.id)
      .map((row) => row.paid_on);
    const schedule = { frequency: salary.frequency, lastPayday: salary.last_payday };
    for (const date of unrecordedPaydays(schedule, recorded, floor, today)) {
      pay.push({
        id: `${salary.id}-${date}`,
        salary_source_id: salary.id,
        label: salary.name,
        amount: salary.amount,
        paid_on: date,
        bank_account_id: ACCOUNT,
      });
    }
  }

  const rolled = (
    stored: string | null,
    recurrence: BillRow['recurrence'],
    anchorDay?: number | null,
  ) => {
    if (!stored || recurrence === 'period' || stored >= today) return stored;
    const next = nextOccurrenceFrom(stored, recurrence, today, anchorDay);
    return next >= today ? next : stored;
  };

  return {
    ...rows,
    bills: rows.bills.map((row) => ({
      ...row,
      next_due_on: rolled(row.next_due_on, row.recurrence, row.anchor_day),
    })),
    subscriptions: rows.subscriptions.map((row) => ({
      ...row,
      next_renewal_on: rolled(row.next_renewal_on, row.cycle, row.anchor_day),
    })),
    charges,
    pay,
  };
}

/** The book at the end of `today`, built the way useMoneyBook builds it. */
function book(rows: Rows, today: string) {
  const entries = ledgerEntries({
    receipts: [],
    subscriptions: rows.subscriptions,
    bills: rows.bills,
    salaries: rows.salaries,
    charges: rows.charges,
    pay: rows.pay,
    payoffs: [],
    accountOrder: [ACCOUNT],
    from: historyFloor(true, new Date(`${today}T00:00:00`)),
    to: today,
    today,
  });
  const flows = bookFlows({
    entries,
    subscriptions: rows.subscriptions,
    bills: rows.bills,
    charges: rows.charges,
  });
  return moneyBook({
    today,
    sources: [
      {
        id: ACCOUNT,
        kind: 'account',
        name: 'Everyday',
        balance: rows.typed.balance,
        asOf: rows.typed.asOf,
      },
    ],
    spending: flows.spending,
    payments: [],
    income: flows.income,
  });
}

/** The account's balance and Home's Current balance, in cents. */
function balances(rows: Rows, today: string) {
  const found = book(rows, today);
  return {
    account: toCents(found.sources.get(ACCOUNT)!.balance),
    home: toCents(found.current.balance),
  };
}

// The plan's scenario: 1,000.00 typed on 1 January 2028; pay 2,500.00 monthly, last paid 31 Jan;
// rent 1,234.56 on the 31st; a subscription 15.99 on the 30th; insurance 250.00 quarterly on the
// 31st; a domain 12.34 yearly on 29 February.
const YEAR_2028: Rows = {
  bills: [
    bill('rent', {
      name: 'Rent',
      amount: 1234.56,
      next_due_on: '2028-01-31',
      starts_on: '2028-01-31',
      anchor_day: 31,
    }),
    bill('insurance', {
      name: 'Insurance',
      amount: 250,
      recurrence: 'quarterly',
      category_id: 'insurance',
      next_due_on: '2028-01-31',
      starts_on: '2028-01-31',
      anchor_day: 31,
    }),
  ],
  subscriptions: [
    subscription('stream', {
      name: 'Streaming',
      amount: 15.99,
      next_renewal_on: '2028-01-30',
      started_on: '2028-01-30',
      anchor_day: 30,
    }),
    subscription('domain', {
      name: 'Domain',
      amount: 12.34,
      cycle: 'yearly',
      next_renewal_on: '2028-02-29',
      started_on: '2028-02-29',
      anchor_day: 29,
    }),
  ],
  salaries: [
    {
      id: 'salary',
      name: 'Salary',
      amount: 2500,
      frequency: 'monthly',
      last_payday: '2028-01-31',
      account_ids: [ACCOUNT],
    },
  ],
  charges: [],
  pay: [],
  typed: { balance: 1000, asOf: '2028-01-01' },
};

/** End-of-day balances, in cents. 29 Apr, 30 Jul and 30 Oct are days the drifted dates move. */
const CHECKPOINTS: Record<string, number> = {
  '2028-02-28': 199945,
  '2028-02-29': 323656,
  '2028-03-30': 322057,
  '2028-03-31': 448601,
  '2028-04-29': 448601,
  '2028-07-30': 796837,
  '2028-10-30': 1146672,
  '2028-12-31': 1498106,
};

/** Sweeps every day of 2028; the rows after each day's sweep, by day. */
function sweptYear(): Map<string, Rows> {
  const byDay = new Map<string, Rows>();
  let rows = YEAR_2028;
  for (let today = '2028-01-01'; today <= '2028-12-31'; today = plus(today, 1)) {
    rows = sweep(rows, today);
    byDay.set(today, rows);
  }
  return byDay;
}

describe('the 2028 money book, swept every day', () => {
  const byDay = sweptYear();

  it('holds the account and Home’s Current balance at every checkpoint, to the cent', () => {
    const found: Record<string, { account: number; home: number }> = {};
    const expected: Record<string, { account: number; home: number }> = {};
    for (const [day, cents] of Object.entries(CHECKPOINTS)) {
      found[day] = balances(byDay.get(day)!, day);
      expected[day] = { account: cents, home: cents };
    }
    expect(found).toEqual(expected);
  });

  it('wrote every due and every pay on its own day, once', () => {
    const rows = byDay.get('2028-12-31')!;
    const writtenFor = (id: string) =>
      rows.charges
        .filter((row) => (row.bill_id ?? row.subscription_id) === id)
        .map((row) => row.charged_on)
        .sort();
    const thirtyFirsts = (
      '2028-01-31 2028-02-29 2028-03-31 2028-04-30 2028-05-31 2028-06-30 ' +
      '2028-07-31 2028-08-31 2028-09-30 2028-10-31 2028-11-30 2028-12-31'
    ).split(' ');

    expect(rows.pay.map((row) => row.paid_on)).toEqual(thirtyFirsts);
    expect(writtenFor('rent')).toEqual(thirtyFirsts);
    expect(writtenFor('stream')).toEqual(
      (
        '2028-01-30 2028-02-29 2028-03-30 2028-04-30 2028-05-30 2028-06-30 ' +
        '2028-07-30 2028-08-30 2028-09-30 2028-10-30 2028-11-30 2028-12-30'
      ).split(' '),
    );
    expect(writtenFor('insurance')).toEqual([
      '2028-01-31',
      '2028-04-30',
      '2028-07-31',
      '2028-10-31',
    ]);
    expect(writtenFor('domain')).toEqual(['2028-02-29']);
  });

  it('took in 30,000.00 and paid out 16,018.94 over the year', () => {
    const { current } = book(byDay.get('2028-12-31')!, '2028-12-31');
    expect([toCents(current.income), toCents(current.expenses)]).toEqual([3000000, 1601894]);
  });

  it('reads the same every day from the schedules alone, before anything is written', () => {
    const differ: string[] = [];
    for (const [day, rows] of byDay) {
      const swept = balances(rows, day);
      const projected = balances(YEAR_2028, day);
      if (swept.account !== projected.account || swept.home !== projected.home) {
        differ.push(`${day}: swept ${swept.account}, projected ${projected.account}`);
      }
    }
    expect(differ).toEqual([]);
  });
});

describe('a September pay already on the record on a shortened day', () => {
  // The old walker wrote the 28th every month after February; the right September payday is the
  // 30th. Tracking starts on 1 September with 1,000.00.
  const drifted =
    '2026-01-31 2026-02-28 2026-03-28 2026-04-28 2026-05-28 2026-06-28 2026-07-28 2026-08-28 2026-09-28'.split(
      ' ',
    );
  const TRANSITION: Rows = {
    bills: [],
    subscriptions: [],
    salaries: [
      {
        id: 'salary',
        name: 'Salary',
        amount: 2500,
        frequency: 'monthly',
        last_payday: '2026-01-31',
        account_ids: [ACCOUNT],
      },
    ],
    charges: [],
    pay: drifted.map((date) => ({
      id: `salary-${date}`,
      salary_source_id: 'salary',
      label: 'Salary',
      amount: 2500,
      paid_on: date,
      bank_account_id: ACCOUNT,
    })),
    typed: { balance: 1000, asOf: '2026-09-01' },
  };

  const payIn = (rows: Rows, today: string) =>
    book(rows, today)
      .sources.get(ACCOUNT)!
      .entries.filter((entry) => entry.kind === 'income')
      .map((entry) => entry.date)
      .sort();

  it('counts September once on 13 October', () => {
    expect(payIn(TRANSITION, '2026-10-13')).toEqual(['2026-09-28']);
    expect(balances(TRANSITION, '2026-10-13')).toEqual({ account: 350000, home: 350000 });
  });

  it('holds exactly one September pay from 1 September to 31 December, swept or not', () => {
    let swept = TRANSITION;
    for (let today = '2026-10-13'; today <= '2026-12-31'; today = plus(today, 1)) {
      swept = sweep(swept, today);
    }
    const months = ['2026-09-28', '2026-10-31', '2026-11-30', '2026-12-31'];

    expect(payIn(swept, '2026-12-31')).toEqual(months);
    expect(payIn(TRANSITION, '2026-12-31')).toEqual(months);
    expect(balances(swept, '2026-12-31')).toEqual({ account: 1100000, home: 1100000 });
    expect(balances(TRANSITION, '2026-12-31')).toEqual({ account: 1100000, home: 1100000 });
  });
});
