import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useCharges, type ChargeRow } from '@/api/charges';
import type { PayRow } from '@/api/pay';
import {
  planLedger,
  usePayments,
  usePlanMonth,
  type PaymentsData,
  type PlanReads,
} from '@/api/payment-ledger';
import {
  ledgerEntries,
  useBills,
  useLedger,
  useSubscriptions,
  type BillRow,
  type LedgerEntry,
  type LedgerPayoff,
  type ReceiptRow,
  type SubscriptionRow,
} from '@/api/queries';
import type { UseExportPayments } from '@/components/payments/export-choices';
import { hidOlder, historyFloor } from '@/lib/allowance';
import { addMonths, lastChargedBy, monthBounds, planMonth, type PlanKind } from '@/lib/bill-month';
import { occurrencesInRange, type Recurrence } from '@/lib/card-ledger';
import { ofKind, paymentEntries, type PaymentEntry } from '@/lib/payment-entries';
import { hidesOlder, paymentFloor } from '@/lib/payment-years';
import { publishProStatus, resetProStatusForTests, type ProStatus } from '@/lib/pro-status';

/**
 * The payment pages read the ledger's own bill and subscription entries, without walking receipts,
 * salaries or pay, and work them out once per change of the data for every page that asks. Proven
 * here against `useLedger` itself on one rich account: the same entries, the same payments, the
 * same month pages, the same free floor; a new walk for new data, a new day or another account,
 * and never one for a page that only opens.
 */

jest.mock('@/api/queries', () => {
  const actual = jest.requireActual('@/api/queries');
  // Counts the walks the payment hooks make; `useLedger` still calls its own copy, uncounted.
  return { ...actual, ledgerEntries: jest.fn(actual.ledgerEntries) };
});

type Rows = Record<string, unknown[]>;

const mockAccounts: Record<string, Rows> = {};
const mockReads: Record<string, number> = {};
const mockFailing = new Set<string>();
const mockHeld: (() => void)[] = [];
let mockHold: string | null = null;
let mockUserId: string | null = 'user-1';

jest.mock('@/lib/supabase', () => {
  const build = (table: string) => {
    const builder: Record<string, unknown> = {
      select: () => builder,
      order: () => builder,
      eq: () => builder,
      in: () => builder,
      maybeSingle: () => builder,
      then: (resolve: (value: unknown) => unknown) => {
        const user = mockUserId ?? '';
        const answer = () => {
          mockReads[table] = (mockReads[table] ?? 0) + 1;
          if (mockFailing.has(table)) {
            return resolve({ data: null, error: { code: '08006', message: 'offline' } });
          }
          // A fresh copy every time, as the network gives: only a read that changed is new data.
          const rows = mockAccounts[user]?.[table] ?? [];
          return resolve({ data: JSON.parse(JSON.stringify(rows)), error: null });
        };
        if (mockHold === table) mockHeld.push(answer);
        else answer();
      },
    };
    return builder;
  };
  return { supabase: { from: (table: string) => build(table) } };
});

jest.mock('@/providers/session-provider', () => ({ useUserId: () => mockUserId }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

const walks = jest.mocked(ledgerEntries);

const TODAY = '2026-10-12';
const VISA = 'card-visa-4421';
const DISCOVER = 'card-discover-6334';
const CHASE = 'acct-chase-7010';
const ALLY = 'acct-ally';

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
    created_at: '2019-06-01T12:00:00Z',
    brand_id: null,
    brands: null,
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
    created_at: '2019-06-01T12:00:00Z',
    category_id: 'entertainment',
    card_id: null,
    bank_account_id: null,
    note: null,
    active: true,
    brands: null,
    ...fields,
  };
}

/** Every date a schedule lands on from `from` to `to`, oldest first. */
function every(anchor: string, recurrence: Recurrence, from: string, to: string): string[] {
  return occurrencesInRange(anchor, recurrence, from, to).sort();
}

/** The first date a schedule lands on after today. */
function nextAfterToday(anchor: string, recurrence: Recurrence): string {
  return every(anchor, recurrence, '2026-10-13', '2027-12-31')[0];
}

function charged(
  plan: { bill?: string; subscription?: string },
  on: readonly string[],
  o: {
    label: (date: string) => string;
    amount: (date: string, index: number) => number;
    card?: string;
    account?: string;
  },
): ChargeRow[] {
  return on.map((date, index) => ({
    id: `${plan.bill ?? plan.subscription}-${date}`,
    bill_id: plan.bill ?? null,
    subscription_id: plan.subscription ?? null,
    label: o.label(date),
    amount: o.amount(date, index),
    charged_on: date,
    card_id: o.card ?? null,
    bank_account_id: o.account ?? null,
  }));
}

const named = (label: string) => () => label;
const flat = (amount: number) => () => amount;

const BILLS: BillRow[] = [
  // Recorded since before the payment window and the kept seven years.
  bill('power', {
    name: 'Electricity',
    amount: 118.42,
    category_id: 'energy',
    next_due_on: '2026-11-08',
    starts_on: '2019-06-08',
    bank_account_id: CHASE,
  }),
  bill('rent', {
    name: 'Rent',
    amount: 1290,
    category_id: 'housing',
    next_due_on: '2026-11-01',
    starts_on: '2021-03-01',
    bank_account_id: CHASE,
  }),
  bill('cleaner', {
    name: 'Cleaner',
    amount: 45,
    recurrence: 'weekly',
    next_due_on: nextAfterToday('2025-06-05', 'weekly'),
    starts_on: '2025-06-05',
    card_id: DISCOVER,
  }),
  // Never recorded: the ledger projects its past.
  bill('water', {
    name: 'Water',
    amount: 88.17,
    recurrence: 'quarterly',
    next_due_on: '2026-11-15',
    starts_on: '2026-02-15',
    created_at: '2026-02-15T09:00:00Z',
  }),
  bill('insurance', {
    name: 'Home insurance',
    amount: 940,
    recurrence: 'yearly',
    next_due_on: '2027-03-03',
    starts_on: '2020-03-03',
    bank_account_id: CHASE,
  }),
  // Stopped at the end of June 2025.
  bill('gym', {
    name: 'Gym',
    amount: 39.99,
    next_due_on: '2025-07-05',
    starts_on: '2023-01-05',
    ends_on: '2025-06-30',
  }),
  bill('car', {
    name: 'Car loan',
    amount: 554,
    category_id: 'loans',
    icon_id: 'loan-car',
    next_due_on: '2026-10-28',
    starts_on: '2024-04-28',
    ends_on: '2029-03-28',
    card_id: VISA,
  }),
  // Paid off in full: it runs no more, and lists only what it recorded.
  bill('bike', {
    name: 'Bike loan',
    amount: 120.5,
    category_id: 'loans',
    next_due_on: null,
    starts_on: '2024-01-20',
    ends_on: '2026-02-25',
    bank_account_id: CHASE,
  }),
  // "Add to monthly bills" off after August 2024.
  bill('boat', {
    name: 'Boat loan',
    amount: 410.25,
    category_id: 'loans',
    next_due_on: '2026-11-12',
    starts_on: '2023-05-12',
    in_spending: false,
  }),
  // Due today, not swept yet; on a free account's locked second card.
  bill('phone', {
    name: 'Phone',
    amount: 70,
    category_id: 'mobile',
    next_due_on: TODAY,
    starts_on: '2022-06-12',
    card_id: DISCOVER,
  }),
  // Charged as "Fios" until it was renamed.
  bill('internet', {
    name: 'Internet',
    amount: 84.99,
    category_id: 'internet',
    next_due_on: '2026-10-18',
    starts_on: '2023-01-18',
    bank_account_id: CHASE,
  }),
  bill('parking', {
    name: 'Parking',
    amount: 30,
    next_due_on: '2026-10-15',
    starts_on: '2026-08-15',
    created_at: '2026-08-15T09:00:00Z',
  }),
  // Its card was deleted since.
  bill('storage', {
    name: 'Storage',
    amount: 25,
    next_due_on: '2026-10-20',
    starts_on: '2026-05-20',
    card_id: 'card-gone',
  }),
];

const SUBSCRIPTIONS: SubscriptionRow[] = [
  subscription('netflix', {
    name: 'Netflix',
    amount: 15.99,
    next_renewal_on: '2026-11-09',
    started_on: '2020-01-09',
  }),
  subscription('hulu', {
    name: 'Hulu',
    amount: 7.99,
    next_renewal_on: '2024-07-14',
    started_on: '2022-01-14',
    card_id: VISA,
    active: false,
  }),
  subscription('prime', {
    name: 'Amazon Prime',
    amount: 139,
    cycle: 'yearly',
    next_renewal_on: '2026-11-07',
    started_on: '2020-11-07',
    bank_account_id: ALLY,
  }),
  subscription('paper', {
    name: 'Newspaper',
    amount: 4.5,
    cycle: 'weekly',
    next_renewal_on: nextAfterToday('2026-01-04', 'weekly'),
    started_on: '2026-01-04',
    card_id: DISCOVER,
  }),
  subscription('trial', { name: 'Trial', amount: 4.99, active: false }),
  subscription('later', {
    name: 'Later',
    amount: 9.99,
    next_renewal_on: '2026-12-01',
    started_on: '2026-12-01',
    created_at: '2026-10-01T09:00:00Z',
  }),
];

const CHARGES: ChargeRow[] = [
  ...charged({ bill: 'power' }, every('2019-06-08', 'monthly', '2019-06-08', TODAY), {
    label: named('Electricity'),
    // A different bill every month: $90.00 to $149.99.
    amount: (_, index) => (9000 + ((index * 1737) % 6000)) / 100,
    account: CHASE,
  }),
  ...charged({ bill: 'rent' }, every('2021-03-01', 'monthly', '2021-03-01', TODAY), {
    label: named('Rent'),
    amount: (date) => (date < '2025-01-01' ? 1200 : 1290),
    account: CHASE,
  }),
  ...charged({ bill: 'cleaner' }, every('2025-06-05', 'weekly', '2025-06-05', TODAY), {
    label: named('Cleaner'),
    amount: flat(45),
    card: DISCOVER,
  }),
  ...charged({ bill: 'insurance' }, every('2020-03-03', 'yearly', '2020-03-03', TODAY), {
    label: named('Home insurance'),
    amount: (date) => (date < '2024-01-01' ? 905.5 : 940),
    account: CHASE,
  }),
  ...charged({ bill: 'gym' }, every('2023-01-05', 'monthly', '2023-01-05', '2025-06-30'), {
    label: named('Gym'),
    amount: flat(39.99),
  }),
  ...charged({ bill: 'car' }, every('2024-04-28', 'monthly', '2024-04-28', TODAY), {
    label: named('Car loan'),
    amount: flat(554),
    card: VISA,
  }),
  ...charged({ bill: 'bike' }, every('2024-01-20', 'monthly', '2024-01-20', '2026-02-25'), {
    label: named('Bike loan'),
    amount: flat(120.5),
    account: CHASE,
  }),
  ...charged({ bill: 'boat' }, every('2023-05-12', 'monthly', '2023-05-12', '2024-08-31'), {
    label: named('Boat loan'),
    amount: flat(410.25),
  }),
  ...charged({ bill: 'phone' }, every('2022-06-12', 'monthly', '2022-06-12', '2026-09-30'), {
    label: named('Phone'),
    amount: (date) => (date < '2025-04-01' ? 65 : 70),
    card: DISCOVER,
  }),
  ...charged({ bill: 'internet' }, every('2023-01-18', 'monthly', '2023-01-18', TODAY), {
    label: (date) => (date < '2025-01-01' ? 'Fios' : 'Internet'),
    amount: (date) => (date < '2025-01-01' ? 79.99 : 84.99),
    account: CHASE,
  }),
  ...charged({ bill: 'storage' }, every('2026-05-20', 'monthly', '2026-05-20', TODAY), {
    label: named('Storage'),
    amount: flat(25),
    card: 'card-gone',
  }),
  ...charged({ subscription: 'netflix' }, every('2020-01-09', 'monthly', '2020-01-09', TODAY), {
    label: named('Netflix'),
    amount: (date) => (date < '2024-01-01' ? 12.99 : date < '2025-01-01' ? 15.49 : 15.99),
  }),
  ...charged({ subscription: 'hulu' }, every('2022-01-14', 'monthly', '2022-01-14', '2024-06-14'), {
    label: named('Hulu'),
    amount: flat(7.99),
    card: VISA,
  }),
  ...charged({ subscription: 'prime' }, every('2020-11-07', 'yearly', '2020-11-07', TODAY), {
    label: named('Amazon Prime'),
    amount: flat(139),
    account: ALLY,
  }),
  ...charged({ subscription: 'paper' }, every('2026-01-04', 'weekly', '2026-01-04', TODAY), {
    label: named('Newspaper'),
    amount: flat(4.5),
    card: DISCOVER,
  }),
];

const PAYOFFS: LedgerPayoff[] = [
  {
    id: 'car-extra',
    bill_id: 'car',
    paid_on: '2025-09-10',
    amount: 1000,
    kind: 'partial',
    card_id: null,
    bank_account_id: CHASE,
    counted: true,
  },
  {
    id: 'bike-all',
    bill_id: 'bike',
    paid_on: '2026-02-25',
    amount: 1543.21,
    kind: 'full',
    card_id: null,
    bank_account_id: CHASE,
    counted: true,
  },
  {
    id: 'boat-extra',
    bill_id: 'boat',
    paid_on: '2024-03-03',
    amount: 500,
    kind: 'partial',
    card_id: null,
    bank_account_id: CHASE,
    counted: true,
  },
  // Made after the boat loan was kept out of bills: it counts nowhere.
  {
    id: 'boat-late',
    bill_id: 'boat',
    paid_on: '2025-01-15',
    amount: 700,
    kind: 'partial',
    card_id: null,
    bank_account_id: CHASE,
    counted: false,
  },
];

function receipt(id: string, purchased_on: string, amount: number): ReceiptRow {
  return {
    id,
    brand_id: null,
    merchant: `Shop ${id}`,
    amount,
    purchased_on,
    category_id: 'groceries',
    card_id: VISA,
    bank_account_id: null,
    note: null,
    source: 'manual',
    image_path: null,
    created_at: `${purchased_on}T12:00:00Z`,
    brands: null,
  };
}

const RECEIPTS: ReceiptRow[] = [
  receipt('r1', '2021-04-02', 64.1),
  receipt('r2', '2025-12-24', 212.35),
  receipt('r3', '2026-08-01', 18.4),
  receipt('r4', TODAY, 7.25),
];

const SALARY = {
  id: 'job',
  name: 'Job',
  amount: 2100.55,
  frequency: 'biweekly' as const,
  last_payday: '2026-10-09',
  account_ids: [CHASE],
};

const PAY: PayRow[] = ['2026-09-11', '2026-09-25', '2026-10-09'].map((paid_on) => ({
  id: `pay-${paid_on}`,
  salary_source_id: 'job',
  label: 'Job',
  amount: 2100.55,
  paid_on,
  bank_account_id: CHASE,
}));

const CARDS = [
  { id: VISA, holder: 'Sam', network: 'Visa', last4: '4421', color: '#111111', balance: 0 },
  { id: DISCOVER, holder: '', network: 'Discover', last4: '6334', color: '#222222', balance: 0 },
];

const ACCOUNTS = [
  {
    id: CHASE,
    bank_name: 'Chase',
    nickname: 'Komal',
    account_type: 'checking',
    last4: '7010',
    color: '#333333',
    balance: 0,
  },
  {
    id: ALLY,
    bank_name: 'Ally',
    nickname: null,
    account_type: 'savings',
    last4: null,
    color: '#444444',
    balance: 0,
  },
];

/** The account as the database holds it, table by table. */
function richAccount(): Rows {
  return {
    cards: CARDS,
    bank_accounts: ACCOUNTS,
    bills: BILLS,
    subscriptions: SUBSCRIPTIONS,
    charges: CHARGES,
    loan_payoffs: PAYOFFS.map((payoff) => ({
      ...payoff,
      created_at: `${payoff.paid_on}T12:00:00Z`,
      card: null,
      account: null,
    })),
    receipts: RECEIPTS,
    salary_sources: [
      {
        id: SALARY.id,
        name: SALARY.name,
        amount: SALARY.amount,
        frequency: SALARY.frequency,
        last_payday: SALARY.last_payday,
        salary_source_accounts: SALARY.account_ids.map((id) => ({ bank_account_id: id })),
      },
    ],
    pay_received: PAY,
  };
}

/** Another person: one bill, one subscription, nothing shared. */
function otherAccount(): Rows {
  return {
    cards: [],
    bank_accounts: [],
    bills: [
      bill('their-rent', {
        name: 'Their rent',
        amount: 800,
        next_due_on: '2026-11-03',
        starts_on: '2026-06-03',
      }),
    ],
    subscriptions: [
      subscription('their-music', {
        name: 'Their music',
        amount: 10.99,
        next_renewal_on: '2026-10-20',
        started_on: '2026-07-20',
      }),
    ],
    charges: [
      ...charged({ bill: 'their-rent' }, every('2026-06-03', 'monthly', '2026-06-03', TODAY), {
        label: named('Their rent'),
        amount: flat(800),
      }),
    ],
    loan_payoffs: [],
  };
}

const READS: PlanReads = {
  bills: BILLS,
  subscriptions: SUBSCRIPTIONS,
  charges: CHARGES,
  payoffs: PAYOFFS,
};

const KEPT = historyFloor(true, new Date(`${TODAY}T00:00:00`));
const PAYMENT_WINDOW = { from: paymentFloor(TODAY), to: TODAY };
const isPlan = (entry: LedgerEntry) => entry.kind === 'bill' || entry.kind === 'subscription';
const ids = (rows: readonly { id: string }[]) => rows.map((row) => row.id);
const paymentWalks = () =>
  walks.mock.calls.filter(([input]) => input.from === PAYMENT_WINDOW.from && input.to === TODAY)
    .length;

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  resetProStatusForTests();
  for (const key of Object.keys(mockAccounts)) delete mockAccounts[key];
  for (const key of Object.keys(mockReads)) delete mockReads[key];
  mockAccounts['user-1'] = richAccount();
  mockAccounts['user-2'] = otherAccount();
  mockFailing.clear();
  mockHeld.length = 0;
  mockHold = null;
  mockUserId = 'user-1';
  walks.mockClear();
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});

afterEach(() => {
  client.clear();
});

const loaded = (data: { isLoading: boolean }) => expect(data.isLoading).toBe(false);

describe('the payments-only ledger', () => {
  const windows: [string, { from: string; to: string }][] = [
    ['the payment window', PAYMENT_WINDOW],
    ['the whole kept window', { from: KEPT, to: '2027-12-31' }],
    ['a month across the kept floor', monthBounds('2019-10')],
    ['a month with a counted payoff', monthBounds('2024-03')],
    ['the month a plan stopped', monthBounds('2025-06')],
    ['the month a loan was paid off', monthBounds('2026-02')],
    ['this month', monthBounds('2026-10')],
    ['a month ahead', monthBounds('2027-03')],
  ];

  it.each(windows)(
    'has exactly the full ledger’s bill and subscription entries: %s',
    (_, range) => {
      const full = ledgerEntries({
        ...READS,
        receipts: RECEIPTS,
        salaries: [SALARY],
        pay: PAY,
        accountOrder: [CHASE, ALLY],
        // `useLedger`'s window: never before the seven years kept.
        from: range.from > KEPT ? range.from : KEPT,
        to: range.to,
        today: TODAY,
      });

      expect(planLedger(READS, range, TODAY)).toEqual(full.filter(isPlan));
    },
  );

  it('walks no receipts, salaries or pay, and still has every kind of plan entry', () => {
    const full = ledgerEntries({
      ...READS,
      receipts: RECEIPTS,
      salaries: [SALARY],
      pay: PAY,
      accountOrder: [CHASE, ALLY],
      ...PAYMENT_WINDOW,
      today: TODAY,
    });
    const plans = planLedger(READS, PAYMENT_WINDOW, TODAY);

    // The comparison above is not empty-handed: the full ledger has receipts and pay to leave out.
    expect(full.some((entry) => entry.kind === 'receipt')).toBe(true);
    expect(full.some((entry) => entry.kind === 'income')).toBe(true);
    expect(plans.every(isPlan)).toBe(true);

    const found = ids(plans);
    expect(found).toEqual(
      expect.arrayContaining([
        'payoff-car-extra',
        'payoff-bike-all',
        'payoff-boat-extra',
        'charge-hulu-2024-06-14',
        'charge-bike-2026-02-20',
        'charge-gym-2025-06-05',
        'bill-water@2026-02-15',
        'bill-parking@2026-09-15',
        'charge-storage-2026-09-20',
      ]),
    );
    expect(found).not.toContain('payoff-boat-late');
    expect(found.some((id) => id.startsWith('bill-boat@'))).toBe(false);
  });
});

describe('usePayments', () => {
  function useBeside(today: string) {
    return {
      mine: usePayments(today),
      ledger: useLedger({ from: paymentFloor(today), to: today }, today),
      bills: useBills().data,
      subscriptions: useSubscriptions().data,
    };
  }

  async function renderBeside() {
    const view = await renderHook(() => useBeside(TODAY), { wrapper });
    await waitFor(() => {
      loaded(view.result.current.mine);
      loaded(view.result.current.ledger);
      expect(view.result.current.mine.payments.length).toBeGreaterThan(0);
    });
    return view.result.current;
  }

  it('gives the payments `useLedger` gives, to the cent', async () => {
    const { mine, ledger, bills, subscriptions } = await renderBeside();

    expect(mine.payments).toEqual(
      paymentEntries(ledger.allEntries, { bills: bills!, subscriptions: subscriptions! }, TODAY),
    );
    expect(mine.payments.every((payment) => payment.date >= '2020-01-01')).toBe(true);
    expect(mine.payments.every((payment) => payment.date <= TODAY)).toBe(true);
    expect(mine.payments.find((p) => p.id === 'payoff-bike-all')).toMatchObject({
      amount: 1543.21,
      status: 'paidOff',
    });
    expect(mine.payments.find((p) => p.id === 'charge-internet-2024-12-18')).toMatchObject({
      name: 'Fios',
      planName: 'Internet',
      amount: 79.99,
    });
    expect(mine.isError).toBe(false);
  });

  it('never reads receipts, salaries or pay', async () => {
    const view = await renderHook(() => usePayments(TODAY), { wrapper });
    await waitFor(() => expect(view.result.current.payments.length).toBeGreaterThan(0));

    expect(mockReads.receipts ?? 0).toBe(0);
    expect(mockReads.salary_sources ?? 0).toBe(0);
    expect(mockReads.pay_received ?? 0).toBe(0);
  });

  const plans: [string, ProStatus | null, string, boolean][] = [
    ['free', { pro: false, ready: true }, '2026-07-15', true],
    ['Pro', { pro: true, ready: true }, '2020-01-01', false],
    ['not known yet', null, '2020-01-01', false],
  ];

  it.each(plans)('lists from `useLedger`’s own floor: %s', async (_, status, floor, free) => {
    if (status) publishProStatus(status);
    const { mine, ledger } = await renderBeside();

    expect(mine.listFloor).toBe(floor);
    expect(mine.free).toBe(free);
    // The rows a page lists are the rows `useLedger` lists.
    expect(ids(mine.payments.filter((p) => p.date >= mine.listFloor))).toEqual(
      ids(paymentEntries(ledger.entries.filter(isPlan), { bills: [], subscriptions: [] }, TODAY)),
    );
    // And the history notice shows when `useLedger` says it hid something.
    for (const kind of ['bill', 'subscription'] as const) {
      expect(hidesOlder(ofKind(mine.payments, kind), mine.listFloor)).toBe(
        hidOlder(ledger.hidden, kind),
      );
      expect(hidesOlder(ofKind(mine.payments, kind), mine.listFloor)).toBe(free);
    }
  });

  it('moves only the list floor when the answer is free: figures stay whole, nothing walks', async () => {
    publishProStatus({ pro: true, ready: true });
    const view = await renderHook(() => usePayments(TODAY), { wrapper });
    await waitFor(() => expect(view.result.current.payments.length).toBeGreaterThan(0));
    const pro = view.result.current;
    walks.mockClear();

    await act(async () => {
      publishProStatus({ pro: false, ready: true });
    });
    const free = view.result.current;

    expect(pro.listFloor).toBe('2020-01-01');
    expect(free.listFloor).toBe('2026-07-15');
    expect(free.payments).toBe(pro.payments);
    expect(free.payments.some((p) => p.date < free.listFloor)).toBe(true);
    expect(walks).not.toHaveBeenCalled();
  });

  it('labels from every card and account, and leaves a deleted card unnamed', async () => {
    publishProStatus({ pro: false, ready: true });
    const { mine } = await renderBeside();
    const phone = mine.payments.find((p) => p.id === 'charge-phone-2026-09-12')!;
    const prime = mine.payments.find((p) => p.id === 'charge-prime-2025-11-07')!;
    const storage = mine.payments.find((p) => p.id === 'charge-storage-2026-09-20')!;

    expect(mine.labelOf(phone.sourceId)).toBe('Discover ••6334');
    expect(mine.labelOf(prime.sourceId)).toBe('Ally');
    expect(mine.labelOf(storage.sourceId)).toBeNull();
    expect(ids(mine.sources)).toEqual([VISA, DISCOVER, CHASE, ALLY]);
  });

  it('is shared, so no page can reorder it under another', async () => {
    const view = await renderHook(() => usePayments(TODAY), { wrapper });
    await waitFor(() => expect(view.result.current.payments.length).toBeGreaterThan(0));
    const { payments } = view.result.current;

    expect(Object.isFrozen(payments)).toBe(true);
    expect(() => (payments as PaymentEntry[]).sort()).toThrow(TypeError);
  });
});

describe('usePlanMonth', () => {
  function useBeside(kind: PlanKind, month: string) {
    return {
      mine: usePlanMonth(kind, month, TODAY),
      ledger: useLedger(monthBounds(month), TODAY),
      bills: useBills().data,
      subscriptions: useSubscriptions().data,
      charges: useCharges().data,
    };
  }

  const months = ['2019-10', '2020-01', '2024-03', '2025-06', '2026-02', '2026-09', '2026-10'];
  const cases = [...months, '2026-11', '2027-03'].flatMap((month) =>
    (['bill', 'subscription'] as const).map((kind): [PlanKind, string] => [kind, month]),
  );

  it.each(cases)('is planMonth on `useLedger`’s month: %s %s', async (kind, month) => {
    const view = await renderHook(() => useBeside(kind, month), { wrapper });
    await waitFor(() => {
      loaded(view.result.current.mine);
      loaded(view.result.current.ledger);
      expect(view.result.current.charges).toBeDefined();
    });
    const { mine, ledger, bills, subscriptions, charges } = view.result.current;

    expect(mine.view).toEqual(
      planMonth({
        kind,
        month,
        today: TODAY,
        entries: ledger.allEntries,
        bills: bills!,
        subscriptions: subscriptions!,
        lastCharged: lastChargedBy(charges!),
      }),
    );
    expect(mine.hasPlans).toBe(true);
    expect(mine.isError).toBe(false);
  });

  it('draws this month’s bills: paid, coming up, the loan kept out, the stopped', async () => {
    const view = await renderHook(() => usePlanMonth('bill', '2026-10', TODAY), { wrapper });
    await waitFor(() => expect(view.result.current.view.planCount).toBeGreaterThan(0));
    const { view: month } = view.result.current;

    // Electricity 118.56 + Rent 1,290 + Cleaner 5 × 45 + Car loan 554 + Phone 70 (due today, owed
    // before the sweep) + Internet 84.99 + Parking 30 + Storage 25.
    expect(month.total).toBe(2397.55);
    expect([month.planCount, month.paidCount, month.comingCount]).toEqual([8, 3, 5]);
    expect(month.next).toMatchObject({ planId: 'cleaner', date: '2026-10-15' });
    expect(month.comingUp.map((occurrence) => occurrence.planId)).toEqual([
      'cleaner',
      'parking',
      'internet',
      'storage',
      'cleaner',
      'car',
      'cleaner',
    ]);
    expect(month.rows.map((row) => row.planId)).toEqual([
      'cleaner',
      'rent',
      'power',
      'phone',
      'parking',
      'internet',
      'storage',
      'car',
      'water',
      'insurance',
    ]);
    expect(month.rows.find((row) => row.planId === 'phone')?.occurrences).toEqual([
      expect.objectContaining({ id: 'bill-phone@2026-10-12', amount: 70, paid: true }),
    ]);
    // Neither the loan kept out of bills nor a payoff is ever due.
    expect(month.stopped.map((row) => row.planId)).toEqual(['bike', 'gym']);
    expect(Object.isFrozen(month)).toBe(true);
    expect(Object.isFrozen(month.rows)).toBe(true);
  });

  it('fits the month page’s and the export page’s reads', async () => {
    // The month page imports the hook itself; the export page still takes it as a prop.
    const exportPage: UseExportPayments = usePayments;
    expect(exportPage).toBe(usePayments);
    const view = await renderHook(() => usePlanMonth('subscription', '2026-10', TODAY), {
      wrapper,
    });
    await waitFor(() => loaded(view.result.current));

    expect(Object.keys(view.result.current).sort()).toEqual([
      'hasPlans',
      'isError',
      'isLoading',
      'labelOf',
      'refetch',
      'view',
    ]);
  });

  it('says there are no plans only when there are none to draw', async () => {
    mockAccounts['user-1'] = {
      ...richAccount(),
      // Only a loan kept out of bills, and a cancelled subscription that never charged.
      bills: [BILLS.find((row) => row.id === 'boat')],
      subscriptions: [SUBSCRIPTIONS.find((row) => row.id === 'trial')],
      charges: CHARGES.filter((row) => row.bill_id === 'boat'),
    };
    const october = await renderHook(
      () => ({
        bills: usePlanMonth('bill', '2026-10', TODAY),
        subscriptions: usePlanMonth('subscription', '2026-10', TODAY),
        // A month the loan was still a bill in, and charged.
        june: usePlanMonth('bill', '2024-06', TODAY),
      }),
      { wrapper },
    );
    await waitFor(() => {
      loaded(october.result.current.bills);
      expect(october.result.current.june.view.planCount).toBe(1);
    });

    expect(october.result.current.bills.hasPlans).toBe(false);
    expect(october.result.current.subscriptions.hasPlans).toBe(true);
    expect(october.result.current.june.hasPlans).toBe(true);
    expect(october.result.current.subscriptions.view.stopped.map((row) => row.planId)).toEqual([
      'trial',
    ]);
  });

  // What a route can hand over: empty, a typo, a day, a month out of range, missing, repeated.
  const malformed: [string, unknown][] = [
    ['empty', ''],
    ['a word', 'october'],
    ['month 13', '2026-13'],
    ['month 0', '2026-00'],
    ['one digit', '2026-9'],
    ['a whole day', '2026-09-12'],
    ['missing', undefined],
    ['repeated', ['2026-09']],
  ];

  it.each(malformed)('shows this month for a month that is not one: %s', async (_, asked) => {
    const view = await renderHook(
      () => ({
        asked: usePlanMonth('bill', asked as string, TODAY),
        october: usePlanMonth('bill', '2026-10', TODAY),
      }),
      { wrapper },
    );
    await waitFor(() => expect(view.result.current.october.view.planCount).toBeGreaterThan(0));

    expect(view.result.current.asked.view.month).toBe('2026-10');
    expect(view.result.current.asked.view).toBe(view.result.current.october.view);
    expect(view.result.current.asked.isError).toBe(false);
  });

  it('has no plans on an empty account', async () => {
    mockAccounts['user-1'] = {};
    const view = await renderHook(() => usePlanMonth('bill', '2026-10', TODAY), { wrapper });
    await waitFor(() => loaded(view.result.current));

    expect(view.result.current.hasPlans).toBe(false);
    expect(view.result.current.view.total).toBe(0);
  });
});

describe('one walk for every page', () => {
  async function openPage(today = TODAY) {
    const page = await renderHook(({ day }: { day: string }) => usePayments(day), {
      wrapper,
      initialProps: { day: today },
    });
    await waitFor(() => {
      loaded(page.result.current);
      expect(page.result.current.payments.length).toBeGreaterThan(0);
    });
    return page;
  }

  it('walks seven years once for history, choose year, all years and search', async () => {
    const history = await openPage();
    walks.mockClear();

    const others = [await openPage(), await openPage(), await openPage()];
    // Each newly opened page refetches; unchanged data keeps its identity, so nothing is walked.
    await waitFor(() => expect(mockReads.charges).toBeGreaterThanOrEqual(4));

    expect(walks).not.toHaveBeenCalled();
    for (const page of others) {
      expect(page.result.current.payments).toBe(history.result.current.payments);
    }
  });

  it('walks again once when the data changes, and every page sees the new payment', async () => {
    const pages = [await openPage(), await openPage(), await openPage(), await openPage()];
    const before = pages[0].result.current.payments;
    expect(ids(before)).not.toContain('charge-phone-2026-10-12');
    walks.mockClear();

    // The sweep records the phone's due today.
    mockAccounts['user-1'].charges = [
      ...CHARGES,
      ...charged({ bill: 'phone' }, [TODAY], { label: named('Phone'), amount: flat(70.01) }),
    ];
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['charges'] });
    });
    await waitFor(() =>
      expect(ids(pages[0].result.current.payments)).toContain('charge-phone-2026-10-12'),
    );

    expect(paymentWalks()).toBe(1);
    for (const page of pages) {
      expect(page.result.current.payments).toBe(pages[0].result.current.payments);
      expect(page.result.current.payments).not.toBe(before);
      expect(page.result.current.payments[0]).toMatchObject({ date: TODAY, amount: 70.01 });
    }
  });

  it('walks again once when a payoff is recorded', async () => {
    const pages = [await openPage(), await openPage()];
    walks.mockClear();

    mockAccounts['user-1'].loan_payoffs = [
      ...(mockAccounts['user-1'].loan_payoffs as object[]),
      {
        id: 'car-more',
        bill_id: 'car',
        paid_on: '2026-10-10',
        amount: 250.75,
        kind: 'partial',
        card_id: VISA,
        bank_account_id: null,
        counted: true,
        created_at: '2026-10-10T12:00:00Z',
        card: null,
        account: null,
      },
    ];
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['loans'] });
    });
    await waitFor(() => expect(ids(pages[0].result.current.payments)).toContain('payoff-car-more'));

    expect(paymentWalks()).toBe(1);
    expect(pages[1].result.current.payments).toBe(pages[0].result.current.payments);
    expect(pages[1].result.current.payments.find((p) => p.id === 'payoff-car-more')).toMatchObject({
      amount: 250.75,
      status: 'extraPayment',
      sourceId: VISA,
    });
  });

  it('does not walk again when a refetch brings the same data', async () => {
    const page = await openPage();
    const before = page.result.current.payments;
    walks.mockClear();

    await act(async () => {
      await client.invalidateQueries();
    });
    await waitFor(() => expect(mockReads.cards).toBeGreaterThanOrEqual(2));

    expect(walks).not.toHaveBeenCalled();
    expect(page.result.current.payments).toBe(before);
  });

  it('walks again on the next day of the same year', async () => {
    const page = await openPage();
    const before = page.result.current.payments;
    walks.mockClear();

    // Parking was never recorded, so its 15 October is a payment once that day has come.
    await page.rerender({ day: '2026-10-16' });

    expect(walks).toHaveBeenCalledTimes(1);
    expect(walks.mock.calls[0][0]).toMatchObject({ from: '2020-01-01', today: '2026-10-16' });
    expect(ids(before)).not.toContain('bill-parking@2026-10-15');
    expect(ids(page.result.current.payments)).toContain('bill-parking@2026-10-15');
  });

  it('walks the new window on a new year', async () => {
    const page = await openPage();
    walks.mockClear();

    // New Year: 2020 drops off, and a never-recorded plan's past runs to the new day.
    await page.rerender({ day: '2027-01-02' });

    expect(walks).toHaveBeenCalledTimes(1);
    expect(walks.mock.calls[0][0]).toMatchObject({
      from: '2021-01-01',
      to: '2027-01-02',
      today: '2027-01-02',
    });
    const { payments } = page.result.current;
    expect(payments.every((payment) => payment.date >= '2021-01-01')).toBe(true);
    expect(ids(payments)).toContain('bill-parking@2026-12-15');
  });

  it('keeps a bounded number of answers for one set of data', async () => {
    const page = await renderHook(
      ({ month }: { month: string }) => usePlanMonth('bill', month, TODAY),
      {
        wrapper,
        initialProps: { month: '2026-10' },
      },
    );
    await waitFor(() => expect(page.result.current.view.planCount).toBeGreaterThan(0));
    const october = page.result.current.view;

    // Sixteen answers are kept: October and fifteen months before it.
    for (let back = 1; back <= 15; back += 1)
      await page.rerender({ month: addMonths('2026-10', -back) });
    walks.mockClear();
    await page.rerender({ month: '2026-10' });
    expect(walks).not.toHaveBeenCalled();
    expect(page.result.current.view).toBe(october);

    // A seventeenth lets the oldest go: October is worked out again, the same.
    await page.rerender({ month: '2025-06' });
    await page.rerender({ month: '2026-10' });
    expect(walks).toHaveBeenCalledTimes(2);
    expect(page.result.current.view).not.toBe(october);
    expect(page.result.current.view).toEqual(october);
  });

  it('works out a month once for every page showing it', async () => {
    const first = await renderHook(() => usePlanMonth('bill', '2026-10', TODAY), { wrapper });
    await waitFor(() => expect(first.result.current.view.planCount).toBeGreaterThan(0));
    walks.mockClear();

    const second = await renderHook(() => usePlanMonth('bill', '2026-10', TODAY), { wrapper });
    const otherMonth = await renderHook(() => usePlanMonth('bill', '2026-09', TODAY), {
      wrapper,
    });
    await waitFor(() => expect(otherMonth.result.current.view.planCount).toBeGreaterThan(0));

    expect(second.result.current.view).toBe(first.result.current.view);
    expect(walks).toHaveBeenCalledTimes(1);
    expect(walks.mock.calls[0][0]).toMatchObject(monthBounds('2026-09'));
  });
});

describe('accounts', () => {
  it('never shows one account’s payments to another', async () => {
    const seen: { user: string | null; data: PaymentsData }[] = [];
    const page = await renderHook(
      () => {
        const data = usePayments(TODAY);
        seen.push({ user: mockUserId, data });
        return data;
      },
      { wrapper },
    );
    await waitFor(() => expect(page.result.current.payments.length).toBeGreaterThan(0));
    const mine = new Set(ids(page.result.current.payments));

    mockUserId = 'user-2';
    const switched = seen.length;
    await page.rerender({});
    await waitFor(() =>
      expect(ids(page.result.current.payments)).toContain('charge-their-rent-2026-10-03'),
    );

    for (const render of seen.slice(switched)) {
      expect(render.data.payments.filter((payment) => mine.has(payment.id))).toEqual([]);
    }
    expect(page.result.current.payments.every((p) => p.planId?.startsWith('their-'))).toBe(true);

    mockUserId = 'user-1';
    await page.rerender({});
    await waitFor(() => expect(ids(page.result.current.payments)).toContain('payoff-bike-all'));
  });

  it('works another account out afresh even on the very same data', async () => {
    // Kept, so the second account's seeded cache is still there when its page reads it.
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    const page = await renderHook(() => usePayments(TODAY), { wrapper });
    await waitFor(() => expect(page.result.current.payments.length).toBeGreaterThan(0));
    const first = page.result.current.payments;

    // The second account's cache holds the first one's very objects.
    const keys = [
      ['bills'],
      ['subscriptions'],
      ['charges'],
      ['cards'],
      ['bank_accounts'],
      ['loans', 'payoffs'],
    ].map(
      ([table, part]) =>
        (user: string) =>
          part ? [table, user, part] : [table, user],
    );
    for (const key of keys) client.setQueryData(key('user-2'), client.getQueryData(key('user-1')));
    mockAccounts['user-2'] = richAccount();
    walks.mockClear();

    mockUserId = 'user-2';
    await page.rerender({});
    await waitFor(() => expect(mockReads.charges).toBe(2));

    for (const key of keys) {
      expect(client.getQueryData(key('user-2'))).toBe(client.getQueryData(key('user-1')));
    }
    expect(paymentWalks()).toBe(1);
    expect(page.result.current.payments).toEqual(first);
    expect(page.result.current.payments).not.toBe(first);
  });
});

describe('loading, failure and Try again', () => {
  const tables = ['bills', 'subscriptions', 'charges', 'loan_payoffs', 'cards', 'bank_accounts'];

  it.each(tables)('fails both reads when %s fails', async (table) => {
    mockFailing.add(table);
    const view = await renderHook(
      () => ({ payments: usePayments(TODAY), month: usePlanMonth('bill', '2026-10', TODAY) }),
      { wrapper },
    );
    await waitFor(() => {
      expect(view.result.current.payments.isError).toBe(true);
      expect(view.result.current.month.isError).toBe(true);
    });
  });

  it('works nothing out from part of the data', async () => {
    mockFailing.add('charges');
    const view = await renderHook(() => usePayments(TODAY), { wrapper });
    await waitFor(() => expect(view.result.current.isError).toBe(true));

    // Without the charges, every bill would read as projected: nothing is shown instead.
    expect(view.result.current.payments).toEqual([]);
    expect(paymentWalks()).toBeLessThanOrEqual(1);
  });

  it('holds while a label read is still out', async () => {
    mockHold = 'cards';
    const view = await renderHook(
      () => ({ payments: usePayments(TODAY), month: usePlanMonth('bill', '2026-10', TODAY) }),
      { wrapper },
    );
    // Every plan read is in; only the card names are still out.
    await waitFor(() => {
      expect(mockHeld.length).toBeGreaterThan(0);
      expect(view.result.current.payments.payments.length).toBeGreaterThan(0);
    });

    expect(view.result.current.payments.isLoading).toBe(true);
    expect(view.result.current.month.isLoading).toBe(true);

    await act(async () => {
      for (const answer of mockHeld.splice(0)) answer();
    });
    await waitFor(() => {
      expect(view.result.current.payments.isLoading).toBe(false);
      expect(view.result.current.month.isLoading).toBe(false);
    });
    expect(view.result.current.payments.labelOf(VISA)).toBe('Visa ••4421');
  });

  it('reads every one of its reads again on Try again', async () => {
    mockFailing.add('cards');
    const view = await renderHook(() => usePayments(TODAY), { wrapper });
    await waitFor(() => expect(view.result.current.isError).toBe(true));
    for (const key of Object.keys(mockReads)) delete mockReads[key];
    mockFailing.clear();

    await act(async () => {
      view.result.current.refetch();
    });
    await waitFor(() => expect(view.result.current.isError).toBe(false));

    for (const table of tables) expect(mockReads[table]).toBe(1);
    expect(mockReads.receipts ?? 0).toBe(0);
  });
});
