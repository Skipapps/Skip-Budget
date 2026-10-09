import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useCurrentBalance, useSourceBalances, useSourceLedger } from '@/api/queries';
import type { Ledger, LedgerEntry } from '@/lib/card-ledger';
import { publishProStatus, resetProStatusForTests } from '@/lib/pro-status';

/**
 * The money book end to end through the real hooks, on a fake database: every card's and account's
 * balance (Money tab), the card or account page, and Home's Current balance all come out of the same
 * rows. Pay is read off the record where it has landed (pay_received) and off the salary's schedule
 * from the day after the last one on record. Figures are worked by hand to the cent; the identity every test also checks is
 *
 *   Σ account balances − Σ card balances + loose = Current balance
 *
 * where "loose" is pay that lands in no account less spending that leaves no account.
 */

const mockRows: Record<string, unknown[]> = {};
const mockFailures = new Set<string>();
const mockHolds = new Map<string, Promise<void>>();
const mockReleases: (() => void)[] = [];
const mockReads: string[] = [];
const mockPaymentSelects: string[] = [];
// A database that has not been given the payments.from_bank_account_id column yet.
let mockPaymentsLackFrom = false;
// A database that has not been given the pay_received table yet.
let mockPayTableMissing = false;

jest.mock('@/lib/supabase', () => {
  const build = (table: string) => {
    const part = table;
    let selected = '';
    const builder: Record<string, unknown> = {
      select: (columns: string) => {
        selected = columns;
        return builder;
      },
      order: () => builder,
      eq: () => builder,
      in: () => builder,
      maybeSingle: () => builder,
      // Awaited directly by every read in queries.ts, so the builder is its own promise.
      then: (resolve: (value: unknown) => unknown) => {
        mockReads.push(part);
        void (mockHolds.get(part) ?? Promise.resolve()).then(() => {
          if (mockFailures.has(part)) {
            return resolve({ data: null, error: new Error(`${part} is unreachable`) });
          }
          if (table === 'pay_received' && mockPayTableMissing) {
            return resolve({
              data: null,
              error: { code: '42P01', message: 'relation "pay_received" does not exist' },
            });
          }
          if (table === 'payments') {
            mockPaymentSelects.push(selected);
            const asked = selected.includes('from_bank_account_id');
            if (asked && mockPaymentsLackFrom) {
              return resolve({
                data: null,
                error: {
                  code: '42703',
                  message: 'column payments.from_bank_account_id is missing',
                },
              });
            }
            const rows = (mockRows.payments ?? []) as Record<string, unknown>[];
            // A select returns only the columns it names.
            return resolve({
              data: asked ? rows : rows.map(({ from_bank_account_id: _from, ...rest }) => rest),
              error: null,
            });
          }
          return resolve({ data: mockRows[table] ?? [], error: null });
        });
      },
    };
    return builder;
  };

  return {
    supabase: {
      from: (table: string) => build(table),
      rpc: async () => ({ data: null, error: null }),
      auth: { getUser: async () => ({ data: { user: null } }) },
    },
  };
});

jest.mock('@/providers/session-provider', () => ({ useUserId: () => 'user-1' }));

// queries.ts imports usePro for the payment-source list; the real one needs react-native-purchases.
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

const TODAY = '2026-10-20';

type Figures = { balance: number; income: number; expenses: number };
type Source = { card_id?: string; bank_account_id?: string };

const card = (
  id: string,
  balance: number,
  asOf: string | null,
  network = 'Visa',
  last4 = '4421',
) => ({
  id,
  holder: 'Sam',
  network,
  last4,
  color: '#111111',
  balance,
  balance_as_of: asOf,
  bill_due_day: null,
});

const account = (
  id: string,
  balance: number,
  asOf: string | null,
  nickname = 'Checking',
  last4 = '0042',
) => ({
  id,
  bank_name: 'Chase',
  nickname,
  account_type: 'checking',
  last4,
  color: '#222222',
  balance,
  balance_as_of: asOf,
});

const receipt = (id: string, purchased_on: string, amount: number, source: Source = {}) => ({
  id,
  brand_id: null,
  merchant: `Shop ${id}`,
  amount,
  purchased_on,
  category_id: 'other',
  card_id: source.card_id ?? null,
  bank_account_id: source.bank_account_id ?? null,
  note: null,
  source: 'manual',
  image_path: null,
  created_at: `${purchased_on}T12:00:00Z`,
  brands: null,
});

const bill = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  name: `Bill ${id}`,
  amount: 60,
  category_id: 'utilities',
  icon_id: null,
  recurrence: 'monthly',
  next_due_on: '2026-11-05',
  starts_on: null,
  ends_on: null,
  card_id: null,
  bank_account_id: null,
  created_at: '2026-08-01T00:00:00Z',
  brand_id: null,
  brands: null,
  ...over,
});

const subscription = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  brand_id: null,
  name: `Plan ${id}`,
  amount: 15.49,
  cycle: 'monthly',
  next_renewal_on: '2026-11-12',
  started_on: null,
  created_at: '2026-08-01T00:00:00Z',
  category_id: 'entertainment',
  card_id: null,
  bank_account_id: null,
  note: null,
  active: true,
  brands: null,
  ...over,
});

const charge = (
  id: string,
  plan: { bill?: string; subscription?: string },
  charged_on: string,
  amount: number,
  source: Source = {},
) => ({
  id,
  bill_id: plan.bill ?? null,
  subscription_id: plan.subscription ?? null,
  label: `Charge ${id}`,
  amount,
  charged_on,
  card_id: source.card_id ?? null,
  bank_account_id: source.bank_account_id ?? null,
});

const pay = (row: {
  amount: number;
  frequency: 'once' | 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
  /** The payday the schedule is walked from. */
  since: string | null;
  into?: string[];
  id?: string;
  name?: string;
}) => ({
  id: row.id ?? 'pay-1',
  name: row.name ?? 'Paycheck',
  amount: row.amount,
  frequency: row.frequency,
  last_payday: row.since,
  salary_source_accounts: (row.into ?? []).map((bank_account_id) => ({ bank_account_id })),
});

/** One pay that landed, with the amount, label and account it was copied with that day. */
const received = (
  id: string,
  paid_on: string,
  amount: number | string,
  over: Record<string, unknown> = {},
) => ({
  id,
  salary_source_id: 'pay-1',
  label: 'Paycheck',
  amount,
  paid_on,
  bank_account_id: 'checking',
  ...over,
});

/** A payment into a card (to.card) or an account (to.account), from an account or from outside. */
const payment = (
  id: string,
  amount: number,
  paid_on: string,
  to: { card?: string; account?: string },
  from: string | null = null,
) => ({
  id,
  card_id: to.card ?? null,
  bank_account_id: to.account ?? null,
  from_bank_account_id: from,
  amount,
  paid_on,
  note: null,
});

function freshWrapper() {
  const client = new QueryClient({
    // No retries: a failed read must reach isError on the first answer.
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const ACCOUNTS = ['checking', 'savings'] as const;
const CARDS = ['visa', 'amex'] as const;

/** All three hooks over the same rows, as the Money tab, a source page and Home each call them. */
function useEverything(day: string) {
  return {
    current: useCurrentBalance(day),
    balances: useSourceBalances(day),
    checking: useSourceLedger('checking', day),
    savings: useSourceLedger('savings', day),
    visa: useSourceLedger('visa', day),
    amex: useSourceLedger('amex', day),
    stranger: useSourceLedger('nobody', day),
  };
}

type Snapshot = {
  current: Figures;
  /** From useSourceBalances. */
  balances: Record<string, number>;
  /** From useSourceLedger, one per source. */
  ledgers: Record<(typeof ACCOUNTS)[number] | (typeof CARDS)[number], Ledger | null>;
  isError: boolean;
  isLoading: boolean;
};

function snapshotOf(all: ReturnType<typeof useEverything>): Snapshot {
  const { balance, income, expenses } = all.current;
  return {
    current: { balance, income, expenses },
    balances: Object.fromEntries(all.balances.balances),
    ledgers: {
      checking: all.checking.ledger,
      savings: all.savings.ledger,
      visa: all.visa.ledger,
      amex: all.amex.ledger,
    },
    isError: all.current.isError,
    isLoading: all.current.isLoading,
  };
}

/** Mounts the three hooks for a day and waits for every read to land (or fail). */
async function mount(today: string) {
  const view = await renderHook(({ day }: { day: string }) => useEverything(day), {
    wrapper: freshWrapper(),
    initialProps: { day: today },
  });
  await waitFor(() => expect(view.result.current.current.isLoading).toBe(false));

  return {
    result: view.result,
    snapshot: () => snapshotOf(view.result.current),
    /** The same data, asked about another day. */
    async on(day: string) {
      await view.rerender({ day });
      return snapshotOf(view.result.current);
    },
  };
}

async function bookOn(today: string = TODAY) {
  return (await mount(today)).snapshot();
}

const cents = (amount: number) => Math.round(amount * 100);

/**
 * The three hooks agree: each source's page shows the balance the Money tab shows, and the total
 * Home shows is the accounts less the cards, plus what is loose.
 */
function expectBooksAgree(snap: Snapshot, loose: number) {
  let total = cents(loose);
  for (const id of ACCOUNTS) if (id in snap.balances) total += cents(snap.balances[id]);
  for (const id of CARDS) if (id in snap.balances) total -= cents(snap.balances[id]);
  expect(total).toBe(cents(snap.current.balance));

  for (const [id, balance] of Object.entries(snap.balances)) {
    expect(snap.ledgers[id as keyof Snapshot['ledgers']]?.balance).toBe(balance);
  }
}

const idsOf = (ledger: Ledger | null) => (ledger?.entries ?? []).map((entry) => entry.id).sort();

const entryOf = (ledger: Ledger | null, id: string): LedgerEntry | undefined =>
  ledger?.entries.find((entry) => entry.id === id);

/** Keeps a part's read out until released, so the other reads can finish first. */
function hold(part: string) {
  mockHolds.set(
    part,
    new Promise<void>((resolve) => {
      mockReleases.push(resolve);
    }),
  );
}

beforeEach(() => {
  resetProStatusForTests();
  for (const table of Object.keys(mockRows)) delete mockRows[table];
  mockFailures.clear();
  mockHolds.clear();
  mockReads.length = 0;
  mockPaymentSelects.length = 0;
  mockPaymentsLackFrom = false;
  mockPayTableMissing = false;
});

afterEach(() => {
  for (const release of mockReleases.splice(0)) release();
});

/** Checking $1,000 and a Visa owed $200, both typed on 1 October; a $2,000 pay lands in checking. */
function aWorkedMonth() {
  mockRows.bank_accounts = [account('checking', 1000, '2026-10-01')];
  mockRows.cards = [card('visa', 200, '2026-10-01')];
  mockRows.salary_sources = [
    pay({ amount: 2000, frequency: 'monthly', since: '2026-10-15', into: ['checking'] }),
  ];
  mockRows.receipts = [
    receipt('visa', '2026-10-03', 50, { card_id: 'visa' }),
    receipt('checking', '2026-10-04', 30, { bank_account_id: 'checking' }),
    receipt('skip', '2026-10-05', 20),
  ];
}

describe('a worked month: checking, a Visa and a pay', () => {
  it('is typed balances, plus pay in checking, less what was spent, before any payment', async () => {
    aWorkedMonth();

    const snap = await bookOn();

    // Checking 1,000 + 2,000 - 30; the Visa 200 + 50; the $20 on no card is loose.
    expect(snap.balances).toEqual({ checking: 2970, visa: 250 });
    expect(snap.current).toEqual({ balance: 2700, income: 2000, expenses: 100 });
    expectBooksAgree(snap, -20);
  });

  it('a $250 Visa payment from checking moves the money and changes nothing in the total', async () => {
    aWorkedMonth();
    mockRows.payments = [payment('visa', 250, '2026-10-06', { card: 'visa' }, 'checking')];

    const snap = await bookOn();

    // Checking 1,000 + 2,000 - 30 - 250; the Visa 200 + 50 - 250.
    expect(snap.balances).toEqual({ checking: 2720, visa: 0 });
    expect(snap.current).toEqual({ balance: 2700, income: 2000, expenses: 100 });
    expectBooksAgree(snap, -20);

    expect(idsOf(snap.ledgers.checking)).toEqual([
      'income-pay-1@2026-10-15',
      'payment-visa:out',
      'receipt-checking',
    ]);
    expect(idsOf(snap.ledgers.visa)).toEqual(['payment-visa', 'receipt-visa']);
    expect(snap.ledgers.checking).toMatchObject({ charged: 280, paid: 2000, balance: 2720 });
    expect(snap.ledgers.visa).toMatchObject({ charged: 50, paid: 250, balance: 0 });
  });

  it('names the other side on each half of the payment', async () => {
    aWorkedMonth();
    mockRows.payments = [payment('visa', 250, '2026-10-06', { card: 'visa' }, 'checking')];

    const snap = await bookOn();

    expect(entryOf(snap.ledgers.visa, 'payment-visa')).toMatchObject({
      kind: 'payment',
      amount: 250,
      date: '2026-10-06',
      counterpart: 'Checking ••0042',
    });
    expect(entryOf(snap.ledgers.checking, 'payment-visa:out')).toMatchObject({
      kind: 'payment',
      amount: -250,
      date: '2026-10-06',
      counterpart: 'Visa ••4421',
    });
  });

  it.each([
    ['no account behind it', null],
    ['an account the person no longer has', 'removed-account'],
  ])('the same payment with %s raises the total by $250', async (_what, from) => {
    aWorkedMonth();
    mockRows.payments = [payment('visa', 250, '2026-10-06', { card: 'visa' }, from)];

    const snap = await bookOn();

    // Checking 1,000 + 2,000 - 30 is untouched; the Visa is cleared; 250 is new money.
    expect(snap.balances).toEqual({ checking: 2970, visa: 0 });
    expect(snap.current).toEqual({ balance: 2950, income: 2250, expenses: 100 });
    expectBooksAgree(snap, -20);

    expect(idsOf(snap.ledgers.checking)).toEqual(['income-pay-1@2026-10-15', 'receipt-checking']);
    expect(entryOf(snap.ledgers.visa, 'payment-visa')).toMatchObject({
      amount: 250,
      counterpart: null,
    });
  });

  it('leaves a payment out of both sides when it is dated before both typed balances', async () => {
    aWorkedMonth();
    mockRows.payments = [payment('old', 250, '2026-09-30', { card: 'visa' }, 'checking')];

    const snap = await bookOn();

    expect(snap.balances).toEqual({ checking: 2970, visa: 250 });
    expect(snap.current).toEqual({ balance: 2700, income: 2000, expenses: 100 });
    expect(idsOf(snap.ledgers.visa)).toEqual(['receipt-visa']);
  });
});

describe('a payment that is inside only one typed balance', () => {
  it('already in the card’s typed balance: it still leaves checking, and counts as money out', async () => {
    aWorkedMonth();
    // The Visa's 200 was typed on the 10th, after the payment on the 6th, so it already holds it.
    mockRows.cards = [card('visa', 200, '2026-10-10')];
    mockRows.payments = [payment('visa', 250, '2026-10-06', { card: 'visa' }, 'checking')];

    const snap = await bookOn();

    // Checking 1,000 + 2,000 - 30 - 250. The Visa's 50 on the 3rd is inside its typed 200 too.
    expect(snap.balances).toEqual({ checking: 2720, visa: 200 });
    // Out: the $30 and the $20 on no card, and the 250 that left for a card not counted.
    expect(snap.current).toEqual({ balance: 2500, income: 2000, expenses: 300 });
    expectBooksAgree(snap, -20);
    expect(idsOf(snap.ledgers.visa)).toEqual([]);
  });

  it('already in the account’s typed balance: it still clears the card, and counts as money in', async () => {
    aWorkedMonth();
    // Checking's 1,000 was typed on the 10th, so the $30 on the 4th and the payment are inside it.
    mockRows.bank_accounts = [account('checking', 1000, '2026-10-10')];
    mockRows.payments = [payment('visa', 250, '2026-10-06', { card: 'visa' }, 'checking')];

    const snap = await bookOn();

    // Checking 1,000 + 2,000; the Visa 200 + 50 - 250.
    expect(snap.balances).toEqual({ checking: 3000, visa: 0 });
    expect(snap.current).toEqual({ balance: 2980, income: 2250, expenses: 70 });
    expectBooksAgree(snap, -20);
    expect(idsOf(snap.ledgers.checking)).toEqual(['income-pay-1@2026-10-15']);
  });
});

describe('money added to an account', () => {
  beforeEach(() => {
    mockRows.bank_accounts = [
      account('checking', 1000, '2026-10-01'),
      account('savings', 500, '2026-10-01', 'Savings', '9911'),
    ];
  });

  it('from another of the person’s accounts is a move: the total stays', async () => {
    mockRows.payments = [payment('add', 100, '2026-10-06', { account: 'savings' }, 'checking')];

    const snap = await bookOn();

    expect(snap.balances).toEqual({ checking: 900, savings: 600 });
    expect(snap.current).toEqual({ balance: 1500, income: 0, expenses: 0 });
    expectBooksAgree(snap, 0);

    expect(entryOf(snap.ledgers.savings, 'payment-add')).toMatchObject({
      amount: 100,
      counterpart: 'Checking ••0042',
    });
    expect(entryOf(snap.ledgers.checking, 'payment-add:out')).toMatchObject({
      amount: -100,
      counterpart: 'Savings ••9911',
    });
  });

  it('with no account behind it is new money: the account and the total both rise', async () => {
    mockRows.payments = [payment('add', 100, '2026-10-06', { account: 'savings' }, null)];

    const snap = await bookOn();

    expect(snap.balances).toEqual({ checking: 1000, savings: 600 });
    expect(snap.current).toEqual({ balance: 1600, income: 100, expenses: 0 });
    expectBooksAgree(snap, 0);
    expect(entryOf(snap.ledgers.savings, 'payment-add')?.counterpart).toBeNull();
    expect(idsOf(snap.ledgers.checking)).toEqual([]);
  });

  it('is called by its note, or Payment when it has none or only spaces', async () => {
    mockRows.payments = [
      {
        ...payment('noted', 100, '2026-10-06', { account: 'savings' }, null),
        note: ' Birthday money ',
      },
      { ...payment('blank', 5, '2026-10-07', { account: 'savings' }, null), note: '   ' },
      payment('plain', 7, '2026-10-08', { account: 'savings' }, null),
    ];

    const snap = await bookOn();

    expect(entryOf(snap.ledgers.savings, 'payment-noted')?.label).toBe('Birthday money');
    expect(entryOf(snap.ledgers.savings, 'payment-blank')?.label).toBe('Payment');
    expect(entryOf(snap.ledgers.savings, 'payment-plain')?.label).toBe('Payment');
  });

  it('counts the move once in each account’s money in and money out', async () => {
    mockRows.payments = [payment('add', 100.5, '2026-10-06', { account: 'savings' }, 'checking')];

    const snap = await bookOn();

    expect(snap.ledgers.checking).toMatchObject({ charged: 100.5, paid: 0, balance: 899.5 });
    expect(snap.ledgers.savings).toMatchObject({ charged: 0, paid: 100.5, balance: 600.5 });
  });
});

describe('a bill or a subscription due later this month', () => {
  const dueOn25th = {
    bill: () => {
      mockRows.bills = [
        bill('internet', {
          amount: 60,
          next_due_on: '2026-10-25',
          bank_account_id: 'checking',
          created_at: '2026-10-01T00:00:00Z',
        }),
      ];
      return 'bill-internet@2026-10-25';
    },
    subscription: () => {
      mockRows.subscriptions = [
        subscription('streaming', {
          amount: 60,
          next_renewal_on: '2026-10-25',
          bank_account_id: 'checking',
          created_at: '2026-10-01T00:00:00Z',
        }),
      ];
      return 'subscription-streaming@2026-10-25';
    },
  };

  it.each(['bill', 'subscription'] as const)(
    'does not touch checking or the total until the %s’s day, then lowers both on it',
    async (kind) => {
      mockRows.bank_accounts = [account('checking', 1000, '2026-10-01')];
      const occurrence = dueOn25th[kind]();

      const view = await mount('2026-10-24');
      let snap = view.snapshot();
      expect(snap.balances).toEqual({ checking: 1000 });
      expect(snap.current).toEqual({ balance: 1000, income: 0, expenses: 0 });
      expect(idsOf(snap.ledgers.checking)).toEqual([]);

      snap = await view.on('2026-10-25');
      expect(snap.balances).toEqual({ checking: 940 });
      expect(snap.current).toEqual({ balance: 940, income: 0, expenses: 60 });
      expect(idsOf(snap.ledgers.checking)).toEqual([occurrence]);
      expectBooksAgree(snap, 0);

      snap = await view.on('2026-10-26');
      expect(snap.balances).toEqual({ checking: 940 });
      expect(snap.current).toEqual({ balance: 940, income: 0, expenses: 60 });
    },
  );

  it('counts what was charged once it is recorded, once, and not before its day', async () => {
    mockRows.bank_accounts = [account('checking', 1000, '2026-10-01')];
    mockRows.bills = [
      bill('internet', {
        amount: 59.99,
        next_due_on: '2026-11-25',
        bank_account_id: 'checking',
        created_at: '2026-10-01T00:00:00Z',
      }),
    ];
    mockRows.charges = [
      charge('internet-oct', { bill: 'internet' }, '2026-10-25', 61.4, {
        bank_account_id: 'checking',
      }),
    ];

    const view = await mount('2026-10-24');
    expect(view.snapshot().current).toEqual({ balance: 1000, income: 0, expenses: 0 });

    // The charge, not the plan's $59.99, and not both.
    const snap = await view.on('2026-10-25');
    expect(snap.balances).toEqual({ checking: 938.6 });
    expect(snap.current).toEqual({ balance: 938.6, income: 0, expenses: 61.4 });
    expect(idsOf(snap.ledgers.checking)).toEqual(['charge-internet-oct']);

    expect((await view.on('2026-10-31')).current).toEqual({
      balance: 938.6,
      income: 0,
      expenses: 61.4,
    });
  });
});

describe('pay on the record', () => {
  // Checking was typed on 1 September; savings the same day.
  beforeEach(() => {
    mockRows.bank_accounts = [
      account('checking', 500, '2026-09-01'),
      account('savings', 500, '2026-09-01', 'Savings', '9911'),
    ];
  });

  it('keeps the amount a pay landed with, so a raise changes only what comes after it', async () => {
    mockRows.pay_received = [received('p-sep', '2026-09-15', 2000)];
    mockRows.salary_sources = [
      pay({ amount: 2500, frequency: 'monthly', since: '2026-09-15', into: ['checking'] }),
    ];

    const snap = await bookOn();

    // 500 + 2,000 recorded on the 15th of September + 2,500 on the schedule on the 15th of October.
    expect(snap.balances).toEqual({ checking: 5000, savings: 500 });
    expect(snap.current).toEqual({ balance: 5500, income: 4500, expenses: 0 });
    expect(idsOf(snap.ledgers.checking)).toEqual(['income-pay-1@2026-10-15', 'pay-p-sep']);
    expect(entryOf(snap.ledgers.checking, 'pay-p-sep')).toMatchObject({
      kind: 'income',
      amount: 2000,
      label: 'Paycheck',
    });
    expectBooksAgree(snap, 0);
  });

  it('keeps the account a pay landed in when the salary is moved to another one', async () => {
    mockRows.pay_received = [received('p-sep', '2026-09-15', 2000)];
    mockRows.salary_sources = [
      pay({ amount: 2500, frequency: 'monthly', since: '2026-09-15', into: ['savings'] }),
    ];

    const snap = await bookOn();

    expect(snap.balances).toEqual({ checking: 2500, savings: 3000 });
    expect(snap.current).toEqual({ balance: 5500, income: 4500, expenses: 0 });
    expect(idsOf(snap.ledgers.checking)).toEqual(['pay-p-sep']);
    expect(idsOf(snap.ledgers.savings)).toEqual(['income-pay-1@2026-10-15']);
  });

  it('counts a payday that is both on the record and on the schedule once', async () => {
    mockRows.bank_accounts = [account('checking', 1000, '2026-10-01')];
    mockRows.pay_received = [received('p-oct', '2026-10-15', 2000)];
    mockRows.salary_sources = [
      pay({ amount: 2000, frequency: 'monthly', since: '2026-10-15', into: ['checking'] }),
    ];

    const view = await mount('2026-10-20');
    let snap = view.snapshot();
    expect(snap.balances).toEqual({ checking: 3000 });
    expect(snap.current).toEqual({ balance: 3000, income: 2000, expenses: 0 });
    expect(idsOf(snap.ledgers.checking)).toEqual(['pay-p-oct']);

    snap = await view.on('2026-11-14');
    expect(snap.balances).toEqual({ checking: 3000 });

    // The next payday is not on the record yet, so the schedule supplies it.
    snap = await view.on('2026-11-15');
    expect(snap.balances).toEqual({ checking: 5000 });
    expect(snap.current).toEqual({ balance: 5000, income: 4000, expenses: 0 });
    expect(idsOf(snap.ledgers.checking)).toEqual(['income-pay-1@2026-11-15', 'pay-p-oct']);
  });

  it('keeps pay received from a salary that has since been removed', async () => {
    mockRows.pay_received = [
      received('p-gone', '2026-09-15', 1800.4, { salary_source_id: null, label: 'Old job' }),
    ];

    const snap = await bookOn();

    expect(snap.balances).toEqual({ checking: 2300.4, savings: 500 });
    expect(snap.current).toEqual({ balance: 2800.4, income: 1800.4, expenses: 0 });
    expect(entryOf(snap.ledgers.checking, 'pay-p-gone')).toMatchObject({
      kind: 'income',
      label: 'Old job',
      amount: 1800.4,
    });
  });

  it('is in no account when the account it landed in has since been removed', async () => {
    mockRows.pay_received = [received('p-sep', '2026-09-15', 2000, { bank_account_id: null })];

    const snap = await bookOn();

    expect(snap.balances).toEqual({ checking: 500, savings: 500 });
    expect(snap.current).toEqual({ balance: 3000, income: 2000, expenses: 0 });
    expectBooksAgree(snap, 2000);
  });

  it.each([
    ['a card', 'visa'],
    ['an account the person does not have', 'removed-account'],
  ])('is in no account when it was recorded against %s', async (_what, accountId) => {
    mockRows.cards = [card('visa', 100, '2026-09-01')];
    mockRows.pay_received = [received('p-sep', '2026-09-15', 2000, { bank_account_id: accountId })];

    const snap = await bookOn();

    // Pay never lands on a card: nothing moves but the total.
    expect(snap.balances).toEqual({ checking: 500, savings: 500, visa: 100 });
    expect(snap.current).toEqual({ balance: 2900, income: 2000, expenses: 0 });
    expectBooksAgree(snap, 2000);
    expect(idsOf(snap.ledgers.visa)).toEqual([]);
  });

  it('calls a pay recorded without a name "Income"', async () => {
    mockRows.pay_received = [received('p-sep', '2026-09-15', 2000, { label: '' })];

    const snap = await bookOn();

    expect(entryOf(snap.ledgers.checking, 'pay-p-sep')?.label).toBe('Income');
  });

  it('leaves out a pay dated before the day typed for the account it landed in', async () => {
    mockRows.bank_accounts = [account('checking', 1000, '2026-10-10')];
    mockRows.pay_received = [
      received('p-sep', '2026-09-15', 2000),
      received('p-oct', '2026-10-15', 2000),
    ];

    const snap = await bookOn();

    expect(snap.balances).toEqual({ checking: 3000 });
    expect(snap.current).toEqual({ balance: 3000, income: 2000, expenses: 0 });
    expect(idsOf(snap.ledgers.checking)).toEqual(['pay-p-oct']);
  });

  it('counts a pay on the record from its day and no sooner', async () => {
    mockRows.bank_accounts = [account('checking', 1000, '2026-10-01')];
    mockRows.pay_received = [received('p-later', '2026-10-21', 2000)];

    const view = await mount('2026-10-20');
    expect(view.snapshot().balances).toEqual({ checking: 1000 });
    expect(view.snapshot().current).toEqual({ balance: 1000, income: 0, expenses: 0 });

    const snap = await view.on('2026-10-21');
    expect(snap.balances).toEqual({ checking: 3000 });
    expect(snap.current).toEqual({ balance: 3000, income: 2000, expenses: 0 });
  });

  it('reads an amount that arrives as text to the cent', async () => {
    mockRows.pay_received = [received('p-sep', '2026-09-15', '2314.82')];

    const snap = await bookOn();

    expect(snap.balances).toEqual({ checking: 2814.82, savings: 500 });
    expect(snap.current).toEqual({ balance: 3314.82, income: 2314.82, expenses: 0 });
  });

  it('does not let one salary’s record hold back another salary’s schedule', async () => {
    mockRows.pay_received = [received('p-a', '2026-10-15', 2000, { salary_source_id: 'pay-a' })];
    mockRows.salary_sources = [
      pay({
        id: 'pay-a',
        amount: 2000,
        frequency: 'monthly',
        since: '2026-10-15',
        into: ['checking'],
      }),
      pay({
        id: 'pay-b',
        name: 'Side gig',
        amount: 300,
        frequency: 'monthly',
        since: '2026-09-20',
        into: ['savings'],
      }),
    ];

    const snap = await bookOn();

    // A: the recorded 15 October. B: 20 September and 20 October, none of it recorded.
    expect(snap.balances).toEqual({ checking: 2500, savings: 1100 });
    expect(snap.current).toEqual({ balance: 3600, income: 2600, expenses: 0 });
  });

  it('adds nothing for a salary that has never paid and has nothing on record', async () => {
    mockRows.salary_sources = [
      pay({ amount: 2000, frequency: 'monthly', since: null, into: ['checking'] }),
    ];

    const snap = await bookOn();

    expect(snap.balances).toEqual({ checking: 500, savings: 500 });
    expect(snap.current).toEqual({ balance: 1000, income: 0, expenses: 0 });
  });

  it('works from the schedule alone, and is not an error, on a database without the table', async () => {
    mockPayTableMissing = true;
    aWorkedMonth();

    const snap = await bookOn();

    expect(snap.isError).toBe(false);
    expect(snap.balances).toEqual({ checking: 2970, visa: 250 });
    expect(snap.current).toEqual({ balance: 2700, income: 2000, expenses: 100 });
  });
});

describe('a rent bill due on the 1st', () => {
  it('lowers checking from the 1st, once, and the month before stays inside the typed balance', async () => {
    mockRows.bank_accounts = [account('checking', 3000, '2026-09-20')];
    mockRows.bills = [
      bill('rent', {
        name: 'Rent',
        amount: 1450,
        // A stale anchor: the rent still lands on the 1st.
        next_due_on: '2026-11-01',
        bank_account_id: 'checking',
        created_at: '2026-08-15T00:00:00Z',
      }),
    ];

    const view = await mount('2026-09-30');
    expect(view.snapshot().balances).toEqual({ checking: 3000 });

    let snap = await view.on('2026-10-01');
    expect(snap.balances).toEqual({ checking: 1550 });
    expect(snap.current).toEqual({ balance: 1550, income: 0, expenses: 1450 });
    expect(idsOf(snap.ledgers.checking)).toEqual(['bill-rent@2026-10-01']);

    snap = await view.on('2026-10-02');
    expect(snap.balances).toEqual({ checking: 1550 });
  });
});

describe('a pay twice a month', () => {
  it.each([
    ['the day before the 15th', '2026-09-14', 0, []],
    ['the 15th', '2026-09-15', 1234.56, ['2026-09-15']],
    ['the 29th', '2026-09-29', 1234.56, ['2026-09-15']],
    ['the last day, which adds to the 15th', '2026-09-30', 2469.12, ['2026-09-15', '2026-09-30']],
    ['the day before the next 15th', '2026-10-14', 2469.12, ['2026-09-15', '2026-09-30']],
    [
      'the next 15th, which adds to both',
      '2026-10-15',
      3703.68,
      ['2026-09-15', '2026-09-30', '2026-10-15'],
    ],
  ])('on %s (%s) checking has been paid %d', async (_when, today, paid, paydays) => {
    mockRows.bank_accounts = [account('checking', 500, '2026-09-01')];
    mockRows.salary_sources = [
      pay({ amount: 1234.56, frequency: 'semimonthly', since: '2026-09-15', into: ['checking'] }),
    ];

    const snap = await bookOn(today);

    expect(snap.balances).toEqual({ checking: 500 + paid });
    expect(snap.current).toEqual({ balance: 500 + paid, income: paid, expenses: 0 });
    expect(idsOf(snap.ledgers.checking)).toEqual(paydays.map((day) => `income-pay-1@${day}`));
    for (const entry of snap.ledgers.checking?.entries ?? []) {
      expect(entry).toMatchObject({ kind: 'income', label: 'Paycheck', amount: 1234.56 });
    }
  });
});

describe('a plan the ledger no longer walks', () => {
  type Way = {
    label: string;
    /** Writes the plan and its charges; `running` is whether the ledger still walks it. */
    write: (running: boolean) => void;
    /** What the October charge cost. */
    spent: number;
  };

  const SUBSCRIPTION_CHARGES = [
    charge('oct', { subscription: 'plan' }, '2026-10-03', 15.49, { card_id: 'visa' }),
    charge('sep', { subscription: 'plan' }, '2026-09-03', 15.49, { card_id: 'visa' }),
  ];

  const ways: Way[] = [
    {
      label: 'a subscription that is cancelled',
      spent: 15.49,
      write: (running) => {
        mockRows.subscriptions = [
          subscription('plan', { card_id: 'visa', active: running, next_renewal_on: '2026-11-03' }),
        ];
        mockRows.charges = SUBSCRIPTION_CHARGES;
      },
    },
    {
      label: 'a subscription with no next renewal',
      spent: 15.49,
      write: (running) => {
        mockRows.subscriptions = [
          subscription('plan', { card_id: 'visa', next_renewal_on: running ? '2026-11-03' : null }),
        ];
        mockRows.charges = SUBSCRIPTION_CHARGES;
      },
    },
    {
      label: 'a bill with no next due date',
      spent: 61.4,
      write: (running) => {
        mockRows.bills = [
          bill('plan', { card_id: 'visa', next_due_on: running ? '2026-11-03' : null }),
        ];
        mockRows.charges = [
          charge('oct', { bill: 'plan' }, '2026-10-03', 61.4, { card_id: 'visa' }),
          charge('sep', { bill: 'plan' }, '2026-09-03', 61.4, { card_id: 'visa' }),
        ];
      },
    },
  ];

  // Visa owed $100 and checking $1,000, both typed on 1 October.
  beforeEach(() => {
    mockRows.bank_accounts = [account('checking', 1000, '2026-10-01')];
    mockRows.cards = [card('visa', 100, '2026-10-01')];
  });

  it.each(ways)(
    'keeps what $label already charged on its card, so nothing jumps when it stops',
    async ({ write, spent }) => {
      write(true);
      const whileRunning = await bookOn();

      write(false);
      const afterwards = await bookOn();

      expect(afterwards.balances).toEqual(whileRunning.balances);
      expect(afterwards.current).toEqual(whileRunning.current);
      // Only the October charge: September is already inside the Visa balance typed on the 1st.
      expect(afterwards.balances).toEqual({ checking: 1000, visa: 100 + spent });
      expect(afterwards.current).toEqual({
        balance: 900 - spent,
        income: 0,
        expenses: spent,
      });
      expect(idsOf(afterwards.ledgers.visa)).toEqual(['charge-oct']);
      expectBooksAgree(afterwards, 0);
    },
  );

  it('keeps the charge’s own label and amount on the card’s page once the plan is cancelled', async () => {
    ways[0].write(false);

    const snap = await bookOn();

    expect(entryOf(snap.ledgers.visa, 'charge-oct')).toMatchObject({
      label: 'Charge oct',
      amount: -15.49,
      kind: 'subscription',
      date: '2026-10-03',
    });
  });

  it('counts a running plan’s charge once, not through the ledger and again as a leftover', async () => {
    ways[2].write(true);

    const snap = await bookOn();

    expect(snap.current.expenses).toBe(61.4);
    expect(idsOf(snap.ledgers.visa)).toEqual(['charge-oct']);
  });

  it('counts a leftover charge on the card it was charged to, not the plan’s current one', async () => {
    mockRows.cards = [
      card('visa', 100, '2026-10-10'),
      card('amex', 0, '2026-10-01', 'Amex', '1005'),
    ];
    mockRows.subscriptions = [subscription('plan', { card_id: 'amex', active: false })];
    mockRows.charges = [
      // Visa's balance was typed on the 10th, so the 3rd is inside it; the same day on Amex is not.
      charge('on-visa', { subscription: 'plan' }, '2026-10-03', 15.49, { card_id: 'visa' }),
      charge('on-amex', { subscription: 'plan' }, '2026-10-03', 9.99, { card_id: 'amex' }),
    ];

    const snap = await bookOn();

    expect(snap.balances).toEqual({ checking: 1000, visa: 100, amex: 9.99 });
    expect(snap.current.expenses).toBe(9.99);
  });
});

describe('the card or account a charge landed on', () => {
  it('is the one it was charged to then, not the one its bill uses now', async () => {
    mockRows.cards = [card('visa', 0, '2026-10-10')];
    mockRows.bank_accounts = [account('checking', 1000, '2026-10-01')];
    // Moved from the Visa to checking after the first charge.
    mockRows.bills = [
      bill('internet', {
        amount: 59.99,
        next_due_on: '2026-11-05',
        bank_account_id: 'checking',
        card_id: null,
      }),
    ];
    mockRows.charges = [
      // Before the Visa's typed day: already inside it, though checking's day is earlier.
      charge('on-visa', { bill: 'internet' }, '2026-10-05', 61.4, { card_id: 'visa' }),
      charge('on-checking', { bill: 'internet' }, '2026-10-12', 61.4, {
        bank_account_id: 'checking',
      }),
    ];

    const snap = await bookOn();

    expect(snap.balances).toEqual({ checking: 938.6, visa: 0 });
    expect(snap.current).toEqual({ balance: 938.6, income: 0, expenses: 61.4 });
  });

  it('counts spending on no card, or on one since removed, from the first typed day', async () => {
    mockRows.bank_accounts = [account('checking', 500, '2026-10-01')];
    mockRows.receipts = [
      receipt('skip-before', '2026-09-30', 10),
      receipt('skip-first-day', '2026-10-01', 10),
      receipt('gone-before', '2026-09-29', 5, { card_id: 'removed' }),
      receipt('gone-after', '2026-10-05', 5, { card_id: 'removed' }),
    ];

    const snap = await bookOn();

    // The account is untouched; 500 - (10 + 5) is all in the total.
    expect(snap.balances).toEqual({ checking: 500 });
    expect(snap.current).toEqual({ balance: 485, income: 0, expenses: 15 });
    expectBooksAgree(snap, -15);
  });

  it('counts everything spent on a card whose balance was never given a day', async () => {
    mockRows.cards = [card('visa', 0, null)];
    mockRows.receipts = [receipt('long-ago', '2026-03-02', 25.5, { card_id: 'visa' })];

    const snap = await bookOn();

    expect(snap.balances).toEqual({ visa: 25.5 });
    expect(snap.current).toEqual({ balance: -25.5, income: 0, expenses: 25.5 });
  });
});

describe('the account a pay lands in', () => {
  const monthlyPay = (into: string[]) => [
    pay({ amount: 2500, frequency: 'monthly', since: '2026-09-25', into }),
  ];

  // Checking was typed on 1 September and savings on 10 October; the pay is on the 25th.
  beforeEach(() => {
    mockRows.bank_accounts = [
      account('checking', 1000, '2026-09-01'),
      account('savings', 500, '2026-10-10', 'Savings', '9911'),
    ];
  });

  it('is in no account when it is linked to none: both paydays count, no balance moves', async () => {
    mockRows.salary_sources = monthlyPay([]);

    const snap = await bookOn('2026-10-30');

    expect(snap.balances).toEqual({ checking: 1000, savings: 500 });
    expect(snap.current).toEqual({ balance: 6500, income: 5000, expenses: 0 });
    expectBooksAgree(snap, 5000);
  });

  it('leaves out a payday before the day typed for the account it lands in', async () => {
    mockRows.salary_sources = monthlyPay(['savings']);

    const snap = await bookOn('2026-10-30');

    // 25 September is inside the savings balance typed on 10 October; 25 October is not.
    expect(snap.balances).toEqual({ checking: 1000, savings: 3000 });
    expect(snap.current).toEqual({ balance: 4000, income: 2500, expenses: 0 });
    expect(idsOf(snap.ledgers.savings)).toEqual(['income-pay-1@2026-10-25']);
    expectBooksAgree(snap, 0);
  });

  it.each([
    ['in the order the person has them', ['checking', 'savings']],
    ['however they are linked', ['savings', 'checking']],
  ])('lands once, in the first linked account %s', async (_how, into) => {
    mockRows.salary_sources = monthlyPay(into);

    const snap = await bookOn('2026-10-30');

    expect(snap.balances).toEqual({ checking: 6000, savings: 500 });
    expect(snap.current).toEqual({ balance: 6500, income: 5000, expenses: 0 });
    expect(idsOf(snap.ledgers.savings)).toEqual([]);
    expect(idsOf(snap.ledgers.checking)).toEqual([
      'income-pay-1@2026-09-25',
      'income-pay-1@2026-10-25',
    ]);
  });

  it('lands in the first account it is linked to that the person still has', async () => {
    mockRows.salary_sources = monthlyPay(['removed-account', 'savings']);

    const snap = await bookOn('2026-10-30');

    expect(snap.balances).toEqual({ checking: 1000, savings: 3000 });
    expect(snap.current.income).toBe(2500);
  });

  it('is in no account when every account it was linked to is gone', async () => {
    mockRows.salary_sources = monthlyPay(['removed-account']);

    const snap = await bookOn('2026-10-30');

    expect(snap.balances).toEqual({ checking: 1000, savings: 500 });
    expect(snap.current).toEqual({ balance: 6500, income: 5000, expenses: 0 });
  });

  it.each([
    ['the day before the day typed for its account', '2026-10-09', 0],
    ['the day typed for its account', '2026-10-10', 2500],
  ])('counts a one-off pay dated %s as %d', async (_when, since, paid) => {
    mockRows.salary_sources = [pay({ amount: 2500, frequency: 'once', since, into: ['savings'] })];

    const snap = await bookOn('2026-10-30');

    expect(snap.balances).toEqual({ checking: 1000, savings: 500 + paid });
    expect(snap.current).toEqual({ balance: 1500 + paid, income: paid, expenses: 0 });
  });
});

describe('a database without the payments.from column', () => {
  it('reads every payment as money from outside, and is not an error', async () => {
    aWorkedMonth();
    mockPaymentsLackFrom = true;
    mockRows.payments = [payment('visa', 250, '2026-10-06', { card: 'visa' }, 'checking')];

    const snap = await bookOn();

    // As if no account were behind it: checking untouched, the Visa cleared, 250 new.
    expect(snap.balances).toEqual({ checking: 2970, visa: 0 });
    expect(snap.current).toEqual({ balance: 2950, income: 2250, expenses: 100 });
    expect(snap.isError).toBe(false);
    expectBooksAgree(snap, -20);
  });

  it('asks for the column first, and only then reads without it', async () => {
    aWorkedMonth();
    mockPaymentsLackFrom = true;
    mockRows.payments = [payment('visa', 250, '2026-10-06', { card: 'visa' }, 'checking')];

    await bookOn();

    expect(mockPaymentSelects).toHaveLength(2);
    expect(mockPaymentSelects[0]).toContain('from_bank_account_id');
    expect(mockPaymentSelects[1]).not.toContain('from_bank_account_id');
  });

  it('is one read when the column is there, which is what makes the difference above', async () => {
    aWorkedMonth();
    mockRows.payments = [payment('visa', 250, '2026-10-06', { card: 'visa' }, 'checking')];

    const snap = await bookOn();

    expect(mockPaymentSelects).toHaveLength(1);
    expect(snap.balances).toEqual({ checking: 2720, visa: 0 });
  });
});

describe('nothing after today', () => {
  it('counts a receipt, a charge, a bill, a payment and a payday only from the day each falls', async () => {
    mockRows.bank_accounts = [account('checking', 1000, '2026-10-01')];
    mockRows.cards = [card('visa', 100, '2026-10-01')];
    mockRows.receipts = [receipt('tomorrow', '2026-10-21', 10, { bank_account_id: 'checking' })];
    mockRows.bills = [
      bill('internet', {
        amount: 60,
        next_due_on: '2026-10-21',
        bank_account_id: 'checking',
        created_at: '2026-10-01T00:00:00Z',
      }),
    ];
    mockRows.subscriptions = [
      subscription('netflix', { amount: 15.49, bank_account_id: 'checking' }),
      subscription('gym', { amount: 29, active: false, bank_account_id: 'checking' }),
    ];
    mockRows.charges = [
      charge('netflix', { subscription: 'netflix' }, '2026-10-21', 15.49, {
        bank_account_id: 'checking',
      }),
      charge('gym', { subscription: 'gym' }, '2026-10-21', 29, { bank_account_id: 'checking' }),
    ];
    mockRows.payments = [payment('visa', 40, '2026-10-21', { card: 'visa' }, 'checking')];
    // Paid on the 14th and the 21st.
    mockRows.salary_sources = [
      pay({ amount: 800, frequency: 'weekly', since: '2026-10-14', into: ['checking'] }),
    ];

    const view = await mount('2026-10-20');
    let snap = view.snapshot();
    expect(snap.balances).toEqual({ checking: 1800, visa: 100 });
    expect(snap.current).toEqual({ balance: 1700, income: 800, expenses: 0 });

    snap = await view.on('2026-10-21');
    // Checking 1,000 + 1,600 - (10 + 60 + 15.49 + 29) - 40; the Visa 100 - 40.
    expect(snap.balances).toEqual({ checking: 2445.51, visa: 60 });
    expect(snap.current).toEqual({ balance: 2385.51, income: 1600, expenses: 114.49 });
    expectBooksAgree(snap, 0);
  });
});

describe('the free plan’s 90-day list', () => {
  it('does not shorten any balance: spending and pay from before the list starts still count', async () => {
    mockRows.bank_accounts = [account('checking', 500, '2026-05-01')];
    mockRows.cards = [card('amex', 0, null, 'Amex', '1005')];
    mockRows.receipts = [
      receipt('may', '2026-05-15', 300, { card_id: 'amex' }),
      receipt('october', '2026-10-01', 20, { card_id: 'amex' }),
    ];
    mockRows.pay_received = [received('p-may', '2026-05-20', 1000)];

    const pro = await bookOn();
    await act(async () => publishProStatus({ pro: false, ready: true }));
    const free = await bookOn();

    // Checking 500 + 1,000; the Amex 300 + 20.
    expect(pro.balances).toEqual({ checking: 1500, amex: 320 });
    expect(pro.current).toEqual({ balance: 1180, income: 1000, expenses: 320 });
    expect(free.balances).toEqual(pro.balances);
    expect(free.current).toEqual(pro.current);
    // The pages keep every row, so they can say what the free list hides.
    expect(idsOf(free.ledgers.amex)).toEqual(['receipt-may', 'receipt-october']);
    expect(idsOf(free.ledgers.checking)).toEqual(['pay-p-may']);
  });
});
describe('a statement, to the cent, through all three hooks', () => {
  function statement() {
    mockRows.bank_accounts = [
      account('checking', 4218.37, '2026-10-01'),
      account('savings', 2500, '2026-10-01', 'Savings', '9911'),
    ];
    mockRows.cards = [
      card('visa', 812.45, '2026-10-01'),
      card('amex', 96.1, '2026-10-10', 'Amex', '1005'),
    ];
    mockRows.salary_sources = [
      // Paid on 2 and 16 October into checking; the 30th has not come.
      pay({ amount: 2314.82, frequency: 'biweekly', since: '2026-10-02', into: ['checking'] }),
      // Paid into no account.
      pay({ id: 'pay-2', name: 'Side gig', amount: 120, frequency: 'once', since: '2026-10-08' }),
    ];
    mockRows.receipts = [
      receipt('whole-foods', '2026-10-03', 87.43, { card_id: 'visa' }),
      receipt('deli', '2026-10-04', 12.57, { bank_account_id: 'checking' }),
      receipt('coffee', '2026-10-05', 4.75),
      // The Amex balance was typed on the 10th: the 9th is inside it, the 10th is not.
      receipt('amex-9th', '2026-10-09', 39.99, { card_id: 'amex' }),
      receipt('amex-10th', '2026-10-10', 21.31, { card_id: 'amex' }),
      // The Visa balance was typed on the 1st.
      receipt('visa-september', '2026-09-28', 55, { card_id: 'visa' }),
      receipt('tomorrow', '2026-10-21', 18, { bank_account_id: 'checking' }),
    ];
    mockRows.bills = [bill('internet', { amount: 59.99, card_id: 'visa' })];
    mockRows.subscriptions = [
      subscription('netflix', { amount: 15.49, bank_account_id: 'checking' }),
      subscription('gym', { amount: 29, active: false, bank_account_id: 'checking' }),
    ];
    mockRows.charges = [
      // Taken at $61.40, not the $59.99 the bill says.
      charge('internet-oct', { bill: 'internet' }, '2026-10-05', 61.4, { card_id: 'visa' }),
      charge('internet-sep', { bill: 'internet' }, '2026-09-05', 61.4, { card_id: 'visa' }),
      charge('netflix-oct', { subscription: 'netflix' }, '2026-10-12', 15.49, {
        bank_account_id: 'checking',
      }),
      charge('gym-oct', { subscription: 'gym' }, '2026-10-15', 29, { bank_account_id: 'checking' }),
    ];
    mockRows.payments = [
      payment('visa-300', 300, '2026-10-14', { card: 'visa' }, 'checking'),
      payment('amex-50', 50, '2026-10-12', { card: 'amex' }, null),
      payment('add-400', 400, '2026-10-06', { account: 'savings' }, 'checking'),
      payment('new-75', 75.25, '2026-10-08', { account: 'savings' }, null),
      // Before both typed balances, so inside both.
      payment('before', 100, '2026-09-30', { card: 'visa' }, 'checking'),
    ];
  }

  it('shows every balance and the total, worked by hand', async () => {
    statement();

    const snap = await bookOn();

    // Checking: 4,218.37 + 4,629.64 pay - 12.57 - 15.49 - 29.00 - 300.00 to the Visa - 400.00 to savings
    // Savings:  2,500.00 + 400.00 from checking + 75.25 new money
    // Visa owed: 812.45 + 87.43 + 61.40 - 300.00
    // Amex owed: 96.10 + 21.31 - 50.00
    expect(snap.balances).toEqual({
      checking: 8090.95,
      savings: 2975.25,
      visa: 661.28,
      amex: 67.41,
    });
    // Loose: the $4.75 coffee out, the $120.00 side gig in.
    // 8,090.95 + 2,975.25 - 661.28 - 67.41 + 115.25
    expect(snap.current.balance).toBe(10452.76);
    // Income: 4,629.64 + 120.00 + 50.00 + 75.25. Expenses: every receipt and charge that counts.
    expect(snap.current.income).toBe(4874.89);
    expect(snap.current.expenses).toBe(231.95);
    expectBooksAgree(snap, 115.25);
    // And as the identity: typed 6,718.37 - 908.55, plus income, less expenses.
    expect(cents(6718.37 - 908.55 + 4874.89 - 231.95)).toBe(cents(snap.current.balance));
  });

  it('puts the right rows on each card and account, and nothing counted twice', async () => {
    statement();

    const snap = await bookOn();

    expect(idsOf(snap.ledgers.checking)).toEqual([
      'charge-gym-oct',
      'charge-netflix-oct',
      'income-pay-1@2026-10-02',
      'income-pay-1@2026-10-16',
      'payment-add-400:out',
      'payment-visa-300:out',
      'receipt-deli',
    ]);
    expect(idsOf(snap.ledgers.savings)).toEqual(['payment-add-400', 'payment-new-75']);
    expect(idsOf(snap.ledgers.visa)).toEqual([
      'charge-internet-oct',
      'payment-visa-300',
      'receipt-whole-foods',
    ]);
    expect(idsOf(snap.ledgers.amex)).toEqual(['payment-amex-50', 'receipt-amex-10th']);

    expect(snap.ledgers.checking).toMatchObject({ charged: 757.06, paid: 4629.64 });
    expect(snap.ledgers.savings).toMatchObject({ charged: 0, paid: 475.25 });
    expect(snap.ledgers.visa).toMatchObject({ charged: 148.83, paid: 300 });
    expect(snap.ledgers.amex).toMatchObject({ charged: 21.31, paid: 50 });
  });

  it('names who each side of a payment was, or nobody for money from outside', async () => {
    statement();

    const snap = await bookOn();

    expect(entryOf(snap.ledgers.savings, 'payment-add-400')?.counterpart).toBe('Checking ••0042');
    expect(entryOf(snap.ledgers.checking, 'payment-add-400:out')?.counterpart).toBe(
      'Savings ••9911',
    );
    expect(entryOf(snap.ledgers.savings, 'payment-new-75')?.counterpart).toBeNull();
    expect(entryOf(snap.ledgers.amex, 'payment-amex-50')?.counterpart).toBeNull();
    expect(entryOf(snap.ledgers.visa, 'payment-visa-300')?.counterpart).toBe('Checking ••0042');
    expect(entryOf(snap.ledgers.checking, 'payment-visa-300:out')?.counterpart).toBe('Visa ••4421');
  });

  it('tells a card from an account, and has nothing for a source that does not exist', async () => {
    statement();

    const view = await renderHook(() => useEverything(TODAY), { wrapper: freshWrapper() });
    await waitFor(() => expect(view.result.current.current.isLoading).toBe(false));

    expect(view.result.current.visa.kind).toBe('card');
    expect(view.result.current.visa.card?.id).toBe('visa');
    expect(view.result.current.checking.kind).toBe('account');
    expect(view.result.current.checking.account?.id).toBe('checking');
    expect(view.result.current.stranger.source).toBeUndefined();
    expect(view.result.current.stranger.ledger).toBeNull();
  });

  it('is nothing at all for someone who has added nothing, and not NaN', async () => {
    const snap = await bookOn();

    expect(snap.balances).toEqual({});
    expect(snap.current).toEqual({ balance: 0, income: 0, expenses: 0 });
  });
});

/** Every read the balances stand on, as named in the mock. */
const PARTS: [string, string][] = [
  ['the receipts', 'receipts'],
  ['the subscriptions', 'subscriptions'],
  ['the bills', 'bills'],
  ['the salary', 'salary_sources'],
  ['the charges', 'charges'],
  ['the recorded pay', 'pay_received'],
  ['the cards', 'cards'],
  ['the bank accounts', 'bank_accounts'],
  ['the payments', 'payments'],
];

describe('when a read fails', () => {
  it('reports no error when every read succeeds', async () => {
    aWorkedMonth();
    const snap = await bookOn();
    expect(snap.isError).toBe(false);
  });

  it.each(PARTS)('every hook reports an error when %s cannot be read', async (_name, part) => {
    mockFailures.add(part);

    const view = await mount(TODAY);
    const all = view.result.current;

    expect(all.current.isError).toBe(true);
    expect(all.current.isLoading).toBe(false);
    expect(all.balances.isError).toBe(true);
    expect(all.checking.isError).toBe(true);
    expect(all.checking.isLoading).toBe(false);
  });

  it('does not fall back for a payments read that fails any other way', async () => {
    aWorkedMonth();
    mockFailures.add('payments');

    const snap = await bookOn();

    expect(snap.isError).toBe(true);
    // The first read is the only one: a missing column is the one failure that is read again.
    expect(mockReads.filter((part) => part === 'payments')).toHaveLength(1);
  });

  it('clears the error once the read answers on a retry, and the figures are whole again', async () => {
    aWorkedMonth();
    mockRows.payments = [payment('visa', 250, '2026-10-06', { card: 'visa' }, 'checking')];
    mockFailures.add('payments');
    const view = await mount(TODAY);
    expect(view.snapshot().isError).toBe(true);

    mockFailures.clear();
    await act(async () => view.result.current.current.refetch());

    await waitFor(() => expect(view.snapshot().isError).toBe(false));
    const snap = view.snapshot();
    expect(snap.balances).toEqual({ checking: 2720, visa: 0 });
    expect(snap.current).toEqual({ balance: 2700, income: 2000, expenses: 100 });
  });

  it.each([
    ['Home', (all: ReturnType<typeof useEverything>) => all.current.refetch],
    ['a card or account page', (all: ReturnType<typeof useEverything>) => all.checking.refetch],
    ['the Money tab', (all: ReturnType<typeof useEverything>) => all.balances.refetch],
  ])('offers %s a retry that reads every part again', async (_who, refetchOf) => {
    const view = await mount(TODAY);

    mockReads.length = 0;
    refetchOf(view.result.current)();

    await waitFor(() => expect(new Set(mockReads)).toEqual(new Set(PARTS.map(([, part]) => part))));
  });
});

describe('while a read is still out', () => {
  it.each(PARTS)(
    'Home and a source page are loading while %s are not yet in',
    async (_name, part) => {
      hold(part);
      const view = await renderHook(() => useEverything(TODAY), { wrapper: freshWrapper() });

      // Every other read lands first, so only this one can be what keeps it loading.
      await waitFor(() => expect(mockReads.length).toBeGreaterThanOrEqual(PARTS.length));
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 25));
      });
      expect(view.result.current.current.isLoading).toBe(true);
      expect(view.result.current.checking.isLoading).toBe(true);

      for (const release of mockReleases.splice(0)) release();
      await waitFor(() => expect(view.result.current.current.isLoading).toBe(false));
      expect(view.result.current.checking.isLoading).toBe(false);
    },
  );
});
