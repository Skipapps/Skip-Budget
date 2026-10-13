import type { ChargeRow } from '@/api/charges';
import {
  ledgerEntries,
  type BillRow,
  type LedgerPayoff,
  type SubscriptionRow,
} from '@/api/queries';
import { countsInSpending } from '@/lib/bill-spending';
import { addMonths, lastChargedBy, monthBounds, planMonth, type PlanKind } from '@/lib/bill-month';
import { occurrencesInRange, type Recurrence } from '@/lib/card-ledger';
import { floorAfterCharges, unrecordedDates } from '@/lib/charges';
import { toCents } from '@/lib/money';
import { rangeFor } from '@/lib/range';
import { ofKind, paymentEntries } from '@/lib/payment-entries';
import { monthGroups, paymentFloor, yearsList, yearSummary } from '@/lib/payment-years';

/**
 * The Monthly bills / Subscriptions month figure and Payment history must tell one story. For every
 * month in the seven-year window: the month page's total (what was due, all of it paid in a past
 * month) plus that month's loan payoffs (paid, never due) equals the history's month total for the
 * same tab, to the cent. The account below carries every rule the two read differently: rent
 * rises, a moved due day, weekly and quarterly and yearly plans, a set-period bill, a stopped bill,
 * a loan paid off in full and one in part, a loan kept out of bills (with a payoff it did not
 * count), a cancelled subscription, a renamed plan, and a plan never recorded.
 */

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => null }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

const TODAY = '2026-10-12';
const KOMAL = 'acct-komal-7010';
const DISCOVER = 'card-discover-6334';

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
    created_at: '2019-12-01T12:00:00Z',
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
    created_at: '2019-12-01T12:00:00Z',
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
function dates(anchor: string, recurrence: Recurrence, from: string, to: string): string[] {
  return occurrencesInRange(anchor, recurrence, from, to).sort();
}

function charged(
  plan: { bill?: string; subscription?: string },
  on: readonly string[],
  label: (date: string) => string,
  amount: (date: string, index: number) => number,
  source: { card?: string; account?: string } = {},
): ChargeRow[] {
  return on.map((date, index) => ({
    id: `${plan.bill ?? plan.subscription}-${date}`,
    bill_id: plan.bill ?? null,
    subscription_id: plan.subscription ?? null,
    label: label(date),
    amount: amount(date, index),
    charged_on: date,
    card_id: source.card ?? null,
    bank_account_id: source.account ?? null,
  }));
}

const named = (label: string) => () => label;
const flat = (amount: number) => () => amount;

const PHONE_MOVED_ON = '2025-04-05';

const BILLS: BillRow[] = [
  bill('rent', {
    name: 'Rent',
    amount: 1290,
    category_id: 'housing',
    next_due_on: '2021-03-01',
    starts_on: '2021-03-01',
    bank_account_id: KOMAL,
  }),
  bill('power', {
    name: 'Electricity',
    amount: 118.42,
    category_id: 'energy',
    next_due_on: '2020-01-08',
    starts_on: '2020-01-08',
    bank_account_id: KOMAL,
  }),
  bill('cleaner', {
    name: 'Cleaner',
    amount: 45,
    recurrence: 'weekly',
    next_due_on: '2025-06-05',
    starts_on: '2025-06-05',
    card_id: DISCOVER,
  }),
  bill('water', {
    name: 'Water',
    amount: 88.17,
    recurrence: 'quarterly',
    next_due_on: '2022-02-15',
    starts_on: '2022-02-15',
  }),
  bill('insurance', {
    name: 'Home insurance',
    amount: 940,
    recurrence: 'yearly',
    next_due_on: '2020-03-03',
    starts_on: '2020-03-03',
    bank_account_id: KOMAL,
  }),
  // Stopped with "Keep past" at the end of June 2025.
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
    next_due_on: '2024-04-28',
    starts_on: '2024-04-28',
    ends_on: '2029-03-28',
    card_id: DISCOVER,
  }),
  // Paid off in full on 25 Feb 2026, which ended its bill that day.
  bill('bike', {
    name: 'Bike loan',
    amount: 120.5,
    category_id: 'loans',
    next_due_on: '2024-01-20',
    starts_on: '2024-01-20',
    ends_on: '2026-02-25',
    bank_account_id: KOMAL,
  }),
  // "Add to monthly bills" turned off after August 2024.
  bill('boat', {
    name: 'Boat loan',
    amount: 410.25,
    category_id: 'loans',
    next_due_on: '2023-05-12',
    starts_on: '2023-05-12',
    in_spending: false,
  }),
  // Due on the 22nd until March 2025, then moved to the 5th at a new price.
  bill('phone', {
    name: 'Phone',
    amount: 70,
    category_id: 'mobile',
    next_due_on: PHONE_MOVED_ON,
    starts_on: floorAfterCharges(PHONE_MOVED_ON, '2025-03-22', 'monthly'),
    card_id: DISCOVER,
  }),
  // Added in August and never recorded: the ledger projects its past.
  bill('parking', {
    name: 'Parking',
    amount: 30,
    next_due_on: '2026-08-15',
    starts_on: '2026-08-15',
    created_at: '2026-08-15T09:00:00Z',
  }),
  // Charged as "Fios" until it was renamed, at a new price, from 2025.
  bill('internet', {
    name: 'Internet',
    amount: 84.99,
    category_id: 'internet',
    next_due_on: '2023-01-18',
    starts_on: '2023-01-18',
    bank_account_id: KOMAL,
  }),
  bill('dentist', {
    name: 'Dentist',
    amount: 230,
    category_id: 'health',
    recurrence: 'period',
    next_due_on: '2024-11-04',
    starts_on: '2024-11-04',
    ends_on: '2024-11-04',
  }),
];

const SUBSCRIPTIONS: SubscriptionRow[] = [
  subscription('netflix', {
    name: 'Netflix',
    amount: 15.99,
    next_renewal_on: '2020-01-09',
    started_on: '2020-01-09',
  }),
  subscription('hulu', {
    name: 'Hulu',
    amount: 7.99,
    next_renewal_on: '2024-07-14',
    started_on: '2022-01-14',
    active: false,
  }),
  subscription('prime', {
    name: 'Amazon Prime',
    amount: 139,
    cycle: 'yearly',
    next_renewal_on: '2020-11-07',
    started_on: '2020-11-07',
    bank_account_id: KOMAL,
  }),
  subscription('paper', {
    name: 'Newspaper',
    amount: 4.5,
    cycle: 'weekly',
    next_renewal_on: '2026-01-04',
    started_on: '2026-01-04',
    card_id: DISCOVER,
  }),
  subscription('trial', { name: 'Trial', amount: 4.99, active: false }),
];

/** Every charge as the recorders wrote them, the sweep having run today. */
const CHARGES: ChargeRow[] = [
  ...charged(
    { bill: 'rent' },
    dates('2021-03-01', 'monthly', '2021-03-01', TODAY),
    named('Rent'),
    (date) => (date < '2025-01-01' ? 1200 : 1290),
    { account: KOMAL },
  ),
  ...charged(
    { bill: 'power' },
    dates('2020-01-08', 'monthly', '2020-01-08', TODAY),
    named('Electricity'),
    // A different bill every month: $90.00 to $149.99.
    (_, index) => (9000 + ((index * 1737) % 6000)) / 100,
    { account: KOMAL },
  ),
  ...charged(
    { bill: 'cleaner' },
    dates('2025-06-05', 'weekly', '2025-06-05', TODAY),
    named('Cleaner'),
    flat(45),
    { card: DISCOVER },
  ),
  ...charged(
    { bill: 'water' },
    dates('2022-02-15', 'quarterly', '2022-02-15', TODAY),
    named('Water'),
    flat(88.17),
  ),
  ...charged(
    { bill: 'insurance' },
    dates('2020-03-03', 'yearly', '2020-03-03', TODAY),
    named('Home insurance'),
    flat(940),
    { account: KOMAL },
  ),
  ...charged(
    { bill: 'gym' },
    dates('2023-01-05', 'monthly', '2023-01-05', '2025-06-30'),
    named('Gym'),
    flat(39.99),
  ),
  ...charged(
    { bill: 'car' },
    dates('2024-04-28', 'monthly', '2024-04-28', TODAY),
    named('Car loan'),
    flat(554),
    { card: DISCOVER },
  ),
  ...charged(
    { bill: 'bike' },
    dates('2024-01-20', 'monthly', '2024-01-20', '2026-02-25'),
    named('Bike loan'),
    flat(120.5),
    { account: KOMAL },
  ),
  ...charged(
    { bill: 'boat' },
    dates('2023-05-12', 'monthly', '2023-05-12', '2024-08-31'),
    named('Boat loan'),
    flat(410.25),
  ),
  ...charged(
    { bill: 'phone' },
    dates('2022-06-22', 'monthly', '2022-06-22', '2025-03-22'),
    named('Phone'),
    flat(65),
    { card: DISCOVER },
  ),
  ...charged(
    { bill: 'phone' },
    dates(PHONE_MOVED_ON, 'monthly', PHONE_MOVED_ON, TODAY),
    named('Phone'),
    flat(70),
    { card: DISCOVER },
  ),
  ...charged(
    { bill: 'internet' },
    dates('2023-01-18', 'monthly', '2023-01-18', TODAY),
    (date) => (date < '2025-01-01' ? 'Fios' : 'Internet'),
    (date) => (date < '2025-01-01' ? 79.99 : 84.99),
    { account: KOMAL },
  ),
  ...charged({ bill: 'dentist' }, ['2024-11-04'], named('Dentist'), flat(230)),
  ...charged(
    { subscription: 'netflix' },
    dates('2020-01-09', 'monthly', '2020-01-09', TODAY),
    named('Netflix'),
    (date) => (date < '2024-01-01' ? 12.99 : date < '2025-01-01' ? 15.49 : 15.99),
  ),
  ...charged(
    { subscription: 'hulu' },
    dates('2022-01-14', 'monthly', '2022-01-14', '2024-06-14'),
    named('Hulu'),
    flat(7.99),
  ),
  ...charged(
    { subscription: 'prime' },
    dates('2020-11-07', 'yearly', '2020-11-07', TODAY),
    named('Amazon Prime'),
    flat(139),
    { account: KOMAL },
  ),
  ...charged(
    { subscription: 'paper' },
    dates('2026-01-04', 'weekly', '2026-01-04', TODAY),
    named('Newspaper'),
    flat(4.5),
    { card: DISCOVER },
  ),
];

const PAYOFFS: LedgerPayoff[] = [
  {
    id: 'car-extra',
    bill_id: 'car',
    paid_on: '2025-09-10',
    amount: 1000,
    kind: 'partial',
    card_id: null,
    bank_account_id: KOMAL,
    counted: true,
  },
  {
    id: 'bike-all',
    bill_id: 'bike',
    paid_on: '2026-02-25',
    amount: 1543.21,
    kind: 'full',
    card_id: null,
    bank_account_id: KOMAL,
    counted: true,
  },
  {
    id: 'boat-extra',
    bill_id: 'boat',
    paid_on: '2024-03-03',
    amount: 500,
    kind: 'partial',
    card_id: null,
    bank_account_id: KOMAL,
    counted: true,
  },
  // Two loans in one month.
  {
    id: 'car-nov',
    bill_id: 'car',
    paid_on: '2025-11-03',
    amount: 300,
    kind: 'partial',
    card_id: DISCOVER,
    bank_account_id: null,
    counted: true,
  },
  {
    id: 'bike-nov',
    bill_id: 'bike',
    paid_on: '2025-11-21',
    amount: 250.55,
    kind: 'partial',
    card_id: null,
    bank_account_id: KOMAL,
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
    bank_account_id: KOMAL,
    counted: false,
  },
];

type Account = {
  charges: ChargeRow[];
  payoffs: LedgerPayoff[];
  bills?: BillRow[];
  subscriptions?: SubscriptionRow[];
};

const billsOf = (account: Account) => account.bills ?? BILLS;
const subscriptionsOf = (account: Account) => account.subscriptions ?? SUBSCRIPTIONS;
const plansOf = (account: Account) => ({
  bills: billsOf(account),
  subscriptions: subscriptionsOf(account),
});
const ACCOUNT: Account = { charges: CHARGES, payoffs: PAYOFFS };

function ledger(account: Account, from: string, to: string, today: string) {
  return ledgerEntries({
    receipts: [],
    subscriptions: subscriptionsOf(account),
    bills: billsOf(account),
    salaries: [],
    charges: account.charges,
    pay: [],
    payoffs: account.payoffs,
    accountOrder: [],
    from,
    to,
    today,
  });
}

function months(from: string, to: string): string[] {
  const list: string[] = [];
  for (let month = from; month <= to; month = addMonths(month, 1)) list.push(month);
  return list;
}

/** History's month totals for a tab, in cents, from its month groups year by year. */
function historyByMonth(account: Account, kind: PlanKind, today: string): Map<string, number> {
  const floor = paymentFloor(today);
  const payments = ofKind(
    paymentEntries(ledger(account, floor, today, today), plansOf(account), today),
    kind,
  );
  const totals = new Map<string, number>();
  for (let year = Number(floor.slice(0, 4)); year <= Number(today.slice(0, 4)); year += 1) {
    const rows = payments.filter((row) => row.date.startsWith(`${year}-`));
    for (const group of monthGroups(rows, floor)) totals.set(group.month, toCents(group.total));
  }
  return totals;
}

/**
 * The month page's paid figure in cents (the whole total for a past month; the dates up to today
 * for this one) plus the month's payoffs, which history lists and the month page never counts.
 */
function monthPageByMonth(account: Account, kind: PlanKind, today: string): Map<string, number> {
  const totals = new Map<string, number>();
  const lastCharged = lastChargedBy(account.charges);
  for (const month of months(paymentFloor(today).slice(0, 7), today.slice(0, 7))) {
    const { from, to } = monthBounds(month);
    const entries = ledger(account, from, to, today);
    const shown = planMonth({
      kind,
      month,
      today,
      entries,
      ...plansOf(account),
      lastCharged,
    });
    const paid = [...shown.rows, ...shown.stopped]
      .flatMap((row) => row.occurrences)
      .filter((occurrence) => occurrence.paid)
      .reduce((sum, occurrence) => sum + toCents(occurrence.amount), 0);
    if (shown.when === 'past') expect(paid).toBe(toCents(shown.total));
    const payoffs = entries
      .filter((entry) => entry.kind === kind && entry.payoff && entry.date <= today)
      .reduce((sum, entry) => sum + Math.abs(toCents(entry.amount)), 0);
    if (shown.when === 'past') expect(toCents(shown.extras?.total ?? 0)).toBe(payoffs);
    if (paid + payoffs !== 0) totals.set(month, paid + payoffs);
  }
  return totals;
}

function differences(a: Map<string, number>, b: Map<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const month of new Set([...a.keys(), ...b.keys()])) {
    const diff = (a.get(month) ?? 0) - (b.get(month) ?? 0);
    if (diff !== 0) out[month] = diff;
  }
  return out;
}

describe('the fixture is what the recorders leave after a sweep today', () => {
  it('owes nothing on any recorded plan', () => {
    const recorded = new Map<string, Set<string>>();
    for (const row of CHARGES) {
      const id = (row.bill_id ?? row.subscription_id) as string;
      recorded.set(id, (recorded.get(id) ?? new Set()).add(row.charged_on));
    }
    const owed = [
      ...BILLS.filter(countsInSpending).map((row) => ({
        id: row.id,
        recurrence: row.recurrence,
        nextDate: row.next_due_on,
        startsOn: row.starts_on,
        createdAt: row.created_at,
        endsOn: row.ends_on,
      })),
      ...SUBSCRIPTIONS.filter((row) => row.active).map((row) => ({
        id: row.id,
        recurrence: row.cycle,
        nextDate: row.next_renewal_on,
        startsOn: row.started_on,
        createdAt: row.created_at,
      })),
    ]
      .filter((plan) => recorded.has(plan.id))
      .flatMap((plan) => unrecordedDates(plan, TODAY, recorded.get(plan.id)!));

    expect(owed).toEqual([]);
  });
});

describe('month page + payoffs = history, every month of seven years, to the cent', () => {
  it.each<PlanKind>(['bill', 'subscription'])('%s tab', (kind) => {
    const history = historyByMonth(ACCOUNT, kind, TODAY);
    const monthPage = monthPageByMonth(ACCOUNT, kind, TODAY);

    expect(differences(monthPage, history)).toEqual({});
    // The check covers real money in most months, not empty maps agreeing.
    expect(history.size).toBeGreaterThan(kind === 'bill' ? 80 : 75);
  });

  it('and every year card is its months, and All years is both tabs', () => {
    let allCents = 0;
    for (const kind of ['bill', 'subscription'] as const) {
      const monthPage = monthPageByMonth(ACCOUNT, kind, TODAY);
      const payments = ofKind(
        paymentEntries(
          ledger(ACCOUNT, paymentFloor(TODAY), TODAY, TODAY),
          { bills: BILLS, subscriptions: SUBSCRIPTIONS },
          TODAY,
        ),
        kind,
      );
      for (let year = 2020; year <= 2026; year += 1) {
        const fromMonths = [...monthPage.entries()]
          .filter(([month]) => month.startsWith(`${year}-`))
          .reduce((sum, [, cents]) => sum + cents, 0);
        expect([year, toCents(yearSummary(payments, year, TODAY).total)]).toEqual([
          year,
          fromMonths,
        ]);
        allCents += fromMonths;
      }
    }
    const everything = paymentEntries(
      ledger(ACCOUNT, paymentFloor(TODAY), TODAY, TODAY),
      { bills: BILLS, subscriptions: SUBSCRIPTIONS },
      TODAY,
    );
    expect(toCents(yearsList(everything, TODAY, paymentFloor(TODAY)).total)).toBe(allCents);
  });

  it('counts each payoff once, in history only, and never the one made while kept out', () => {
    const payments = paymentEntries(
      ledger(ACCOUNT, paymentFloor(TODAY), TODAY, TODAY),
      { bills: BILLS, subscriptions: SUBSCRIPTIONS },
      TODAY,
    );

    expect(
      payments
        .filter((row) => row.status !== 'paid')
        .map((row) => `${row.date} ${row.amount} ${row.status}`),
    ).toEqual([
      '2026-02-25 1543.21 paidOff',
      '2025-11-21 250.55 extraPayment',
      '2025-11-03 300 extraPayment',
      '2025-09-10 1000 extraPayment',
      '2024-03-03 500 extraPayment',
    ]);
  });
});

describe('before the sweep has run: the only gap is what it still owes', () => {
  // Last swept on 26 Sep; opened on 2 Oct. Owed: the car loan (28 Sep) and the newspaper (27 Sep)
  // in September; rent and the cleaner (1 Oct) in October.
  const today = '2026-10-02';
  const unswept: Account = {
    charges: CHARGES.filter((row) => row.charged_on <= '2026-09-26'),
    payoffs: PAYOFFS,
  };

  it('the month page counts the owed dues, history lists them once they are written', () => {
    expect(
      differences(monthPageByMonth(unswept, 'bill', today), historyByMonth(unswept, 'bill', today)),
    ).toEqual({ '2026-09': 55400, '2026-10': 129000 + 4500 });
    expect(
      differences(
        monthPageByMonth(unswept, 'subscription', today),
        historyByMonth(unswept, 'subscription', today),
      ),
    ).toEqual({ '2026-09': 450 });
  });

  it('after the sweep writes them the two agree again, and the month page has not moved', () => {
    const swept: Account = {
      charges: CHARGES.filter((row) => row.charged_on <= today),
      payoffs: PAYOFFS,
    };

    for (const kind of ['bill', 'subscription'] as const) {
      expect(
        differences(monthPageByMonth(swept, kind, today), historyByMonth(swept, kind, today)),
      ).toEqual({});
      expect(
        differences(monthPageByMonth(swept, kind, today), monthPageByMonth(unswept, kind, today)),
      ).toEqual({});
    }
  });
});

/**
 * Home's Monthly bills tile for a month, summed exactly as home.tsx sums it: every bill entry in
 * the ledger over `rangeFor('month')`, payoffs included, as floats.
 */
function homeTile(account: Account, month: string, today: string): number {
  const range = rangeFor('month', new Date(`${month}-01T00:00:00`));
  return ledger(account, range.from, range.to, today)
    .filter((entry) => entry.kind === 'bill')
    .reduce((sum, entry) => sum + Math.abs(entry.amount), 0);
}

function billMonth(account: Account, month: string, today: string) {
  const { from, to } = monthBounds(month);
  return planMonth({
    kind: 'bill',
    month,
    today,
    entries: ledger(account, from, to, today),
    ...plansOf(account),
    lastCharged: lastChargedBy(account.charges),
  });
}

describe("the card's due figure + extras = Home's Monthly bills tile, every month", () => {
  it('2020 to the end of 2026, to the cent', () => {
    const wrong: string[] = [];
    const extras: string[] = [];
    for (const month of months('2020-01', '2026-12')) {
      const shown = billMonth(ACCOUNT, month, TODAY);
      const home = toCents(homeTile(ACCOUNT, month, TODAY));
      const card = toCents(shown.total) + toCents(shown.extras?.total ?? 0);
      if (home !== card || home !== toCents(shown.extras?.inAll ?? shown.total)) {
        wrong.push(`${month}: home ${home}, card ${card}`);
      }
      if (shown.extras) extras.push(`${month} ${shown.extras.total} ${shown.extras.loans}`);
    }

    expect(wrong).toEqual([]);
    // Partial on a loan kept out of bills since; partial; two loans in one month; full.
    expect(extras).toEqual([
      '2024-03 500 1',
      '2025-09 1000 1',
      '2025-11 550.55 2',
      '2026-02 1543.21 1',
    ]);
  });

  it('two loans in one month are counted once each, unnamed', () => {
    expect(billMonth(ACCOUNT, '2025-11', TODAY).extras).toMatchObject({
      count: 2,
      loans: 2,
      name: null,
    });
  });

  it('a payoff in a month with nothing due: $0.00 due, Home shows the payoff', () => {
    const bike = BILLS.find((row) => row.id === 'bike')!;
    const solo: Account = {
      bills: [
        { ...bike, next_due_on: '2025-01-28', starts_on: '2025-01-28', ends_on: '2025-06-10' },
      ],
      subscriptions: [],
      charges: charged(
        { bill: 'bike' },
        dates('2025-01-28', 'monthly', '2025-01-28', '2025-05-31'),
        named('Bike loan'),
        flat(120.5),
      ),
      payoffs: [{ ...PAYOFFS.find((row) => row.id === 'bike-all')!, paid_on: '2025-06-10' }],
    };
    const june = billMonth(solo, '2025-06', TODAY);

    expect([june.total, june.planCount]).toEqual([0, 0]);
    expect(june.extras).toEqual({
      total: 1543.21,
      count: 1,
      loans: 1,
      name: 'Bike loan',
      inAll: 1543.21,
    });
    expect(toCents(homeTile(solo, '2025-06', TODAY))).toBe(154321);
    for (const month of months('2025-01', '2025-07')) {
      const shown = billMonth(solo, month, TODAY);
      expect([month, toCents(homeTile(solo, month, TODAY))]).toEqual([
        month,
        toCents(shown.extras?.inAll ?? shown.total),
      ]);
    }
  });
});

describe('a bill on the 31st through February and April, in 2027 and leap 2028', () => {
  // Every due date, worked out by hand: the 31st, clamped only in the month it falls in.
  const DUE = (
    '2027-01-31 2027-02-28 2027-03-31 2027-04-30 2027-05-31 2027-06-30 2027-07-31 2027-08-31 ' +
    '2027-09-30 2027-10-31 2027-11-30 2027-12-31 2028-01-31 2028-02-29 2028-03-31 2028-04-30 ' +
    '2028-05-31 2028-06-30 2028-07-31 2028-08-31 2028-09-30 2028-10-31 2028-11-30 2028-12-31'
  ).split(' ');

  /** The rent as the sweep leaves it: charged up to `sweptOn`, its stored date rolled to then. */
  function rentAccount(stored: string, sweptOn: string): Account {
    return {
      bills: [
        bill('rent31', {
          name: 'Rent',
          amount: 1234.56,
          category_id: 'housing',
          next_due_on: stored,
          starts_on: '2027-01-31',
          anchor_day: 31,
          created_at: '2027-01-10T12:00:00Z',
          bank_account_id: KOMAL,
        }),
      ],
      subscriptions: [],
      charges: charged(
        { bill: 'rent31' },
        DUE.filter((date) => date <= sweptOn),
        named('Rent'),
        flat(1234.56),
        { account: KOMAL },
      ),
      payoffs: [],
    };
  }

  // Swept every day: the stored date is the next due, shortened in February and April.
  const SWEPT = [
    { today: '2027-02-15', stored: '2027-02-28' },
    { today: '2027-04-15', stored: '2027-04-30' },
    { today: '2028-02-15', stored: '2028-02-29' },
    { today: '2028-04-15', stored: '2028-04-30' },
  ];

  it.each(SWEPT)(
    'on $today (stored $stored): one rent a month, each on its own day',
    ({ today, stored }) => {
      const account = rentAccount(stored, today);
      const shown = months('2027-01', '2028-12').map((month) =>
        billMonth(account, month, today).rows.flatMap((row) => row.occurrences.map((o) => o.date)),
      );
      expect(shown).toEqual(DUE.map((date) => [date]));
    },
  );

  it.each(SWEPT)('on $today: month page = history = Home, to the cent', ({ today, stored }) => {
    const account = rentAccount(stored, today);
    expect(
      differences(monthPageByMonth(account, 'bill', today), historyByMonth(account, 'bill', today)),
    ).toEqual({});
    expect(historyByMonth(account, 'bill', today).size).toBe(
      DUE.filter((date) => date <= today).length,
    );
    for (const month of months('2027-01', '2028-12')) {
      const card = billMonth(account, month, today);
      expect([month, toCents(homeTile(account, month, today))]).toEqual([
        month,
        toCents(card.extras?.inAll ?? card.total),
      ]);
      expect([month, toCents(card.total)]).toEqual([month, 123456]);
    }
  });

  // Last swept on a shortened due day, which is not rolled past until the day after; opened on the
  // next due day before the sweep. The ledger counts a due today before the sweep writes it, so the
  // month page and history agree on the day, and again once it is written.
  it.each([
    { sweptOn: '2027-02-28', today: '2027-03-31' },
    { sweptOn: '2028-02-29', today: '2028-03-31' },
    { sweptOn: '2027-04-30', today: '2027-05-31' },
    { sweptOn: '2028-04-30', today: '2028-05-31' },
  ])(
    'swept $sweptOn, opened $today: $today counts once, before the sweep and after',
    ({ sweptOn, today }) => {
      const unswept = rentAccount(sweptOn, sweptOn);
      expect(datesOf(billMonth(unswept, today.slice(0, 7), today))).toEqual([today]);
      expect(
        differences(
          monthPageByMonth(unswept, 'bill', today),
          historyByMonth(unswept, 'bill', today),
        ),
      ).toEqual({});
      expect(historyByMonth(unswept, 'bill', today).get(today.slice(0, 7))).toBe(123456);

      const swept = rentAccount(sweptOn, today);
      expect(
        differences(monthPageByMonth(swept, 'bill', today), historyByMonth(swept, 'bill', today)),
      ).toEqual({});
      expect(
        differences(
          monthPageByMonth(swept, 'bill', today),
          monthPageByMonth(unswept, 'bill', today),
        ),
      ).toEqual({});
    },
  );

  function datesOf(month: ReturnType<typeof billMonth>): string[] {
    return month.rows.flatMap((row) => row.occurrences.map((o) => o.date));
  }
});
