import type { ChargeRow } from '@/api/charges';
import type { PayRow } from '@/api/pay';
import {
  bookFlows,
  ledgerEntries,
  type BillRow,
  type LedgerEntry,
  type LedgerInput,
  type LedgerPayoff,
  type ReceiptRow,
  type SubscriptionRow,
} from '@/api/queries';
import { historyFloor } from '@/lib/allowance';
import { chargeOwners, ledgerHref } from '@/lib/ledger-link';
import { moneyBook } from '@/lib/money-book';
import { stopBillValues } from '@/lib/plan-stop';
import { monthTotals, savingsFlows } from '@/lib/savings';

/**
 * Plans that no longer run (a cancelled subscription, a loan or bill stopped with no next date, a
 * finished loan kept out of spending) keep their recorded charges in Activity, Home's months and
 * Insights, as one fixture month shows. The money book already counted them, so every balance and
 * every savings month is to the cent what it was; Home's month now equals the book's.
 */

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => null }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

const TODAY = '2026-10-12';
const ACCOUNT = 'acct-1';
const CARD = 'card-1';

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
    bank_account_id: null,
    created_at: '2026-07-20T12:00:00Z',
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
    created_at: '2026-07-20T12:00:00Z',
    category_id: 'entertainment',
    card_id: CARD,
    bank_account_id: null,
    note: null,
    active: true,
    brands: null,
    ...fields,
  };
}

function charge(
  plan: { bill?: string; subscription?: string },
  on: string,
  label: string,
  amount: number,
  source: { card?: string; account?: string },
): ChargeRow {
  const owner = plan.bill ?? plan.subscription;
  return {
    id: `${owner}-${on}`,
    bill_id: plan.bill ?? null,
    subscription_id: plan.subscription ?? null,
    label,
    amount,
    charged_on: on,
    card_id: source.card ?? null,
    bank_account_id: source.account ?? null,
  };
}

function receipt(id: string, on: string, merchant: string, amount: number, source: string) {
  return {
    id,
    brand_id: null,
    merchant,
    amount,
    purchased_on: on,
    category_id: 'groceries',
    card_id: source === CARD ? CARD : null,
    bank_account_id: source === ACCOUNT ? ACCOUNT : null,
    note: null,
    source: 'manual',
    image_path: null,
    brands: null,
  } satisfies ReceiptRow;
}

const RENT = bill('rent', {
  name: 'Rent',
  amount: 1450,
  next_due_on: '2026-11-01',
  starts_on: '2026-09-01',
  bank_account_id: ACCOUNT,
});

/** Stopped today, running until then: its due on the 15th is never charged. */
const GYM_RUNNING = bill('gym', {
  name: 'Gym',
  amount: 39.99,
  category_id: 'health',
  next_due_on: '2026-10-15',
  starts_on: '2026-09-15',
  card_id: CARD,
});
const GYM = { ...GYM_RUNNING, ...stopBillValues(GYM_RUNNING, TODAY) };

/** Paid on the 1st; an edit moved it to the 20th, so it counted from 1 Nov. Stopped today. */
const CAR_RUNNING = bill('car', {
  name: 'Car loan',
  amount: 424.8,
  category_id: 'loans',
  icon_id: 'loan-car',
  next_due_on: '2026-10-20',
  starts_on: '2026-11-01',
  ends_on: '2029-07-20',
  bank_account_id: ACCOUNT,
});
const CAR = { ...CAR_RUNNING, ...stopBillValues(CAR_RUNNING, TODAY) };

/** Finished, then kept out of spending: what it recorded while it counted stays counted. */
const OLD_LOAN = bill('old-loan', {
  name: 'Old loan',
  amount: 300,
  category_id: 'loans',
  icon_id: 'loan-personal',
  starts_on: '2026-05-02',
  ends_on: '2026-10-02',
  bank_account_id: ACCOUNT,
  in_spending: false,
});

/** Cancelled after its October renewal. */
const NETFLIX = subscription('netflix', {
  name: 'Netflix',
  amount: 17.99,
  next_renewal_on: '2026-11-05',
  started_on: '2026-08-05',
  active: false,
  logo_domain: 'netflix.com',
});

/** Cancelled long ago: its one charge is older than the seven years the app reads. */
const SPOTIFY = subscription('spotify', {
  name: 'Spotify',
  amount: 9.99,
  started_on: '2019-03-01',
  active: false,
});

const CHARGES: ChargeRow[] = [
  charge({ bill: 'rent' }, '2026-09-01', 'Rent', 1450, { account: ACCOUNT }),
  charge({ bill: 'rent' }, '2026-10-01', 'Rent', 1450, { account: ACCOUNT }),
  charge({ bill: 'gym' }, '2026-09-15', 'Gym', 39.99, { card: CARD }),
  charge({ bill: 'car' }, '2026-08-01', 'Car loan', 424.8, { account: ACCOUNT }),
  charge({ bill: 'car' }, '2026-09-01', 'Car loan', 424.8, { account: ACCOUNT }),
  charge({ bill: 'car' }, '2026-10-01', 'Car loan', 424.8, { account: ACCOUNT }),
  charge({ bill: 'old-loan' }, '2026-10-02', 'Old loan', 300, { account: ACCOUNT }),
  charge({ subscription: 'netflix' }, '2026-08-05', 'Netflix', 15.49, { card: CARD }),
  charge({ subscription: 'netflix' }, '2026-09-05', 'Netflix', 15.49, { card: CARD }),
  charge({ subscription: 'netflix' }, '2026-10-05', 'Netflix', 17.99, { card: CARD }),
  charge({ subscription: 'spotify' }, '2019-03-01', 'Spotify', 9.99, { card: CARD }),
];

const PAYOFFS: LedgerPayoff[] = [
  {
    id: 'car-extra',
    bill_id: 'car',
    paid_on: '2026-10-08',
    amount: 1000,
    kind: 'partial',
    card_id: null,
    bank_account_id: ACCOUNT,
    counted: true,
  },
];

const PAY: PayRow[] = [
  {
    id: 'sep',
    salary_source_id: 'job',
    label: 'Salary',
    amount: 3700,
    paid_on: '2026-09-30',
    bank_account_id: ACCOUNT,
  },
  {
    id: 'oct',
    salary_source_id: 'job',
    label: 'Salary',
    amount: 1850.55,
    paid_on: '2026-10-10',
    bank_account_id: ACCOUNT,
  },
];

const INPUT: Omit<LedgerInput, 'from' | 'to'> = {
  receipts: [
    receipt('grocer', '2026-10-03', 'Grocer', 84.37, CARD),
    receipt('coffee', '2026-09-20', 'Coffee', 4.75, ACCOUNT),
  ],
  subscriptions: [NETFLIX, SPOTIFY],
  bills: [RENT, GYM, CAR, OLD_LOAN],
  salaries: [],
  charges: CHARGES,
  pay: PAY,
  payoffs: PAYOFFS,
  accountOrder: [ACCOUNT],
  today: TODAY,
};

/** Home's month: the calendar month, as `useLedger(rangeFor('month'))` reads it. */
const october = () => ledgerEntries({ ...INPUT, from: '2026-10-01', to: '2026-10-31' });

/** What `useBookFlows` reads: everything kept (seven years back) up to today. */
function book() {
  const entries = ledgerEntries({
    ...INPUT,
    from: historyFloor(true, new Date(`${TODAY}T00:00:00`)),
    to: TODAY,
  });
  return bookFlows({
    entries,
    subscriptions: INPUT.subscriptions,
    bills: INPUT.bills,
    charges: INPUT.charges,
  });
}

const cents = (amount: number) => Math.round(Math.abs(amount) * 100);
const spentCents = (entries: readonly LedgerEntry[]) =>
  entries
    .filter((entry) => entry.kind !== 'income' && entry.amount < 0)
    .reduce((sum, entry) => sum + cents(entry.amount), 0);

describe('Activity, Home and Insights list what stopped plans were charged', () => {
  it('lists a cancelled subscription’s charge as it was recorded, under its plan', () => {
    const row = october().find((entry) => entry.id === 'charge-netflix-2026-10-05');
    expect(row).toEqual({
      id: 'charge-netflix-2026-10-05',
      label: 'Netflix',
      amount: -17.99,
      date: '2026-10-05',
      kind: 'subscription',
      sourceId: CARD,
      domain: 'netflix.com',
      logoHidden: false,
      planId: 'netflix',
    });
  });

  it('lists a stopped loan’s payment and a finished loan kept out of spending, with their icons', () => {
    const rows = october().filter((entry) => entry.planId === 'car' || entry.planId === 'old-loan');
    expect(rows.map((entry) => [entry.id, entry.amount, entry.kind, entry.iconId])).toEqual([
      ['payoff-car-extra', -1000, 'bill', 'loan-car'],
      ['charge-old-loan-2026-10-02', -300, 'bill', 'loan-personal'],
      ['charge-car-2026-10-01', -424.8, 'bill', 'loan-car'],
    ]);
    expect(rows.every((entry) => entry.categoryId === 'loans' && entry.sourceId === ACCOUNT)).toBe(
      true,
    );
  });

  it('lists every month of their past, and only inside the window asked for', () => {
    const september = ledgerEntries({ ...INPUT, from: '2026-09-01', to: '2026-09-30' });
    expect(
      september
        .filter((entry) => entry.kind !== 'income')
        .map((entry) => entry.id)
        .sort(),
    ).toEqual([
      'charge-car-2026-09-01',
      'charge-gym-2026-09-15',
      'charge-netflix-2026-09-05',
      'charge-rent-2026-09-01',
      'receipt-coffee',
    ]);
  });

  it('projects nothing for them: a stopped bill’s due after today never shows as coming up', () => {
    const upcoming = october().filter((entry) => entry.date > TODAY);
    expect(upcoming).toEqual([]);
    // Running, the gym's due on the 15th and the loan's on the 20th were coming up.
    const running = ledgerEntries({
      ...INPUT,
      bills: [RENT, GYM_RUNNING, CAR_RUNNING, OLD_LOAN],
      from: '2026-10-01',
      to: '2026-10-31',
    }).filter((entry) => entry.date > TODAY);
    expect(running.map((entry) => entry.id)).toEqual(['bill-gym@2026-10-15']);
  });

  it('lists them on a plan’s own page too, where nothing is left out', () => {
    const shown = ledgerEntries({
      ...INPUT,
      from: '2026-10-01',
      to: '2026-10-31',
      uncounted: 'show',
    });
    expect(shown.map((entry) => entry.id)).toEqual(october().map((entry) => entry.id));
  });

  it('opens each row on the plan it came from', () => {
    const owners = chargeOwners(CHARGES);
    const open = (id: string) =>
      ledgerHref(
        october().find((entry) => entry.id === id)!,
        owners,
      );
    expect(open('charge-netflix-2026-10-05')).toEqual({
      pathname: '/subscription/[id]',
      params: { id: 'netflix' },
    });
    expect(open('charge-car-2026-10-01')).toEqual({
      pathname: '/loan/[id]',
      params: { id: 'car' },
    });
  });
});

describe('Home’s month equals the money book’s, to the cent', () => {
  it('sums October to $3,277.16, the October the savings close counts', () => {
    const home = october();
    const { spending } = book();
    const closed = monthTotals({
      month: '2026-10',
      today: TODAY,
      accountCreatedOn: '2026-08-01',
      pay: [],
      spending: savingsFlows(spending).spending,
    });

    expect(spentCents(home)).toBe(327716);
    expect(cents(closed.spent)).toBe(327716);
  });

  it('splits it into Home’s three tiles as home.tsx does', () => {
    const spentOn = (kind: string) =>
      october()
        .filter((entry) => entry.kind === kind)
        .reduce((sum, entry) => sum + Math.abs(entry.amount), 0);
    // Before: bills 2,450.00 and subscriptions 0.00, without the loan payments and Netflix.
    expect(cents(spentOn('bill'))).toBe(317480);
    expect(cents(spentOn('receipt'))).toBe(8437);
    expect(cents(spentOn('subscription'))).toBe(1799);
  });
});

describe('the money book is exactly what it was', () => {
  it('holds every receipt, charge and payoff once, the long-cancelled one included', () => {
    const ids = book().spending.map((spend) => spend.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(
      [
        ...CHARGES.map((row) => `charge-${row.id}`),
        'payoff-car-extra',
        'receipt-coffee',
        'receipt-grocer',
      ].sort(),
    );
  });

  it('leaves every balance where it was, to the cent', () => {
    const { spending, income } = book();
    const result = moneyBook({
      today: TODAY,
      sources: [
        { id: ACCOUNT, kind: 'account', name: 'Checking', balance: 5000, asOf: '2026-09-01' },
        { id: CARD, kind: 'card', name: 'Visa', balance: 200, asOf: '2026-09-01' },
      ],
      spending,
      payments: [],
      income,
    });

    // 5,000.00 + 5,550.55 pay − 5,054.35 (rent ×2, coffee, car ×2 since the 1st, old loan, payoff).
    expect(result.sources.get(ACCOUNT)!.balance).toBe(5496.2);
    // 200.00 owed + 157.84 (gym, Netflix ×2 since the 1st, groceries).
    expect(result.sources.get(CARD)!.balance).toBe(357.84);
    expect(result.current).toEqual({ balance: 5138.36, income: 5550.55, expenses: 5212.19 });
  });

  it('leaves every savings month where it was, to the cent', () => {
    const { spending, income } = book();
    const flows = savingsFlows([
      ...spending,
      ...income.map((pay) => ({ kind: 'income', date: pay.date, amount: pay.amount })),
    ]);
    const month = (m: string) =>
      monthTotals({ month: m, today: TODAY, accountCreatedOn: '2026-08-01', ...flows });

    expect(month('2026-08')).toEqual({ earned: 0, spent: 440.29, leftOver: -440.29 });
    expect(month('2026-09')).toEqual({ earned: 3700, spent: 1935.03, leftOver: 1764.97 });
    expect(month('2026-10')).toEqual({ earned: 1850.55, spent: 3277.16, leftOver: -1426.61 });
  });

  it('still counts a charge whose plan is no longer read, without listing it', () => {
    const orphan = charge({ subscription: 'gone' }, '2026-10-06', 'Gone', 5, { card: CARD });
    const input = { ...INPUT, charges: [...CHARGES, orphan] };
    const entries = ledgerEntries({ ...input, from: '2019-10-12', to: TODAY });
    const { spending } = bookFlows({ ...input, entries });

    expect(entries.some((entry) => entry.id === 'charge-gone-2026-10-06')).toBe(false);
    expect(spending.filter((spend) => spend.id === 'charge-gone-2026-10-06')).toHaveLength(1);
  });
});
