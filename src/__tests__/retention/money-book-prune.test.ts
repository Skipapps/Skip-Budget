import type { ChargeRow } from '@/api/charges';
import type { PayRow } from '@/api/pay';
import {
  bookFlows,
  ledgerEntries,
  type BillRow,
  type ReceiptRow,
  type SubscriptionRow,
} from '@/api/queries';
import { historyFloor } from '@/lib/allowance';
import { toCents } from '@/lib/money';
import { moneyBook } from '@/lib/money-book';

/**
 * The seven-year prune (public.prune_expired_data) against the real money book: rows →
 * ledgerEntries → bookFlows → moneyBook, as useMoneyBook builds it. Each account's and card's
 * balance and Home's Current balance before a prune, after it as the policy alone leaves them, and
 * after it with the balance rule (`foldThenPrune`, a line-for-line port of the SQL).
 *
 * Every expected balance was worked out by hand from the rows below, in cents.
 */

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => null }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

const EVERYDAY = 'acct-everyday';
const JOINT = 'acct-joint';
const VISA = 'card-visa';
const CREATED = '2026-09-01T09:00:00Z';

type Source = {
  id: string;
  kind: 'account' | 'card';
  balance: number;
  asOf: string | null;
};
type Payment = {
  id: string;
  card_id: string | null;
  bank_account_id: string | null;
  from_bank_account_id: string | null;
  amount: number;
  paid_on: string;
};
type Rows = {
  sources: Source[];
  bills: BillRow[];
  subscriptions: SubscriptionRow[];
  receipts: ReceiptRow[];
  charges: ChargeRow[];
  payments: Payment[];
  pay: PayRow[];
};

/** Postgres's `(day - interval '7 years')::date`: 29 February lands on the 28th. */
function sevenYearsBefore(day: string): string {
  const [year, month, date] = day.split('-').map(Number);
  const last = new Date(Date.UTC(year - 7, month, 0)).getUTCDate();
  const iso = (n: number, width = 2) => String(n).padStart(width, '0');
  return `${iso(year - 7, 4)}-${iso(month)}-${iso(Math.min(date, last))}`;
}

/** The person's own today when the job runs; the cutoff is seven years before it. */
function cutoffOn(today: string): string {
  return sevenYearsBefore(today);
}

/** The policy alone: every row dated before the cutoff goes, nothing else changes. */
function prune(rows: Rows, cutoff: string): Rows {
  return {
    ...rows,
    receipts: rows.receipts.filter((row) => row.purchased_on >= cutoff),
    charges: rows.charges.filter((row) => row.charged_on >= cutoff),
    payments: rows.payments.filter((row) => row.paid_on >= cutoff),
    pay: rows.pay.filter((row) => row.paid_on >= cutoff),
  };
}

/**
 * The balance rule, then the policy. Before deleting, each card and account takes into its typed
 * balance the rows being deleted that the book still counts on it: those dated on or after its
 * as-of day (every one when it has none) among payments, and charges of a plan the ledger no
 * longer walks. Receipts, pay and a running plan's charges are not taken: the book stopped
 * counting them when they left its seven-year window (queries.ts useLedger), on or before this
 * cutoff. The as-of day is left as it is.
 */
function foldThenPrune(rows: Rows, cutoff: string): Rows {
  const byId = new Map(rows.sources.map((source) => [source.id, source]));
  const delta = new Map<string, number>();
  const add = (id: string | null, day: string, cents: number) => {
    const source = id ? byId.get(id) : undefined;
    if (!source || day >= cutoff) return;
    if (source.asOf !== null && day < source.asOf) return;
    delta.set(source.id, (delta.get(source.id) ?? 0) + cents);
  };

  for (const payment of rows.payments) {
    const cents = toCents(Math.abs(payment.amount));
    if (payment.card_id) add(payment.card_id, payment.paid_on, -cents);
    else add(payment.bank_account_id, payment.paid_on, cents);
    add(payment.from_bank_account_id, payment.paid_on, -cents);
  }

  const billWalks = new Map(rows.bills.map((row) => [row.id, row.next_due_on !== null]));
  const subscriptionWalks = new Map(
    rows.subscriptions.map((row) => [row.id, row.active && row.next_renewal_on !== null]),
  );
  for (const charge of rows.charges) {
    const walked = charge.bill_id
      ? billWalks.get(charge.bill_id)
      : subscriptionWalks.get(charge.subscription_id as string);
    if (walked) continue;
    const cents = toCents(Math.abs(charge.amount));
    if (charge.card_id) add(charge.card_id, charge.charged_on, cents);
    else add(charge.bank_account_id, charge.charged_on, -cents);
  }

  const folded: Rows = {
    ...rows,
    sources: rows.sources.map((source) => ({
      ...source,
      balance: (toCents(source.balance) + (delta.get(source.id) ?? 0)) / 100,
    })),
  };
  return prune(folded, cutoff);
}

/** Each source's balance and Home's Current balance, in cents, at the end of `today`. */
function balances(rows: Rows, today: string): Record<string, number> {
  const entries = ledgerEntries({
    receipts: rows.receipts,
    subscriptions: rows.subscriptions,
    bills: rows.bills,
    salaries: [],
    charges: rows.charges,
    pay: rows.pay,
    payoffs: [],
    accountOrder: [EVERYDAY, JOINT],
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
  const book = moneyBook({
    today,
    sources: rows.sources.map((source) => ({ ...source, name: source.id })),
    spending: flows.spending,
    payments: rows.payments.map((row) => ({
      id: row.id,
      amount: row.amount,
      date: row.paid_on,
      note: null,
      toId: row.card_id ?? row.bank_account_id ?? '',
      fromAccountId: row.from_bank_account_id,
    })),
    income: flows.income,
  });
  const out: Record<string, number> = { home: toCents(book.current.balance) };
  for (const source of rows.sources) out[source.id] = toCents(book.sources.get(source.id)!.balance);
  return out;
}

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
    bank_account_id: null,
    note: null,
    active: false,
    brands: null,
    ...fields,
  };
}

function receipt(id: string, on: string, amount: number, source: Partial<ReceiptRow>): ReceiptRow {
  return {
    id,
    brand_id: null,
    merchant: id,
    amount,
    purchased_on: on,
    category_id: 'groceries',
    card_id: null,
    bank_account_id: null,
    note: null,
    source: 'manual',
    image_path: null,
    created_at: CREATED,
    brands: null,
    ...source,
  };
}

function charge(
  plan: { bill?: string; subscription?: string },
  on: string,
  amount: number,
  source: { card?: string; account?: string } = {},
): ChargeRow {
  return {
    id: `${plan.bill ?? plan.subscription}-${on}`,
    bill_id: plan.bill ?? null,
    subscription_id: plan.subscription ?? null,
    label: plan.bill ?? plan.subscription ?? '',
    amount,
    charged_on: on,
    card_id: source.card ?? null,
    bank_account_id: source.account ?? null,
  };
}

function payment(
  id: string,
  on: string,
  amount: number,
  to: { card?: string; account?: string },
  from: string | null = null,
): Payment {
  return {
    id,
    card_id: to.card ?? null,
    bank_account_id: to.account ?? null,
    from_bank_account_id: from,
    amount,
    paid_on: on,
  };
}

const pay = (id: string, on: string, amount: number, into: string): PayRow => ({
  id,
  salary_source_id: null,
  label: 'Salary',
  amount,
  paid_on: on,
  bank_account_id: into,
});

// The cutoff is 15 November 2026.
const TODAY = '2033-11-15';
const CUTOFF = cutoffOn(TODAY);

/**
 * Everyday 1,000.00 and Visa 0.00 owed, both typed on 1 October 2026; Joint 500.00 with no typed
 * day, so it counts everything. A running rent; a gym bill no longer walked (no next date); two
 * cancelled subscriptions; receipts, pay and payments either side of the cutoff.
 */
const ROWS: Rows = {
  sources: [
    { id: EVERYDAY, kind: 'account', balance: 1000, asOf: '2026-10-01' },
    { id: VISA, kind: 'card', balance: 0, asOf: '2026-10-01' },
    { id: JOINT, kind: 'account', balance: 500, asOf: null },
  ],
  bills: [
    bill('rent', {
      amount: 1200,
      next_due_on: '2033-11-30',
      starts_on: '2026-10-30',
      bank_account_id: EVERYDAY,
    }),
    bill('gym', { amount: 39.99, starts_on: '2026-10-10', ends_on: '2026-12-31', card_id: VISA }),
  ],
  subscriptions: [
    subscription('stream', { amount: 15.99, bank_account_id: EVERYDAY }),
    subscription('magazine', { amount: 7.5, bank_account_id: JOINT }),
  ],
  receipts: [
    receipt('shoes', '2026-10-05', 200, { card_id: VISA }),
    receipt('books', '2019-06-01', 25, { bank_account_id: JOINT }),
    receipt('groceries', '2033-11-01', 40, { bank_account_id: EVERYDAY }),
  ],
  charges: [
    charge({ bill: 'rent' }, '2026-10-30', 1200, { account: EVERYDAY }),
    charge({ bill: 'rent' }, '2033-10-30', 1200, { account: EVERYDAY }),
    charge({ bill: 'gym' }, '2026-10-10', 39.99, { card: VISA }),
    charge({ bill: 'gym' }, '2026-11-10', 39.99, { card: VISA }),
    charge({ bill: 'gym' }, '2026-12-10', 39.99, { card: VISA }),
    charge({ subscription: 'stream' }, '2026-11-09', 15.99, { account: EVERYDAY }),
    charge({ subscription: 'stream' }, '2027-01-09', 15.99, { account: EVERYDAY }),
    charge({ subscription: 'magazine' }, '2020-03-03', 7.5, { account: JOINT }),
  ],
  payments: [
    payment('visa-nov', '2026-11-01', 200, { card: VISA }, EVERYDAY),
    payment('visa-late', '2033-11-02', 100, { card: VISA }, EVERYDAY),
    payment('gift', '2020-05-05', 300, { account: JOINT }),
    payment('before-typed', '2026-09-15', 50, { account: EVERYDAY }),
  ],
  pay: [
    pay('pay-2026', '2026-10-31', 2500, EVERYDAY),
    pay('pay-2033', '2033-10-31', 2500, EVERYDAY),
  ],
};

describe('the prune and the money book', () => {
  // Everyday: 1,000.00 − rent 1,200.00 (30 Oct 2033) − stream 15.99 × 2 − groceries 40.00
  //   − to Visa 200.00 and 100.00 + pay 2,500.00 (31 Oct 2033) = 1,928.02.
  // Visa owed: gym 39.99 × 3 − payments 300.00 = −180.03.
  // Joint: 500.00 − magazine 7.50 + gift 300.00 = 792.50.
  // Home: 1,928.02 + 792.50 + 180.03 = 2,900.55.
  const BEFORE = { home: 290055, [EVERYDAY]: 192802, [VISA]: -18003, [JOINT]: 79250 };

  it('the cutoff is seven years before today, Postgres style', () => {
    expect(CUTOFF).toBe('2026-11-15');
    expect(sevenYearsBefore('2035-02-28')).toBe('2028-02-28');
    expect(sevenYearsBefore('2035-03-01')).toBe('2028-03-01');
    // The app's own floor is the same day.
    expect(sevenYearsBefore('2028-02-29')).toBe('2021-02-28');
    expect(historyFloor(true, new Date('2028-02-29T00:00:00'))).toBe('2021-02-28');
  });

  it('reads these balances before the prune', () => {
    expect(balances(ROWS, TODAY)).toEqual(BEFORE);
  });

  it('moves them when the policy alone deletes what the book still counts', () => {
    // Everyday +215.99 (stream 15.99 and the 200.00 to Visa are gone); Visa −79.98 + 200.00;
    // Joint +7.50 − 300.00. Receipts, pay and rent before the cutoff were already uncounted.
    expect(balances(prune(ROWS, CUTOFF), TODAY)).toEqual({
      home: 270402,
      [EVERYDAY]: 214401,
      [VISA]: -6001,
      [JOINT]: 50000,
    });
  });

  it('leaves every balance to the cent with the rule', () => {
    const after = foldThenPrune(ROWS, CUTOFF);
    expect(balances(after, TODAY)).toEqual(BEFORE);
    // The typed balances that took the deleted rows in: 1,000.00 − 15.99 − 200.00; 0.00 + 79.98
    // − 200.00; 500.00 − 7.50 + 300.00. Their as-of days are unchanged.
    expect(after.sources).toEqual([
      { id: EVERYDAY, kind: 'account', balance: 784.01, asOf: '2026-10-01' },
      { id: VISA, kind: 'card', balance: -120.02, asOf: '2026-10-01' },
      { id: JOINT, kind: 'account', balance: 792.5, asOf: null },
    ]);
  });

  it('deletes exactly what the policy says, the rule or not', () => {
    const ids = (rows: Rows) => ({
      receipts: rows.receipts.map((row) => row.id),
      charges: rows.charges.map((row) => row.id),
      payments: rows.payments.map((row) => row.id),
      pay: rows.pay.map((row) => row.id),
    });
    expect(ids(foldThenPrune(ROWS, CUTOFF))).toEqual(ids(prune(ROWS, CUTOFF)));
    expect(ids(prune(ROWS, CUTOFF))).toEqual({
      receipts: ['groceries'],
      charges: ['rent-2033-10-30', 'gym-2026-12-10', 'stream-2027-01-09'],
      payments: ['visa-late'],
      pay: ['pay-2033'],
    });
  });

  it('stays to the cent through a prune every night for two months', () => {
    let withRule = ROWS;
    let policyOnly = ROWS;
    const moved: string[] = [];
    let changed = 0;
    for (let today = '2033-11-15'; today <= '2034-01-15'; today = plusDays(today, 1)) {
      const before = balances(withRule, today);
      withRule = foldThenPrune(withRule, cutoffOn(today));
      const after = balances(withRule, today);
      if (JSON.stringify(before) !== JSON.stringify(after)) moved.push(today);
      const policyBefore = balances(policyOnly, today);
      policyOnly = prune(policyOnly, cutoffOn(today));
      if (JSON.stringify(policyBefore) !== JSON.stringify(balances(policyOnly, today)))
        changed += 1;
    }
    expect(moved).toEqual([]);
    // Without the rule: the first night, then the nights the 10 Dec 2026 gym charge and the 9 Jan
    // 2027 stream charge go.
    expect(changed).toBe(3);
  });
});

describe('the cutoff is the person’s own day', () => {
  it('so a phone west of UTC never loses a day it still counts', () => {
    // 03:30 UTC on 15 Nov 2033 is still 14 Nov in New York. Its phone counts from 14 Nov 2026.
    const evening: Rows = {
      ...ROWS,
      receipts: [
        ...ROWS.receipts,
        receipt('late', '2026-11-14', 60, { bank_account_id: EVERYDAY }),
      ],
    };
    const phoneToday = '2033-11-14';
    const before = balances(evening, phoneToday);
    // A server-wide date (15 Nov) would delete it; the person's own (14 Nov) keeps it.
    expect(
      balances(foldThenPrune(evening, sevenYearsBefore('2033-11-15')), phoneToday),
    ).not.toEqual(before);
    expect(balances(foldThenPrune(evening, sevenYearsBefore(phoneToday)), phoneToday)).toEqual(
      before,
    );
  });
});

describe('known limit, accepted for now: a charge paid from no card or account', () => {
  // A stopped gym bill paid with Skip, 39.99 on 10 Oct, 10 Nov and 10 Dec 2026: the first two are
  // before the cutoff. The book counts such a charge in Home's Current balance alone (from the
  // earliest typed day, or always when none is typed), and the rule has no typed balance to take it
  // into, so pruning it moves Home and nothing else.
  const skipGym = (asOf: string | null): Rows => ({
    sources: [{ id: EVERYDAY, kind: 'account', balance: 1000, asOf }],
    bills: [bill('gym', { amount: 39.99, starts_on: '2026-10-10', ends_on: '2026-12-31' })],
    subscriptions: [],
    receipts: [],
    charges: ['2026-10-10', '2026-11-10', '2026-12-10'].map((on) =>
      charge({ bill: 'gym' }, on, 39.99),
    ),
    payments: [],
    pay: [],
  });

  it.each(['2026-10-01', null])(
    'as-of %s: every balance stays, Home moves by exactly the deleted charges',
    (asOf) => {
      const rows = skipGym(asOf);
      const after = foldThenPrune(rows, CUTOFF);
      const deletedCents = rows.charges
        .filter((row) => !after.charges.includes(row))
        .reduce((sum, row) => sum + toCents(row.amount), 0);

      expect(balances(rows, TODAY)).toEqual({ home: 88003, [EVERYDAY]: 100000 });
      expect(balances(after, TODAY)).toEqual({ home: 96001, [EVERYDAY]: 100000 });
      expect(deletedCents).toBe(7998);
      expect(balances(after, TODAY).home - balances(rows, TODAY).home).toBe(deletedCents);
    },
  );
});

function plusDays(iso: string, count: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + count)).toISOString().slice(0, 10);
}
