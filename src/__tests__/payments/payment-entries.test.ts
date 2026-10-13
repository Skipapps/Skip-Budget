import type { ChargeRow } from '@/api/charges';
import type { PayRow } from '@/api/pay';
import {
  ledgerEntries,
  type BillRow,
  type LedgerEntry,
  type LedgerPayoff,
  type ReceiptRow,
  type SubscriptionRow,
} from '@/api/queries';
import { chargeOwners, ledgerHref } from '@/lib/ledger-link';
import { toCents } from '@/lib/money';
import {
  ofKind,
  parseKind,
  parseMonth,
  parseYear,
  paymentEntries,
  paymentHref,
  type PaymentEntry,
} from '@/lib/payment-entries';

/**
 * Payment history's rows, read off the real ledger: only what went out (today included, nothing
 * after), every one "Paid", stopped and cancelled plans' charges kept, loan payoffs with their own
 * status, the name as recorded, every figure to the cent, and every row opening its plan's page.
 */

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => null }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

const TODAY = '2026-10-12';
const ACCOUNT = 'acct-1';
const CARD = 'card-1';
/** The second card: locked on free, but its charges went out all the same. */
const CARD_2 = 'card-2';

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
    created_at: '2026-01-05T12:00:00Z',
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
    created_at: '2026-01-05T12:00:00Z',
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
  source: { card?: string; account?: string } = {},
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

/** Renamed since: its charges went out as "Ashword Hill Apartments". */
const RENT = bill('rent', {
  name: 'Rent',
  amount: 1035,
  next_due_on: '2026-11-01',
  starts_on: '2026-09-01',
  bank_account_id: ACCOUNT,
});

/** No card or account was ever set. */
const NATIONWIDE = bill('nationwide', {
  name: 'Nationwide',
  amount: 145,
  category_id: 'insurance',
  next_due_on: '2026-11-11',
  starts_on: '2026-10-11',
});

/** Charged today: today's payment has happened. */
const AEP = bill('aep', {
  name: 'AEP',
  amount: 150,
  category_id: 'utilities',
  next_due_on: '2026-11-12',
  starts_on: '2026-10-12',
  card_id: CARD,
});

/** Stopped at the end of September: its charges are history. */
const GYM = bill('gym', {
  name: 'Gym',
  amount: 39.99,
  category_id: 'health',
  starts_on: '2026-08-15',
  ends_on: '2026-09-30',
  card_id: CARD,
});

/** A running loan, paid from the locked second card, with one extra payment. */
const CAR = bill('car', {
  name: 'Car loan',
  amount: 554,
  category_id: 'loans',
  icon_id: 'loan-car',
  next_due_on: '2026-10-28',
  starts_on: '2026-08-28',
  card_id: CARD_2,
});

/** Paid off in full on 5 Oct, so it no longer runs. */
const BIKE = bill('bike', {
  name: 'Bike loan',
  amount: 200,
  category_id: 'loans',
  icon_id: 'loan-personal',
  starts_on: '2026-08-05',
  ends_on: '2026-10-05',
  bank_account_id: ACCOUNT,
});

/** Kept out of monthly bills after its July charge; its payoff then did not count. */
const OLD_LOAN = bill('old-loan', {
  name: 'Old loan',
  amount: 300,
  category_id: 'loans',
  next_due_on: '2026-11-02',
  starts_on: '2026-05-02',
  bank_account_id: ACCOUNT,
  in_spending: false,
});

/** Cancelled after its October renewal. */
const NETFLIX = subscription('netflix', {
  name: 'Netflix',
  amount: 15.99,
  next_renewal_on: '2026-11-09',
  started_on: '2026-09-09',
  active: false,
  logo_domain: 'netflix.com',
});

/** Running and never written down: its past dates are in the ledger as Home counts them. */
const ICLOUD = subscription('icloud', {
  name: 'iCloud+',
  amount: 12.99,
  next_renewal_on: '2026-10-15',
  started_on: '2026-08-15',
  card_id: CARD_2,
});

const CHARGES: ChargeRow[] = [
  charge({ bill: 'rent' }, '2026-09-01', 'Ashword Hill Apartments', 1035, { account: ACCOUNT }),
  charge({ bill: 'rent' }, '2026-10-01', 'Ashword Hill Apartments', 1035, { account: ACCOUNT }),
  charge({ bill: 'nationwide' }, '2026-10-11', 'Nationwide', 145),
  charge({ bill: 'aep' }, TODAY, 'AEP', 150, { card: CARD }),
  charge({ bill: 'gym' }, '2026-08-15', 'Gym', 39.99, { card: CARD }),
  charge({ bill: 'gym' }, '2026-09-15', 'Gym', 39.99, { card: CARD }),
  charge({ bill: 'car' }, '2026-08-28', 'Car loan', 554, { card: CARD_2 }),
  charge({ bill: 'car' }, '2026-09-28', 'Car loan', 554, { card: CARD_2 }),
  charge({ bill: 'bike' }, '2026-09-05', 'Bike loan', 200, { account: ACCOUNT }),
  charge({ bill: 'old-loan' }, '2026-07-02', 'Old loan', 300, { account: ACCOUNT }),
  charge({ subscription: 'netflix' }, '2026-09-09', 'Netflix', 15.99, { card: CARD }),
  charge({ subscription: 'netflix' }, '2026-10-09', 'Netflix', 15.99, { card: CARD }),
];

function payoff(
  id: string,
  billId: string,
  on: string,
  amount: number,
  kind: LedgerPayoff['kind'],
  fields: Partial<LedgerPayoff> = {},
): LedgerPayoff {
  return {
    id,
    bill_id: billId,
    paid_on: on,
    amount,
    kind,
    card_id: null,
    bank_account_id: null,
    counted: true,
    ...fields,
  };
}

const PAYOFFS: LedgerPayoff[] = [
  payoff('car-extra', 'car', '2026-09-20', 1000, 'partial', { bank_account_id: ACCOUNT }),
  payoff('bike-full', 'bike', '2026-10-05', 8123.45, 'full'),
  payoff('old-extra', 'old-loan', '2026-09-10', 500, 'partial', { counted: false }),
];

const RECEIPT = {
  id: 'coffee',
  brand_id: null,
  merchant: 'Coffee',
  amount: 4.5,
  purchased_on: '2026-10-10',
  category_id: 'dining',
  card_id: CARD,
  bank_account_id: null,
  note: null,
  source: 'manual',
  image_path: null,
  brands: null,
} satisfies ReceiptRow;

const PAY: PayRow[] = [
  {
    id: 'oct',
    salary_source_id: null,
    label: 'Salary',
    amount: 4000,
    paid_on: '2026-10-01',
    bank_account_id: ACCOUNT,
  },
];

const BILLS = [RENT, NATIONWIDE, AEP, GYM, CAR, BIKE, OLD_LOAN];
const SUBSCRIPTIONS = [NETFLIX, ICLOUD];

/** The year, with the rest of it projected: what the payment pages must never list. */
const LEDGER: LedgerEntry[] = ledgerEntries({
  receipts: [RECEIPT],
  subscriptions: SUBSCRIPTIONS,
  bills: BILLS,
  salaries: [],
  charges: CHARGES,
  pay: PAY,
  payoffs: PAYOFFS,
  accountOrder: [ACCOUNT],
  from: '2026-01-01',
  to: '2026-12-31',
  today: TODAY,
});

const PAYMENTS = paymentEntries(LEDGER, { bills: BILLS, subscriptions: SUBSCRIPTIONS }, TODAY);

const brief = (rows: readonly PaymentEntry[]) =>
  rows.map((row) => [row.date, row.name, row.amount, row.status]);

const cents = (rows: readonly PaymentEntry[]) =>
  rows.reduce((total, row) => total + toCents(row.amount), 0);

describe('paymentEntries', () => {
  it('lists only what went out, today included, newest first', () => {
    expect(LEDGER.some((entry) => entry.date > TODAY && entry.kind === 'bill')).toBe(true);

    expect(brief(PAYMENTS)).toEqual([
      ['2026-10-12', 'AEP', 150, 'paid'],
      ['2026-10-11', 'Nationwide', 145, 'paid'],
      ['2026-10-09', 'Netflix', 15.99, 'paid'],
      ['2026-10-05', 'Bike loan', 8123.45, 'paidOff'],
      ['2026-10-01', 'Ashword Hill Apartments', 1035, 'paid'],
      ['2026-09-28', 'Car loan', 554, 'paid'],
      ['2026-09-20', 'Car loan', 1000, 'extraPayment'],
      ['2026-09-15', 'Gym', 39.99, 'paid'],
      ['2026-09-15', 'iCloud+', 12.99, 'paid'],
      ['2026-09-09', 'Netflix', 15.99, 'paid'],
      ['2026-09-05', 'Bike loan', 200, 'paid'],
      ['2026-09-01', 'Ashword Hill Apartments', 1035, 'paid'],
      ['2026-08-28', 'Car loan', 554, 'paid'],
      ['2026-08-15', 'Gym', 39.99, 'paid'],
      ['2026-08-15', 'iCloud+', 12.99, 'paid'],
      ['2026-07-02', 'Old loan', 300, 'paid'],
    ]);
    expect(PAYMENTS.every((row) => row.date <= TODAY)).toBe(true);
  });

  it('sums to the cent, every amount positive', () => {
    expect(PAYMENTS.every((row) => row.amount > 0)).toBe(true);
    expect(cents(PAYMENTS)).toBe(1_323_439);
    expect(cents(ofKind(PAYMENTS, 'bill'))).toBe(1_323_439 - 3198 - 2598);
    expect(cents(ofKind(PAYMENTS, 'subscription'))).toBe(3198 + 2598);
  });

  it('keeps no receipt and no pay', () => {
    expect(LEDGER.some((entry) => entry.kind === 'receipt')).toBe(true);
    expect(LEDGER.some((entry) => entry.kind === 'income')).toBe(true);
    expect(PAYMENTS.map((row) => row.name)).not.toContain('Coffee');
    expect(PAYMENTS.map((row) => row.name)).not.toContain('Salary');
    expect(new Set(PAYMENTS.map((row) => row.kind))).toEqual(new Set(['bill', 'subscription']));
  });

  it("keeps a stopped bill's and a cancelled subscription's charges", () => {
    const of = (planId: string) => brief(PAYMENTS.filter((row) => row.planId === planId));

    expect(of('gym')).toEqual([
      ['2026-09-15', 'Gym', 39.99, 'paid'],
      ['2026-08-15', 'Gym', 39.99, 'paid'],
    ]);
    expect(of('netflix')).toEqual([
      ['2026-10-09', 'Netflix', 15.99, 'paid'],
      ['2026-09-09', 'Netflix', 15.99, 'paid'],
    ]);
    expect(PAYMENTS.find((row) => row.planId === 'netflix')).toMatchObject({
      kind: 'subscription',
      domain: 'netflix.com',
      sourceId: CARD,
    });
  });

  it('lists a payoff with its own status, from its own card or account', () => {
    expect(PAYMENTS.find((row) => row.id === 'payoff-car-extra')).toEqual({
      id: 'payoff-car-extra',
      date: '2026-09-20',
      name: 'Car loan',
      planName: 'Car loan',
      amount: 1000,
      kind: 'bill',
      status: 'extraPayment',
      sourceId: ACCOUNT,
      planId: 'car',
      categoryId: 'loans',
      iconId: 'loan-car',
      domain: null,
      logoHidden: false,
    });
    expect(PAYMENTS.find((row) => row.id === 'payoff-bike-full')).toMatchObject({
      status: 'paidOff',
      sourceId: '',
      planId: 'bike',
    });
  });

  it('leaves out a payoff that did not count, and keeps a flag-off loan only as it recorded', () => {
    expect(PAYMENTS.some((row) => row.id === 'payoff-old-extra')).toBe(false);
    expect(brief(PAYMENTS.filter((row) => row.planId === 'old-loan'))).toEqual([
      ['2026-07-02', 'Old loan', 300, 'paid'],
    ]);
  });

  it('keeps the name as recorded, beside the plan’s name now', () => {
    const rent = PAYMENTS.filter((row) => row.planId === 'rent');
    expect(rent.map((row) => [row.name, row.planName])).toEqual([
      ['Ashword Hill Apartments', 'Rent'],
      ['Ashword Hill Apartments', 'Rent'],
    ]);
  });

  it('marks a payment with no card or account as none, and names a locked card’s', () => {
    expect(PAYMENTS.find((row) => row.planId === 'nationwide')?.sourceId).toBe('');
    expect(
      PAYMENTS.filter((row) => row.sourceId === CARD_2).map((row) => [row.date, row.name]),
    ).toEqual([
      ['2026-09-28', 'Car loan'],
      ['2026-09-15', 'iCloud+'],
      ['2026-08-28', 'Car loan'],
      ['2026-08-15', 'iCloud+'],
    ]);
  });

  it('cuts nothing at the free floor: the figures sum the whole window', () => {
    const freeFloor = '2026-07-15';
    expect(PAYMENTS.some((row) => row.date < freeFloor)).toBe(true);
  });

  it('reads a plan’s name from its own kind, and none for an unknown plan', () => {
    const entries: LedgerEntry[] = [
      {
        id: 'charge-a',
        label: 'Old',
        amount: -5,
        date: TODAY,
        kind: 'subscription',
        sourceId: '',
        planId: 'x',
      },
      {
        id: 'charge-b',
        label: 'Gone',
        amount: -6,
        date: TODAY,
        kind: 'bill',
        sourceId: '',
        planId: 'y',
      },
      { id: 'charge-c', label: 'Loose', amount: -7, date: TODAY, kind: 'bill', sourceId: '' },
    ];
    const rows = paymentEntries(
      entries,
      { bills: [{ id: 'x', name: 'Bill X' }], subscriptions: [{ id: 'x', name: 'Sub X' }] },
      TODAY,
    );
    expect(rows.map((row) => [row.id, row.planName, row.planId])).toEqual([
      ['charge-a', 'Sub X', 'x'],
      ['charge-b', null, 'y'],
      ['charge-c', null, null],
    ]);
    expect(rows[2]).toMatchObject({
      categoryId: null,
      iconId: null,
      domain: null,
      logoHidden: false,
    });
  });

  it('orders one day by id, the same in any locale', () => {
    const entries: LedgerEntry[] = ['b', 'B', 'a', 'A'].map((id) => ({
      id,
      label: id,
      amount: -1,
      date: TODAY,
      kind: 'bill',
      sourceId: '',
    }));
    expect(
      paymentEntries(entries, { bills: [], subscriptions: [] }, TODAY).map((r) => r.id),
    ).toEqual(['A', 'B', 'a', 'b']);
  });
});

describe('ofKind', () => {
  it('keeps every row for All, and one kind for a tab', () => {
    expect(ofKind(PAYMENTS, 'all')).toEqual(PAYMENTS);
    expect(ofKind(PAYMENTS, 'all')).not.toBe(PAYMENTS);
    expect(ofKind(PAYMENTS, 'bill').every((row) => row.kind === 'bill')).toBe(true);
    expect(ofKind(PAYMENTS, 'subscription').map((row) => row.planId)).toEqual([
      'netflix',
      'icloud',
      'netflix',
      'icloud',
    ]);
    expect(ofKind(PAYMENTS, 'bill').length + ofKind(PAYMENTS, 'subscription').length).toBe(
      PAYMENTS.length,
    );
  });

  it('keeps the caller’s own fields', () => {
    const rows = [
      { kind: 'bill' as const, extra: 1 },
      { kind: 'subscription' as const, extra: 2 },
    ];
    expect(ofKind(rows, 'subscription')).toEqual([{ kind: 'subscription', extra: 2 }]);
  });
});

describe('paymentHref', () => {
  it('opens each plan’s page: bill, loan, payoff and subscription', () => {
    const href = (id: string) => paymentHref(PAYMENTS.find((row) => row.id === id)!);

    expect(href('charge-rent-2026-10-01')).toEqual({
      pathname: '/bill/[id]',
      params: { id: 'rent' },
    });
    expect(href('charge-car-2026-09-28')).toEqual({
      pathname: '/loan/[id]',
      params: { id: 'car' },
    });
    expect(href('payoff-car-extra')).toEqual({ pathname: '/loan/[id]', params: { id: 'car' } });
    expect(href('payoff-bike-full')).toEqual({ pathname: '/loan/[id]', params: { id: 'bike' } });
    expect(href('charge-netflix-2026-10-09')).toEqual({
      pathname: '/subscription/[id]',
      params: { id: 'netflix' },
    });
    expect(href('subscription-icloud@2026-09-15')).toEqual({
      pathname: '/subscription/[id]',
      params: { id: 'icloud' },
    });
  });

  it('opens a payoff’s loan whatever its bill is filed under', () => {
    expect(
      paymentHref({ kind: 'bill', status: 'extraPayment', planId: 'p', categoryId: 'housing' }),
    ).toEqual({ pathname: '/loan/[id]', params: { id: 'p' } });
    expect(paymentHref({ kind: 'bill', status: 'paidOff', planId: 'p', categoryId: null })).toEqual(
      { pathname: '/loan/[id]', params: { id: 'p' } },
    );
  });

  it('opens nothing for a payment with no plan', () => {
    expect(
      paymentHref({ kind: 'bill', status: 'paid', planId: null, categoryId: null }),
    ).toBeNull();
    expect(
      paymentHref({ kind: 'subscription', status: 'paid', planId: null, categoryId: null }),
    ).toBeNull();
  });

  it('never opens a form, and agrees with every other ledger row', () => {
    const owners = chargeOwners(CHARGES);
    const byId = new Map(LEDGER.map((entry) => [entry.id, entry]));

    for (const row of PAYMENTS) {
      const href = paymentHref(row);
      expect(href).not.toBeNull();
      expect(JSON.stringify(href)).not.toContain('/add-');
      expect(href).toEqual(ledgerHref(byId.get(row.id)!, owners));
    }
  });
});

describe('parseKind', () => {
  it.each([
    ['all', 'all'],
    ['bill', 'bill'],
    ['subscription', 'subscription'],
    [['subscription', 'bill'], 'subscription'],
  ])('reads %j', (value, expected) => {
    expect(parseKind(value, 'all')).toBe(expected);
  });

  it.each([undefined, null, '', 'Bill', 'bills', 'loan', 'receipt', 42, [], {}])(
    'falls back on %j',
    (value) => {
      expect(parseKind(value, 'bill')).toBe('bill');
      expect(parseKind(value, 'all')).toBe('all');
    },
  );
});

describe('parseYear', () => {
  const PRO_FLOOR = '2020-01-01';

  it.each([
    ['2026', 2026],
    ['2024', 2024],
    ['2020', 2020],
    [['2023', '2021'], 2023],
    [2022, 2022],
  ])('reads %j', (value, expected) => {
    expect(parseYear(value, TODAY, PRO_FLOOR)).toBe(expected);
  });

  it('holds a year inside the floor’s year and this year', () => {
    expect(parseYear('2019', TODAY, PRO_FLOOR)).toBe(2020);
    expect(parseYear('0000', TODAY, PRO_FLOOR)).toBe(2020);
    expect(parseYear('2027', TODAY, PRO_FLOOR)).toBe(2026);
    expect(parseYear('9999', TODAY, PRO_FLOOR)).toBe(2026);
    expect(parseYear('2025', TODAY, '2026-07-15')).toBe(2026);
    expect(parseYear('2025', TODAY, '2025-12-31')).toBe(2025);
  });

  it.each([
    undefined,
    null,
    '',
    'abc',
    '20245',
    '202',
    ' 2024',
    '2024 ',
    '2024-10',
    '2024.5',
    2024.5,
    -2024,
    [],
  ])('reads %j as this year', (value) => {
    expect(parseYear(value, TODAY, PRO_FLOOR)).toBe(2026);
  });

  it('never goes past this year, even with a floor after today', () => {
    expect(parseYear('2027', TODAY, '2027-03-01')).toBe(2026);
    expect(parseYear('2020', TODAY, '2027-03-01')).toBe(2026);
  });

  it('moves on with the year', () => {
    expect(parseYear(undefined, '2027-01-01', PRO_FLOOR)).toBe(2027);
    expect(parseYear('2027', '2026-12-31', PRO_FLOOR)).toBe(2026);
  });
});

describe('parseMonth', () => {
  const FREE_FLOOR = '2026-07-15';

  it.each([
    ['2026-10', '2026-10'],
    ['2026-07', '2026-07'],
    ['2027-10', '2027-10'],
    [['2026-09', '2026-08'], '2026-09'],
  ])('reads %j', (value, expected) => {
    expect(parseMonth(value, TODAY, FREE_FLOOR)).toBe(expected);
  });

  it('holds a month inside the floor’s month and twelve ahead', () => {
    expect(parseMonth('2026-06', TODAY, FREE_FLOOR)).toBe('2026-07');
    expect(parseMonth('2019-12', TODAY, '2020-01-01')).toBe('2020-01');
    expect(parseMonth('2020-01', TODAY, '2020-01-01')).toBe('2020-01');
    expect(parseMonth('2027-11', TODAY, FREE_FLOOR)).toBe('2027-10');
    expect(parseMonth('2099-01', TODAY, FREE_FLOOR)).toBe('2027-10');
  });

  it('takes how far ahead from the caller, never less than this month', () => {
    expect(parseMonth('2026-12', TODAY, FREE_FLOOR, 1)).toBe('2026-11');
    expect(parseMonth('2026-11', TODAY, FREE_FLOOR, 0)).toBe('2026-10');
    expect(parseMonth('2026-11', TODAY, FREE_FLOOR, -3)).toBe('2026-10');
  });

  it('crosses a year end', () => {
    expect(parseMonth('2028-01', '2026-12-31', FREE_FLOOR)).toBe('2027-12');
    expect(parseMonth('2027-01', '2026-12-31', FREE_FLOOR, 1)).toBe('2027-01');
    expect(parseMonth('2027-02', '2026-12-31', FREE_FLOOR, 1)).toBe('2027-01');
    expect(parseMonth('2027-12', '2027-01-01', FREE_FLOOR, 11)).toBe('2027-12');
  });

  it.each([
    undefined,
    null,
    '',
    'nope',
    '2026-13',
    '2026-00',
    '2026-1',
    '2026-10-01',
    '26-10',
    202610,
    [],
  ])('reads %j as this month', (value) => {
    expect(parseMonth(value, TODAY, FREE_FLOOR)).toBe('2026-10');
  });

  it('never starts after this month, even with a floor after today', () => {
    expect(parseMonth('2026-10', TODAY, '2027-03-01')).toBe('2026-10');
    expect(parseMonth('2026-01', TODAY, '2027-03-01')).toBe('2026-10');
  });
});
