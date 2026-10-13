import type { ChargeRow } from '@/api/charges';
import {
  ledgerEntries,
  type BillRow,
  type LedgerPayoff,
  type SubscriptionRow,
} from '@/api/queries';
import {
  addMonths,
  daysUntil,
  lastChargedBy,
  monthBounds,
  monthChoices,
  monthOf,
  nextDueAfter,
  planMonth,
  type MonthPlanRow,
  type MonthStatus,
  type PlanKind,
  type PlanMonth,
  type StoppedPlanRow,
} from '@/lib/bill-month';
import { floorAfterCharges, unrecordedDates } from '@/lib/charges';
import { toCents } from '@/lib/money';
import { stopBillValues } from '@/lib/plan-stop';

/**
 * The Monthly bills and Subscriptions month view, fed by the real ledger (`ledgerEntries`, what
 * `useLedger(monthBounds(month), today).allEntries` returns) over the Founder's design month:
 * October 2026 seen on 12 Oct, bills $1,884.00 · 4 · 2 paid · 2 coming up · Next AEP 22 Oct, and
 * subscriptions $38.98 · 3 · 2 paid · 1 coming up · Next iCloud+ 15 Oct. Every expected figure is
 * worked by hand from the rows below, in cents.
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
    card_id: null,
    bank_account_id: null,
    note: null,
    active: true,
    brands: null,
    ...fields,
  };
}

/** One charge per date, as the recorders write them: the plan's label, amount and source then. */
function charges(
  plan: { bill?: string; subscription?: string },
  dates: readonly string[],
  label: string,
  amount: number,
  source: { card?: string; account?: string } = {},
): ChargeRow[] {
  const owner = plan.bill ?? plan.subscription;
  return dates.map((on) => ({
    id: `${owner}-${on}`,
    bill_id: plan.bill ?? null,
    subscription_id: plan.subscription ?? null,
    label,
    amount,
    charged_on: on,
    card_id: source.card ?? null,
    bank_account_id: source.account ?? null,
  }));
}

type Data = {
  bills?: BillRow[];
  subscriptions?: SubscriptionRow[];
  charges?: ChargeRow[];
  payoffs?: LedgerPayoff[];
};

/** The ledger over one month, exactly as the month page's hook asks for it. */
function ledger(month: string, today: string, data: Data) {
  const { from, to } = monthBounds(month);
  return ledgerEntries({
    receipts: [],
    subscriptions: data.subscriptions ?? [],
    bills: data.bills ?? [],
    salaries: [],
    charges: data.charges ?? [],
    pay: [],
    payoffs: data.payoffs ?? [],
    accountOrder: [],
    from,
    to,
    today,
  });
}

function view(kind: PlanKind, month: string, today: string, data: Data): PlanMonth {
  return planMonth({
    kind,
    month,
    today,
    entries: ledger(month, today, data),
    bills: data.bills ?? [],
    subscriptions: data.subscriptions ?? [],
    lastCharged: lastChargedBy(data.charges ?? []),
  });
}

function summary(month: PlanMonth) {
  return {
    total: month.total,
    n: month.planCount,
    p: month.paidCount,
    c: month.comingCount,
    next: month.next ? `${month.next.label} ${month.next.date}` : null,
  };
}

function said(status: MonthStatus): string {
  switch (status.kind) {
    case 'paid':
      return 'Paid';
    case 'next':
      return status.inMonth ? `Next ${status.date}` : `Next ${status.date} (later)`;
    case 'ends':
      return `Ends ${status.date}`;
    default:
      return '-';
  }
}

function rowLines(month: PlanMonth): string[] {
  return month.rows.map((row) => `${row.name} ${row.amount} ${said(row.status)}`);
}

function datesOf(row: MonthPlanRow | StoppedPlanRow | undefined): string[] {
  return (row?.occurrences ?? []).map((o) => `${o.date}${o.paid ? ' paid' : ''}`);
}

function comingLines(month: PlanMonth): string[] {
  return month.comingUp.map((o) => `${o.label} ${o.date} ${o.amount}`);
}

/** What the ledger itself holds for the month's plans of a kind, in cents: history's figure. */
function ledgerCents(month: string, today: string, kind: PlanKind, data: Data): number {
  return ledger(month, today, data)
    .filter((entry) => entry.kind === kind && entry.planId && !entry.payoff)
    .reduce((sum, entry) => sum + Math.abs(toCents(entry.amount)), 0);
}

// ---------------------------------------------------------------------------------------------
// The design month (1.png, 6.png).

const RENT = bill('rent', {
  name: 'Ashword Hill Apartments',
  amount: 1035,
  category_id: 'housing',
  next_due_on: '2026-08-01',
  starts_on: '2026-08-01',
  bank_account_id: KOMAL,
});
const NATIONWIDE = bill('nationwide', {
  name: 'Nationwide',
  amount: 145,
  category_id: 'insurance',
  next_due_on: '2026-08-05',
  starts_on: '2026-08-05',
});
const AEP = bill('aep', {
  name: 'AEP',
  amount: 150,
  category_id: 'energy',
  next_due_on: '2026-08-22',
  starts_on: '2026-08-22',
  bank_account_id: KOMAL,
});
const CAR_LOAN = bill('car', {
  name: 'Car loan',
  amount: 554,
  category_id: 'loans',
  icon_id: 'loan-car',
  next_due_on: '2026-09-28',
  starts_on: '2026-09-28',
  ends_on: '2031-08-28',
  card_id: DISCOVER,
  in_spending: true,
});

const DESIGN_BILL_CHARGES = [
  ...charges({ bill: 'rent' }, ['2026-08-01', '2026-09-01', '2026-10-01'], RENT.name, 1035, {
    account: KOMAL,
  }),
  ...charges({ bill: 'nationwide' }, ['2026-08-05', '2026-09-05', '2026-10-05'], 'Nationwide', 145),
  ...charges({ bill: 'aep' }, ['2026-08-22', '2026-09-22'], 'AEP', 150, { account: KOMAL }),
  ...charges({ bill: 'car' }, ['2026-09-28'], 'Car loan', 554, { card: DISCOVER }),
];

const DESIGN_BILLS: Data = {
  bills: [RENT, NATIONWIDE, AEP, CAR_LOAN],
  charges: DESIGN_BILL_CHARGES,
};

const NETFLIX = subscription('netflix', {
  name: 'Netflix',
  amount: 15.99,
  next_renewal_on: '2026-08-03',
  started_on: '2026-08-03',
});
const SPOTIFY = subscription('spotify', {
  name: 'Spotify',
  amount: 10,
  next_renewal_on: '2026-09-08',
  started_on: '2026-09-08',
});
const ICLOUD = subscription('icloud', {
  name: 'iCloud+',
  amount: 12.99,
  next_renewal_on: '2026-08-15',
  started_on: '2026-08-15',
  card_id: DISCOVER,
});

const DESIGN_SUBSCRIPTIONS: Data = {
  subscriptions: [NETFLIX, SPOTIFY, ICLOUD],
  charges: [
    ...charges(
      { subscription: 'netflix' },
      ['2026-08-03', '2026-09-03', '2026-10-03'],
      'Netflix',
      15.99,
    ),
    ...charges({ subscription: 'spotify' }, ['2026-09-08', '2026-10-08'], 'Spotify', 10),
    ...charges({ subscription: 'icloud' }, ['2026-08-15', '2026-09-15'], 'iCloud+', 12.99, {
      card: DISCOVER,
    }),
  ],
};

describe('the design month: October 2026 on 12 Oct', () => {
  it('bills: $1,884.00 · 4 bills · 2 paid · 2 coming up · Next AEP 22 Oct', () => {
    const october = view('bill', '2026-10', TODAY, DESIGN_BILLS);

    expect(summary(october)).toEqual({
      total: 1884,
      n: 4,
      p: 2,
      c: 2,
      next: 'AEP 2026-10-22',
    });
    expect(october.month).toBe('2026-10');
    expect(october.when).toBe('current');
  });

  it('bills: Coming up is AEP in 10 days and the car loan in 16', () => {
    const october = view('bill', '2026-10', TODAY, DESIGN_BILLS);

    expect(comingLines(october)).toEqual(['AEP 2026-10-22 150', 'Car loan 2026-10-28 554']);
    expect(october.comingUp.map((o) => daysUntil(o.date, TODAY))).toEqual([10, 16]);
    expect(october.comingUp.map((o) => o.sourceId)).toEqual([KOMAL, DISCOVER]);
    expect(october.next).toBe(october.comingUp[0]);
  });

  it('bills: All bills in day-of-month order with Paid / Next, each on its own page', () => {
    const october = view('bill', '2026-10', TODAY, DESIGN_BILLS);

    expect(rowLines(october)).toEqual([
      'Ashword Hill Apartments 1035 Paid',
      'Nationwide 145 Paid',
      'AEP 150 Next 2026-10-22',
      'Car loan 554 Next 2026-10-28',
    ]);
    expect(october.rows.map((row) => row.sourceId)).toEqual([KOMAL, '', KOMAL, DISCOVER]);
    expect(october.rows.map((row) => row.recurrence)).toEqual([
      'monthly',
      'monthly',
      'monthly',
      'monthly',
    ]);
    expect(october.rows[0].href).toEqual({ pathname: '/bill/[id]', params: { id: 'rent' } });
    expect(october.rows[3].href).toEqual({ pathname: '/loan/[id]', params: { id: 'car' } });
    expect(october.stopped).toEqual([]);
  });

  it('subscriptions: $38.98 · 3 · 2 paid · 1 coming up · Next iCloud+ 15 Oct, summed in cents', () => {
    const october = view('subscription', '2026-10', TODAY, DESIGN_SUBSCRIPTIONS);

    // 15.99 + 10 + 12.99 in floating point is 38.980000000000004.
    expect(summary(october)).toEqual({
      total: 38.98,
      n: 3,
      p: 2,
      c: 1,
      next: 'iCloud+ 2026-10-15',
    });
    expect(comingLines(october)).toEqual(['iCloud+ 2026-10-15 12.99']);
    expect(daysUntil(october.comingUp[0].date, TODAY)).toBe(3);
    expect(rowLines(october)).toEqual([
      'Netflix 15.99 Paid',
      'Spotify 10 Paid',
      'iCloud+ 12.99 Next 2026-10-15',
    ]);
    expect(october.rows.map((row) => row.sourceId)).toEqual(['', '', DISCOVER]);
    expect(october.rows[0].href).toEqual({
      pathname: '/subscription/[id]',
      params: { id: 'netflix' },
    });
  });

  it('a past month is all paid and a future month all to come, by the date rule alone', () => {
    const september = view('bill', '2026-09', TODAY, DESIGN_BILLS);
    expect(september.when).toBe('past');
    expect(summary(september)).toEqual({ total: 1884, n: 4, p: 4, c: 0, next: null });
    expect(september.comingUp).toEqual([]);

    const november = view('bill', '2026-11', TODAY, DESIGN_BILLS);
    expect(november.when).toBe('future');
    expect(summary(november)).toEqual({
      total: 1884,
      n: 4,
      p: 0,
      c: 4,
      next: 'Ashword Hill Apartments 2026-11-01',
    });
    expect(comingLines(november)).toEqual([
      'Ashword Hill Apartments 2026-11-01 1035',
      'Nationwide 2026-11-05 145',
      'AEP 2026-11-22 150',
      'Car loan 2026-11-28 554',
    ]);

    // Before the car loan began: three bills.
    expect(summary(view('bill', '2026-08', TODAY, DESIGN_BILLS))).toEqual({
      total: 1330,
      n: 3,
      p: 3,
      c: 0,
      next: null,
    });
  });

  it('every month is the ledger to the cent, so the month page and payment history agree', () => {
    for (const month of ['2026-08', '2026-09', '2026-10', '2026-11', '2026-12']) {
      expect(toCents(view('bill', month, TODAY, DESIGN_BILLS).total)).toBe(
        ledgerCents(month, TODAY, 'bill', DESIGN_BILLS),
      );
      expect(toCents(view('subscription', month, TODAY, DESIGN_SUBSCRIPTIONS).total)).toBe(
        ledgerCents(month, TODAY, 'subscription', DESIGN_SUBSCRIPTIONS),
      );
    }
  });
});

// ---------------------------------------------------------------------------------------------
// R1: a due the recorders have not written yet.

describe('a due today before the sweep has recorded it', () => {
  it('is in the ledger nowhere, and the month still counts it as paid', () => {
    const today = '2026-10-22';
    expect(
      ledger('2026-10', today, DESIGN_BILLS).filter((entry) => entry.planId === 'aep'),
    ).toEqual([]);

    const october = view('bill', '2026-10', today, DESIGN_BILLS);
    expect(summary(october)).toEqual({
      total: 1884,
      n: 4,
      p: 3,
      c: 1,
      next: 'Car loan 2026-10-28',
    });
    const aep = october.rows.find((row) => row.planId === 'aep');
    expect(datesOf(aep)).toEqual(['2026-10-22 paid']);
    expect(aep?.status).toEqual({ kind: 'paid' });
    // The id a projected date has, so its row opens the bill.
    expect(aep?.occurrences[0]).toEqual({
      id: 'bill-aep@2026-10-22',
      planId: 'aep',
      date: '2026-10-22',
      amount: 150,
      sourceId: KOMAL,
      label: 'AEP',
      paid: true,
    });
  });

  it('reads the same once the sweep writes it: nothing is counted twice', () => {
    const today = '2026-10-22';
    const before = view('bill', '2026-10', today, DESIGN_BILLS);
    const after = view('bill', '2026-10', today, {
      ...DESIGN_BILLS,
      charges: [
        ...DESIGN_BILL_CHARGES,
        ...charges({ bill: 'aep' }, ['2026-10-22'], 'AEP', 150, { account: KOMAL }),
      ],
    });

    expect(summary(after)).toEqual(summary(before));
    expect(rowLines(after)).toEqual(rowLines(before));
    expect(datesOf(after.rows.find((row) => row.planId === 'aep'))).toEqual(['2026-10-22 paid']);
  });

  it('still counts it with the app left open past midnight', () => {
    const october = view('bill', '2026-10', '2026-10-23', DESIGN_BILLS);

    expect(summary(october)).toEqual({
      total: 1884,
      n: 4,
      p: 3,
      c: 1,
      next: 'Car loan 2026-10-28',
    });
  });

  it('fills exactly the dates the recorder will write in the month', () => {
    const today = '2026-10-22';
    const recorded = new Set(['2026-08-22', '2026-09-22']);
    const owed = unrecordedDates(
      {
        id: 'aep',
        recurrence: 'monthly',
        nextDate: AEP.next_due_on,
        startsOn: AEP.starts_on,
        createdAt: AEP.created_at,
        endsOn: AEP.ends_on,
      },
      today,
      recorded,
    );
    expect(owed).toEqual(['2026-10-22']);

    const listed = new Set(ledger('2026-10', today, DESIGN_BILLS).map((entry) => entry.id));
    const filled = view('bill', '2026-10', today, DESIGN_BILLS)
      .rows.flatMap((row) => row.occurrences)
      .filter((o) => !listed.has(o.id))
      .map((o) => o.date);
    expect(filled).toEqual(owed);
  });

  it('adds nothing once the ledger projects today itself: never counted twice', () => {
    const today = '2026-10-22';
    // The ledger as it will read when it projects a recorded plan's unrecorded due from today.
    const projected = [
      ...ledger('2026-10', today, DESIGN_BILLS),
      {
        id: 'bill-aep@2026-10-22',
        label: 'AEP',
        date: '2026-10-22',
        amount: -150,
        kind: 'bill' as const,
        sourceId: KOMAL,
        planId: 'aep',
      },
    ];
    const october = planMonth({
      kind: 'bill',
      month: '2026-10',
      today,
      entries: projected,
      bills: DESIGN_BILLS.bills!,
      subscriptions: [],
      lastCharged: lastChargedBy(DESIGN_BILL_CHARGES),
    });

    expect(datesOf(october.rows.find((row) => row.planId === 'aep'))).toEqual(['2026-10-22 paid']);
    expect(summary(october)).toEqual(summary(view('bill', '2026-10', today, DESIGN_BILLS)));
    expect(october.total).toBe(1884);
  });

  it('fills nothing in a weekly cycle charged in the month before', () => {
    // Charged on Mondays to 28 Sep, then moved to Thursdays without moving the start: 1 Oct falls
    // in the week of 28 Sep, which is charged, so the recorder never writes it.
    const lessons = bill('lessons', {
      name: 'Lessons',
      amount: 30,
      recurrence: 'weekly',
      next_due_on: '2026-10-01',
      starts_on: '2026-09-07',
    });
    const mondays = ['2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28'];
    const today = '2026-10-02';

    expect(
      unrecordedDates(
        {
          id: 'lessons',
          recurrence: 'weekly',
          nextDate: lessons.next_due_on,
          startsOn: lessons.starts_on,
          createdAt: lessons.created_at,
        },
        today,
        new Set(mondays),
      ),
    ).toEqual([]);
    const october = view('bill', '2026-10', today, {
      bills: [lessons],
      charges: charges({ bill: 'lessons' }, mondays, 'Lessons', 30),
    });
    expect(datesOf(october.rows[0])).toEqual([
      '2026-10-08',
      '2026-10-15',
      '2026-10-22',
      '2026-10-29',
    ]);
    expect(october.total).toBe(120);
  });

  it('fills a subscription renewing today too', () => {
    const october = view('subscription', '2026-10', '2026-10-15', DESIGN_SUBSCRIPTIONS);

    expect(summary(october)).toEqual({ total: 38.98, n: 3, p: 3, c: 0, next: null });
  });

  it('fills nothing for a plan never charged: the ledger already projects its past', () => {
    const fresh = bill('fresh', {
      name: 'Fresh',
      amount: 20,
      next_due_on: '2026-10-12',
      starts_on: '2026-10-12',
    });
    const october = view('bill', '2026-10', TODAY, { bills: [fresh] });

    expect(datesOf(october.rows[0])).toEqual(['2026-10-12 paid']);
    expect(october.rows[0].occurrences[0].id).toBe('bill-fresh@2026-10-12');
    expect(summary(october)).toEqual({ total: 20, n: 1, p: 1, c: 0, next: null });
  });

  it('fills nothing in a cycle already charged, as the recorder writes nothing there', () => {
    // An older edit moved the due day from the 1st to the 28th without moving the start.
    const moved = bill('moved', {
      name: 'Moved',
      amount: 75,
      next_due_on: '2026-10-28',
      starts_on: '2026-08-01',
    });
    const data: Data = {
      bills: [moved],
      charges: charges({ bill: 'moved' }, ['2026-08-01', '2026-09-01', '2026-10-01'], 'Moved', 75),
    };
    const today = '2026-10-28';

    expect(
      unrecordedDates(
        {
          id: 'moved',
          recurrence: 'monthly',
          nextDate: moved.next_due_on,
          startsOn: moved.starts_on,
          createdAt: moved.created_at,
        },
        today,
        new Set(['2026-08-01', '2026-09-01', '2026-10-01']),
      ),
    ).toEqual([]);
    const october = view('bill', '2026-10', today, data);
    expect(datesOf(october.rows[0])).toEqual(['2026-10-01 paid']);
    expect(october.total).toBe(75);
  });
});

// ---------------------------------------------------------------------------------------------
// §2 edge cases.

describe('1. a bill moved mid-month', () => {
  // Rent on the 28th, charged 28 Sep, moved to the 1st on 5 Oct: the form saves the picked date as
  // next due, and the start after the newest charge's cycle (`floorAfterCharges`).
  const movedToFirst = bill('rent28', {
    name: 'Rent',
    amount: 1200,
    category_id: 'housing',
    next_due_on: '2026-10-01',
    starts_on: floorAfterCharges('2026-10-01', '2026-09-28', 'monthly'),
    bank_account_id: KOMAL,
  });
  const before = charges({ bill: 'rent28' }, ['2026-08-28', '2026-09-28'], 'Rent', 1200, {
    account: KOMAL,
  });
  const swept = [
    ...before,
    ...charges({ bill: 'rent28' }, ['2026-10-01'], 'Rent', 1200, { account: KOMAL }),
  ];

  it('October has 1 Oct once, paid; there is no 28 Oct; November has 1 Nov', () => {
    const data = { bills: [movedToFirst], charges: swept };
    const october = view('bill', '2026-10', TODAY, data);

    expect(movedToFirst.starts_on).toBe('2026-10-01');
    expect(datesOf(october.rows[0])).toEqual(['2026-10-01 paid']);
    expect(summary(october)).toEqual({ total: 1200, n: 1, p: 1, c: 0, next: null });
    expect(datesOf(view('bill', '2026-11', TODAY, data).rows[0])).toEqual(['2026-11-01']);
    expect(datesOf(view('bill', '2026-09', TODAY, data).rows[0])).toEqual(['2026-09-28 paid']);
  });

  it('before the sweep has written 1 Oct, the month shows it paid all the same', () => {
    const data = { bills: [movedToFirst], charges: before };

    expect(ledger('2026-10', TODAY, data)).toEqual([]);
    const october = view('bill', '2026-10', TODAY, data);
    expect(datesOf(october.rows[0])).toEqual(['2026-10-01 paid']);
    expect(summary(october)).toEqual({ total: 1200, n: 1, p: 1, c: 0, next: null });
  });

  it('moved the other way (1st to 28th after 1 Oct was charged): 1 Oct only, then 28 Nov', () => {
    const movedToLate = bill('rent1', {
      name: 'Rent',
      amount: 1200,
      next_due_on: '2026-10-28',
      starts_on: floorAfterCharges('2026-10-28', '2026-10-01', 'monthly'),
    });
    const data = {
      bills: [movedToLate],
      charges: charges({ bill: 'rent1' }, ['2026-09-01', '2026-10-01'], 'Rent', 1200),
    };

    expect(movedToLate.starts_on).toBe('2026-11-01');
    for (const today of [TODAY, '2026-10-28', '2026-10-31']) {
      const october = view('bill', '2026-10', today, data);
      expect(datesOf(october.rows[0])).toEqual(['2026-10-01 paid']);
      expect(october.total).toBe(1200);
    }
    expect(datesOf(view('bill', '2026-11', TODAY, data).rows[0])).toEqual(['2026-11-28']);
  });
});

describe('2. starting or stopping mid-month', () => {
  it('a bill starting 15 Oct has only dates from then on', () => {
    const internet = bill('internet', {
      name: 'Internet',
      amount: 64.99,
      next_due_on: '2026-10-15',
      starts_on: '2026-10-15',
      created_at: '2026-10-12T09:00:00Z',
    });
    const data = { bills: [internet] };

    expect(datesOf(view('bill', '2026-10', TODAY, data).rows[0])).toEqual(['2026-10-15']);
    const september = view('bill', '2026-09', TODAY, data);
    expect(summary(september)).toEqual({ total: 0, n: 0, p: 0, c: 0, next: null });
    expect(rowLines(september)).toEqual(['Internet 64.99 Next 2026-10-15 (later)']);
  });

  it('a start in the past fills the earlier dates as paid (five Thursdays in October)', () => {
    const cleaner = bill('cleaner', {
      name: 'Cleaner',
      amount: 45,
      recurrence: 'weekly',
      next_due_on: '2026-10-01',
      starts_on: '2026-10-01',
      created_at: '2026-10-12T09:00:00Z',
    });
    const october = view('bill', '2026-10', TODAY, { bills: [cleaner] });

    expect(datesOf(october.rows[0])).toEqual([
      '2026-10-01 paid',
      '2026-10-08 paid',
      '2026-10-15',
      '2026-10-22',
      '2026-10-29',
    ]);
    expect(summary(october)).toEqual({ total: 225, n: 1, p: 0, c: 1, next: 'Cleaner 2026-10-15' });
    expect(october.comingUp.map((o) => o.date)).toEqual(['2026-10-15', '2026-10-22', '2026-10-29']);
  });

  const GYM_RUNNING = bill('gym', {
    name: 'Gym',
    amount: 39.99,
    next_due_on: '2026-11-01',
    starts_on: '2026-09-01',
    card_id: DISCOVER,
  });
  // Stopped today by "Keep past" on a delete: the end is today and the next date stays.
  const GYM = { ...GYM_RUNNING, ...stopBillValues(GYM_RUNNING, TODAY) };
  const GYM_DATA: Data = {
    bills: [GYM],
    charges: charges({ bill: 'gym' }, ['2026-09-01', '2026-10-01'], 'Gym', 39.99, {
      card: DISCOVER,
    }),
  };

  it('stopped 12 Oct after its 1 Oct charge: October counts it, paid, listed with the stopped', () => {
    const october = view('bill', '2026-10', TODAY, GYM_DATA);

    expect(GYM.ends_on).toBe(TODAY);
    expect(summary(october)).toEqual({ total: 39.99, n: 1, p: 1, c: 0, next: null });
    expect(october.rows).toEqual([]);
    expect(october.stopped).toHaveLength(1);
    expect(october.stopped[0]).toMatchObject({
      planId: 'gym',
      amount: 39.99,
      stoppedOn: TODAY,
      lastCharged: '2026-10-01',
    });
    expect(datesOf(october.stopped[0])).toEqual(['2026-10-01 paid']);
  });

  it('from November it is only in Stopped, counted nowhere', () => {
    const november = view('bill', '2026-11', TODAY, GYM_DATA);

    expect(summary(november)).toEqual({ total: 0, n: 0, p: 0, c: 0, next: null });
    expect(november.rows).toEqual([]);
    expect(november.stopped.map((row) => [row.name, row.amount, row.stoppedOn])).toEqual([
      ['Gym', 39.99, TODAY],
    ]);
    expect(datesOf(november.stopped[0])).toEqual([]);
  });

  it('stopped today with its due today: counted paid before and after the sweep writes it', () => {
    const phoneRunning = bill('phone', {
      name: 'Phone',
      amount: 35.5,
      next_due_on: '2026-09-12',
      starts_on: '2026-09-12',
    });
    const phone = { ...phoneRunning, ...stopBillValues(phoneRunning, TODAY) };
    const earlier = charges({ bill: 'phone' }, ['2026-09-12'], 'Phone', 35.5);

    for (const recorded of [
      earlier,
      [...earlier, ...charges({ bill: 'phone' }, [TODAY], 'Phone', 35.5)],
    ]) {
      const october = view('bill', '2026-10', TODAY, { bills: [phone], charges: recorded });
      expect(summary(october)).toEqual({ total: 35.5, n: 1, p: 1, c: 0, next: null });
      expect(october.rows).toEqual([]);
      expect(datesOf(october.stopped[0])).toEqual(['2026-10-12 paid']);
    }
  });

  it('stopped on 10 Oct, before its due on the 11th: nothing after its end is filled', () => {
    const paper = bill('paper', {
      name: 'Paper',
      amount: 12.5,
      next_due_on: '2026-09-11',
      starts_on: '2026-09-11',
      ends_on: '2026-10-10',
    });
    const data = {
      bills: [paper],
      charges: charges({ bill: 'paper' }, ['2026-09-11'], 'Paper', 12.5),
    };
    const october = view('bill', '2026-10', TODAY, data);

    expect(summary(october)).toEqual({ total: 0, n: 0, p: 0, c: 0, next: null });
    expect(october.stopped.map((row) => [row.name, row.stoppedOn, row.occurrences])).toEqual([
      ['Paper', '2026-10-10', []],
    ]);
  });
});

describe('3. a weekly bill', () => {
  const walker = bill('walker', {
    name: 'Dog walker',
    amount: 60,
    recurrence: 'weekly',
    next_due_on: '2026-10-05',
    starts_on: '2026-09-07',
    bank_account_id: KOMAL,
  });
  const recorded = charges(
    { bill: 'walker' },
    ['2026-09-28', '2026-10-05', '2026-10-12'],
    'Dog walker',
    60,
    { account: KOMAL },
  );

  it('is one row and one bill, its amount the month sum, each date to come its own row', () => {
    const october = view('bill', '2026-10', TODAY, { bills: [walker], charges: recorded });

    expect(datesOf(october.rows[0])).toEqual([
      '2026-10-05 paid',
      '2026-10-12 paid',
      '2026-10-19',
      '2026-10-26',
    ]);
    expect(rowLines(october)).toEqual(['Dog walker 240 Next 2026-10-19']);
    expect(summary(october)).toEqual({
      total: 240,
      n: 1,
      p: 0,
      c: 1,
      next: 'Dog walker 2026-10-19',
    });
    expect(comingLines(october)).toEqual(['Dog walker 2026-10-19 60', 'Dog walker 2026-10-26 60']);
  });

  it('reads Paid only once every date in the month is on or before today', () => {
    const all = [...recorded, ...charges({ bill: 'walker' }, ['2026-10-19'], 'Dog walker', 60)];
    const october = view('bill', '2026-10', '2026-10-26', { bills: [walker], charges: all });

    expect(rowLines(october)).toEqual(['Dog walker 240 Paid']);
    expect(summary(october)).toEqual({ total: 240, n: 1, p: 1, c: 0, next: null });
  });
});

describe('4. a yearly or quarterly bill not due this month', () => {
  const registration = bill('rego', {
    name: 'Car registration',
    amount: 210.5,
    recurrence: 'yearly',
    next_due_on: '2027-03-03',
    starts_on: '2025-03-03',
  });
  const water = bill('water', {
    name: 'Water',
    amount: 88.17,
    recurrence: 'quarterly',
    next_due_on: '2026-08-15',
    starts_on: '2026-08-15',
  });
  const data: Data = {
    bills: [...DESIGN_BILLS.bills!, registration, water],
    charges: [
      ...DESIGN_BILL_CHARGES,
      ...charges({ bill: 'rego' }, ['2025-03-03', '2026-03-03'], 'Car registration', 210.5),
      ...charges({ bill: 'water' }, ['2026-08-15'], 'Water', 88.17),
    ],
  };

  it('is not in the figure or the count, and is listed after the due bills by its next date', () => {
    const october = view('bill', '2026-10', TODAY, data);

    expect(summary(october)).toEqual({ total: 1884, n: 4, p: 2, c: 2, next: 'AEP 2026-10-22' });
    expect(rowLines(october)).toEqual([
      'Ashword Hill Apartments 1035 Paid',
      'Nationwide 145 Paid',
      'AEP 150 Next 2026-10-22',
      'Car loan 554 Next 2026-10-28',
      'Water 88.17 Next 2026-11-15 (later)',
      'Car registration 210.5 Next 2027-03-03 (later)',
    ]);
    expect(october.rows[5].occurrences).toEqual([]);
  });

  it('counts in its own month', () => {
    const november = view('bill', '2026-11', TODAY, data);
    expect(summary(november)).toMatchObject({ total: 1972.17, n: 5, c: 5 });

    const march = view('bill', '2027-03', TODAY, data);
    expect(march.rows.find((row) => row.planId === 'rego')?.amount).toBe(210.5);
    expect(summary(march)).toMatchObject({ total: 2094.5, n: 5 });
  });
});

describe('4b. a plan on the 31st after a short month (anchor_day)', () => {
  const rent = (nextDueOn: string) =>
    bill('rent31', {
      name: 'Rent',
      amount: 1234.56,
      next_due_on: nextDueOn,
      starts_on: '2027-01-31',
      anchor_day: 31,
      created_at: '2027-01-10T12:00:00Z',
    });
  // Every due date from the start to May 2028, worked out by hand.
  const ALL_DUE = (
    '2027-01-31 2027-02-28 2027-03-31 2027-04-30 2027-05-31 2027-06-30 2027-07-31 2027-08-31 ' +
    '2027-09-30 2027-10-31 2027-11-30 2027-12-31 2028-01-31 2028-02-29 2028-03-31 2028-04-30 2028-05-31'
  ).split(' ');

  // Last swept on a shortened day, which the sweep does not roll past until the day after; opened
  // on the next due day before the sweep has run.
  it.each([
    { stored: '2027-02-28', today: '2027-03-31' },
    { stored: '2028-02-29', today: '2028-03-31' },
    { stored: '2028-04-30', today: '2028-05-31' },
  ])(
    'stored $stored, opened $today: fills $today, the date the recorder writes',
    ({ stored, today }) => {
      const plan = rent(stored);
      const swept = ALL_DUE.filter((date) => date <= stored);
      const data: Data = {
        bills: [plan],
        charges: charges({ bill: 'rent31' }, swept, 'Rent', 1234.56),
      };

      const owed = unrecordedDates(
        {
          id: 'rent31',
          recurrence: 'monthly',
          nextDate: plan.next_due_on,
          anchorDay: plan.anchor_day,
          startsOn: plan.starts_on,
          createdAt: plan.created_at,
        },
        today,
        new Set(swept),
      );
      expect(owed).toEqual([today]);

      const month = view('bill', today.slice(0, 7), today, data);
      expect(datesOf(month.rows[0])).toEqual([`${today} paid`]);
      expect(summary(month)).toEqual({ total: 1234.56, n: 1, p: 1, c: 0, next: null });
    },
  );

  it('names the next quarter on the 31st, not the stored 30th', () => {
    const quarterly = bill('insure', {
      name: 'Insurance',
      amount: 250,
      recurrence: 'quarterly',
      next_due_on: '2027-04-30',
      starts_on: '2027-01-31',
      anchor_day: 31,
      created_at: '2027-01-10T12:00:00Z',
    });
    const data: Data = {
      bills: [quarterly],
      charges: charges({ bill: 'insure' }, ['2027-01-31', '2027-04-30'], 'Insurance', 250),
    };
    expect(rowLines(view('bill', '2027-05', '2027-05-15', data))).toEqual([
      'Insurance 250 Next 2027-07-31 (later)',
    ]);
    expect(
      nextDueAfter(
        { anchor: '2027-04-30', recurrence: 'quarterly', anchorDay: 31, startsOn: '2027-01-31' },
        '2027-05-15',
      ),
    ).toBe('2027-07-31');
  });

  it('names a yearly 29 February renewal in a leap year, from a stored 28th', () => {
    const domain = subscription('domain', {
      name: 'Domain',
      amount: 12.34,
      cycle: 'yearly',
      next_renewal_on: '2031-02-28',
      started_on: '2028-02-29',
      anchor_day: 29,
      created_at: '2028-02-01T12:00:00Z',
    });
    const data: Data = {
      subscriptions: [domain],
      charges: charges(
        { subscription: 'domain' },
        ['2028-02-29', '2029-02-28', '2030-02-28', '2031-02-28'],
        'Domain',
        12.34,
      ),
    };
    expect(rowLines(view('subscription', '2031-03', '2031-03-01', data))).toEqual([
      'Domain 12.34 Next 2032-02-29 (later)',
    ]);
  });
});

describe('5. a cancelled subscription', () => {
  // Cancelled after its 9 Oct charge; the stored renewal date stays as it was.
  const hulu = subscription('hulu', {
    name: 'Hulu',
    amount: 7.99,
    next_renewal_on: '2026-11-09',
    started_on: '2026-09-09',
    active: false,
  });
  const neverCharged = subscription('trial', {
    name: 'Trial',
    amount: 4.99,
    next_renewal_on: '2026-10-20',
    active: false,
  });
  const data: Data = {
    subscriptions: [...DESIGN_SUBSCRIPTIONS.subscriptions!, hulu, neverCharged],
    charges: [
      ...DESIGN_SUBSCRIPTIONS.charges!,
      ...charges({ subscription: 'hulu' }, ['2026-09-09', '2026-10-09'], 'Hulu', 7.99),
    ],
  };

  it('counts its October charge as paid, listed under Cancelled, never in Coming up', () => {
    const october = view('subscription', '2026-10', TODAY, data);

    // 7.99 + 15.99 + 10 + 12.99 in floating point is 46.970000000000006.
    expect(summary(october)).toEqual({
      total: 46.97,
      n: 4,
      p: 3,
      c: 1,
      next: 'iCloud+ 2026-10-15',
    });
    expect(october.rows.map((row) => row.name)).toEqual(['Netflix', 'Spotify', 'iCloud+']);
    expect(october.stopped.map((row) => [row.name, row.amount, row.lastCharged])).toEqual([
      ['Hulu', 7.99, '2026-10-09'],
      ['Trial', 4.99, null],
    ]);
    expect(datesOf(october.stopped[0])).toEqual(['2026-10-09 paid']);
    expect(datesOf(october.stopped[1])).toEqual([]);
    expect(october.stopped[0].href).toEqual({
      pathname: '/subscription/[id]',
      params: { id: 'hulu' },
    });
    expect(october.stopped[0]).not.toHaveProperty('editHref');
    expect(comingLines(october)).toEqual(['iCloud+ 2026-10-15 12.99']);
  });

  it('is never projected, even on the renewal date it kept', () => {
    const november = view('subscription', '2026-11', '2026-11-09', data);

    expect(november.stopped.map((row) => [row.name, row.amount, row.lastCharged])).toEqual([
      ['Hulu', 7.99, '2026-10-09'],
      ['Trial', 4.99, null],
    ]);
    expect(november.stopped.every((row) => row.occurrences.length === 0)).toBe(true);
    expect(november.comingUp.some((o) => o.planId === 'hulu')).toBe(false);
    expect(summary(november)).toMatchObject({ total: 38.98, n: 3 });
  });
});

describe('6. a stopped loan', () => {
  const oldLoan = bill('old-loan', {
    name: 'Old car loan',
    amount: 300,
    category_id: 'loans',
    icon_id: 'loan-car',
    next_due_on: null,
    starts_on: '2026-05-20',
    ends_on: '2026-09-20',
    bank_account_id: KOMAL,
  });
  const data: Data = {
    bills: [oldLoan],
    charges: charges(
      { bill: 'old-loan' },
      ['2026-05-20', '2026-06-20', '2026-07-20', '2026-08-20', '2026-09-20'],
      'Old car loan',
      300,
      { account: KOMAL },
    ),
  };

  it('reads as a stopped bill that opens the loan', () => {
    const october = view('bill', '2026-10', TODAY, data);

    expect(summary(october)).toEqual({ total: 0, n: 0, p: 0, c: 0, next: null });
    expect(october.stopped.map((row) => [row.name, row.stoppedOn, row.lastCharged])).toEqual([
      ['Old car loan', '2026-09-20', '2026-09-20'],
    ]);
    expect(october.stopped[0].href).toEqual({ pathname: '/loan/[id]', params: { id: 'old-loan' } });
  });

  it('its last instalment still counts in its month', () => {
    const september = view('bill', '2026-09', TODAY, data);

    expect(summary(september)).toEqual({ total: 300, n: 1, p: 1, c: 0, next: null });
    expect(datesOf(september.stopped[0])).toEqual(['2026-09-20 paid']);
  });
});

describe('stopped is final: a stopped row only opens its page', () => {
  const gymCharged = bill('gym-charged', {
    name: 'Gym',
    amount: 39.99,
    next_due_on: '2026-11-01',
    starts_on: '2026-09-01',
    ends_on: TODAY,
  });
  const gymOld = bill('gym-old', {
    name: 'Old gym',
    amount: 25,
    next_due_on: '2026-09-03',
    starts_on: '2026-06-03',
    ends_on: '2026-08-31',
  });
  const loanCharged = bill('loan-charged', {
    name: 'Bike loan',
    amount: 120,
    category_id: 'loans',
    icon_id: 'loan-other',
    next_due_on: '2026-10-05',
    starts_on: '2026-07-05',
    ends_on: '2026-10-05',
  });
  const loanOld = bill('loan-old', {
    name: 'Old car loan',
    amount: 300,
    category_id: 'loans',
    next_due_on: null,
    starts_on: '2026-05-20',
    ends_on: '2026-09-20',
  });
  const huluCharged = subscription('hulu', {
    name: 'Hulu',
    amount: 7.99,
    next_renewal_on: '2026-11-09',
    started_on: '2026-09-09',
    active: false,
  });
  const oldSub = subscription('old-sub', {
    name: 'Old paper',
    amount: 4,
    next_renewal_on: '2026-09-02',
    started_on: '2026-07-02',
    active: false,
  });
  const neverCharged = subscription('trial', {
    name: 'Trial',
    amount: 4.99,
    next_renewal_on: '2026-10-20',
    active: false,
  });
  const data: Data = {
    bills: [gymCharged, gymOld, loanCharged, loanOld],
    subscriptions: [huluCharged, oldSub, neverCharged],
    charges: [
      ...charges({ bill: 'gym-charged' }, ['2026-09-01', '2026-10-01'], 'Gym', 39.99),
      ...charges({ bill: 'gym-old' }, ['2026-06-03', '2026-07-03', '2026-08-03'], 'Old gym', 25),
      ...charges({ bill: 'loan-charged' }, ['2026-09-05', '2026-10-05'], 'Bike loan', 120),
      ...charges({ bill: 'loan-old' }, ['2026-08-20', '2026-09-20'], 'Old car loan', 300),
      ...charges({ subscription: 'hulu' }, ['2026-09-09', '2026-10-09'], 'Hulu', 7.99),
      ...charges({ subscription: 'old-sub' }, ['2026-07-02', '2026-08-02'], 'Old paper', 4),
    ],
  };

  it('each one is stopped, with and without a charge in the month', () => {
    const bills = view('bill', '2026-10', TODAY, data);
    const subscriptions = view('subscription', '2026-10', TODAY, data);

    expect(bills.rows).toEqual([]);
    expect(subscriptions.rows).toEqual([]);
    expect(bills.stopped.map((row) => [row.planId, row.occurrences.length])).toEqual([
      ['gym-charged', 1],
      ['loan-charged', 1],
      ['loan-old', 0],
      ['gym-old', 0],
    ]);
    expect(subscriptions.stopped.map((row) => [row.planId, row.occurrences.length])).toEqual([
      ['hulu', 1],
      ['old-sub', 0],
      ['trial', 0],
    ]);
  });

  it('carries no edit link of any kind, and its href is its detail page', () => {
    const pages: Record<string, unknown> = {
      'gym-charged': { pathname: '/bill/[id]', params: { id: 'gym-charged' } },
      'gym-old': { pathname: '/bill/[id]', params: { id: 'gym-old' } },
      'loan-charged': { pathname: '/loan/[id]', params: { id: 'loan-charged' } },
      'loan-old': { pathname: '/loan/[id]', params: { id: 'loan-old' } },
      hulu: { pathname: '/subscription/[id]', params: { id: 'hulu' } },
      'old-sub': { pathname: '/subscription/[id]', params: { id: 'old-sub' } },
      trial: { pathname: '/subscription/[id]', params: { id: 'trial' } },
    };
    const stopped = (['2026-09', '2026-10', '2026-11'] as const).flatMap((month) => [
      ...view('bill', month, TODAY, data).stopped,
      ...view('subscription', month, TODAY, data).stopped,
    ]);

    expect(new Set(stopped.map((row) => row.planId))).toEqual(new Set(Object.keys(pages)));
    for (const row of stopped) {
      expect(Object.keys(row)).not.toContain('editHref');
      expect(JSON.stringify(row)).not.toContain('/add-');
      expect(row.href).toEqual(pages[row.planId]);
    }
  });
});

describe('7. a payoff', () => {
  const partial: LedgerPayoff = {
    id: 'extra',
    bill_id: 'car',
    paid_on: '2026-10-03',
    amount: 1000,
    kind: 'partial',
    card_id: null,
    bank_account_id: KOMAL,
    counted: true,
  };

  it('is in the ledger but never in the month figure, counts, rows or Coming up', () => {
    const data = { ...DESIGN_BILLS, payoffs: [partial] };

    expect(ledger('2026-10', TODAY, data).some((entry) => entry.payoff === 'partial')).toBe(true);
    const october = view('bill', '2026-10', TODAY, data);
    const plain = view('bill', '2026-10', TODAY, DESIGN_BILLS);
    expect(summary(october)).toEqual(summary(plain));
    expect(rowLines(october)).toEqual(rowLines(plain));
    expect(comingLines(october)).toEqual(comingLines(plain));
    expect(datesOf(october.rows.find((row) => row.planId === 'car'))).toEqual(['2026-10-28']);
  });

  it('a full payoff ends the loan: October keeps the bills still due and lists it stopped', () => {
    const full: LedgerPayoff = { ...partial, id: 'all', paid_on: '2026-10-10', kind: 'full' };
    const paidOff = { ...CAR_LOAN, ends_on: '2026-10-10' };
    const data: Data = {
      bills: [RENT, NATIONWIDE, AEP, paidOff],
      charges: DESIGN_BILL_CHARGES,
      payoffs: [full],
    };
    const october = view('bill', '2026-10', TODAY, data);

    expect(summary(october)).toEqual({ total: 1330, n: 3, p: 2, c: 1, next: 'AEP 2026-10-22' });
    expect(october.rows.map((row) => row.name)).toEqual([
      'Ashword Hill Apartments',
      'Nationwide',
      'AEP',
    ]);
    expect(october.stopped.map((row) => [row.name, row.stoppedOn])).toEqual([
      ['Car loan', '2026-10-10'],
    ]);
    expect(datesOf(october.stopped[0])).toEqual([]);
  });
});

describe('loan payoffs: due figure kept, extra said beside it', () => {
  function payoff(
    id: string,
    loan: string,
    on: string,
    amount: number,
    counted = true,
  ): LedgerPayoff {
    return {
      id,
      bill_id: loan,
      paid_on: on,
      amount,
      kind: 'partial',
      card_id: null,
      bank_account_id: KOMAL,
      counted,
    };
  }
  // Kept out of monthly bills: nothing due here, but a payoff made while it counted still went out.
  const BOAT = bill('boat', {
    name: 'Boat loan',
    amount: 410.25,
    category_id: 'loans',
    next_due_on: '2026-09-20',
    starts_on: '2026-09-20',
    in_spending: false,
  });
  const withPayoffs = (payoffs: LedgerPayoff[]): Data => ({
    bills: [...DESIGN_BILLS.bills!, BOAT],
    charges: DESIGN_BILL_CHARGES,
    payoffs,
  });

  it('counts only payoffs dated in the month, whatever window the entries cover', () => {
    const data = withPayoffs([
      payoff('p0', 'car', '2026-09-30', 700),
      payoff('p1', 'car', '2026-10-03', 1000),
      payoff('p2', 'car', '2026-11-01', 400),
    ]);
    const entries = ledgerEntries({
      receipts: [],
      subscriptions: [],
      bills: data.bills!,
      salaries: [],
      charges: data.charges!,
      pay: [],
      payoffs: data.payoffs!,
      accountOrder: [],
      from: '2026-09-01',
      to: '2026-11-30',
      today: TODAY,
    });
    const october = planMonth({
      kind: 'bill',
      month: '2026-10',
      today: TODAY,
      entries,
      bills: data.bills!,
      subscriptions: [],
      lastCharged: lastChargedBy(data.charges!),
    });

    expect(october.extras).toEqual({
      total: 1000,
      count: 1,
      loans: 1,
      name: 'Car loan',
      inAll: 2884,
    });
    expect(october.total).toBe(1884);
  });

  it('none in the month: null, on every view', () => {
    expect(view('bill', '2026-10', TODAY, DESIGN_BILLS).extras).toBeNull();
    expect(view('subscription', '2026-10', TODAY, DESIGN_SUBSCRIPTIONS).extras).toBeNull();
    expect(
      view('bill', '2026-09', TODAY, withPayoffs([payoff('p1', 'car', '2026-10-03', 1000)])).extras,
    ).toBeNull();
  });

  it('"+ $1,000.00 extra on Car loan · $2,884.00 in all", the due figure and counts unchanged', () => {
    const october = view(
      'bill',
      '2026-10',
      TODAY,
      withPayoffs([payoff('p1', 'car', '2026-10-03', 1000)]),
    );

    expect(october.extras).toEqual({
      total: 1000,
      count: 1,
      loans: 1,
      name: 'Car loan',
      inAll: 2884,
    });
    expect(summary(october)).toEqual({ total: 1884, n: 4, p: 2, c: 2, next: 'AEP 2026-10-22' });
    expect(comingLines(october)).toEqual(['AEP 2026-10-22 150', 'Car loan 2026-10-28 554']);
  });

  it('"+ $1,500.00 extra on 2 loans · $3,384.00 in all", one of them kept out of monthly bills', () => {
    const october = view(
      'bill',
      '2026-10',
      TODAY,
      withPayoffs([
        payoff('p1', 'car', '2026-10-03', 1000),
        payoff('p2', 'boat', '2026-10-20', 500),
      ]),
    );

    expect(october.extras).toEqual({ total: 1500, count: 2, loans: 2, name: null, inAll: 3384 });
    expect(october.total).toBe(1884);
    expect(october.rows.some((row) => row.planId === 'boat')).toBe(false);
  });

  it('two payoffs on one loan: one loan, named', () => {
    const october = view(
      'bill',
      '2026-10',
      TODAY,
      withPayoffs([
        payoff('p1', 'car', '2026-10-03', 1000),
        payoff('p2', 'car', '2026-10-20', 250.55),
      ]),
    );

    expect(october.extras).toEqual({
      total: 1250.55,
      count: 2,
      loans: 1,
      name: 'Car loan',
      inAll: 3134.55,
    });
  });

  it('a payoff made while its loan did not count is in no figure, as on Home', () => {
    const october = view(
      'bill',
      '2026-10',
      TODAY,
      withPayoffs([payoff('p2', 'boat', '2026-10-20', 500, false)]),
    );

    expect(october.extras).toBeNull();
  });

  it('a payoff in a month with nothing due: $0.00 due, the payoff in all', () => {
    // Paid off in full on 10 Jun, which ended the bill before its due on the 28th.
    const bike = bill('bike', {
      name: 'Bike loan',
      amount: 120.5,
      category_id: 'loans',
      next_due_on: '2026-01-28',
      starts_on: '2026-01-28',
      ends_on: '2026-06-10',
    });
    const june = view('bill', '2026-06', TODAY, {
      bills: [bike],
      charges: charges(
        { bill: 'bike' },
        ['2026-01-28', '2026-02-28', '2026-03-28', '2026-04-28', '2026-05-28'],
        'Bike loan',
        120.5,
      ),
      payoffs: [{ ...payoff('all', 'bike', '2026-06-10', 1543.21), kind: 'full' }],
    });

    expect(summary(june)).toEqual({ total: 0, n: 0, p: 0, c: 0, next: null });
    expect(june.extras).toEqual({
      total: 1543.21,
      count: 1,
      loans: 1,
      name: 'Bike loan',
      inAll: 1543.21,
    });
    expect(june.stopped.map((row) => row.planId)).toEqual(['bike']);
  });

  it('never on Subscriptions', () => {
    const entries = ledger(
      '2026-10',
      TODAY,
      withPayoffs([payoff('p1', 'car', '2026-10-03', 1000)]),
    );
    const subscriptions = planMonth({
      kind: 'subscription',
      month: '2026-10',
      today: TODAY,
      entries,
      bills: [...DESIGN_BILLS.bills!, BOAT],
      subscriptions: [],
      lastCharged: new Map(),
    });

    expect(entries.some((entry) => entry.payoff)).toBe(true);
    expect(subscriptions.extras).toBeNull();
  });
});

describe('8. no Paid with', () => {
  it('has no source on the row or its dates, and "Add a card" leads to the form the pencil opens', () => {
    const noCardLoan = { ...CAR_LOAN, card_id: null };
    const october = view('bill', '2026-10', TODAY, {
      bills: [RENT, NATIONWIDE, AEP, noCardLoan],
      charges: DESIGN_BILL_CHARGES,
    });
    const nationwide = october.rows.find((row) => row.planId === 'nationwide');
    const loan = october.rows.find((row) => row.planId === 'car');

    expect(nationwide?.sourceId).toBe('');
    expect(nationwide?.occurrences.map((o) => o.sourceId)).toEqual(['']);
    expect(nationwide?.editHref).toEqual({ pathname: '/add-bill', params: { id: 'nationwide' } });
    expect(loan?.sourceId).toBe('');
    expect(loan?.editHref).toEqual({ pathname: '/add-loan', params: { id: 'car' } });
    // The 28 Oct date is projected from the plan as it is now: no source.
    expect(october.comingUp.find((o) => o.planId === 'car')?.sourceId).toBe('');
    // The charge keeps the card it went out on, whatever the plan says now.
    expect(
      view('bill', '2026-09', TODAY, { bills: [noCardLoan], charges: DESIGN_BILL_CHARGES }).rows[0]
        .occurrences[0].sourceId,
    ).toBe(DISCOVER);

    const subscriptions = view('subscription', '2026-10', TODAY, DESIGN_SUBSCRIPTIONS);
    expect(subscriptions.rows[0].editHref).toEqual({
      pathname: '/add-subscription',
      params: { id: 'netflix' },
    });
  });
});

describe(`9. timezone and day boundary (TZ ${Intl.DateTimeFormat().resolvedOptions().timeZone})`, () => {
  // Weekly on Sundays: 25 Oct is France's clock change, 1 Nov the US's.
  const lawn = bill('lawn', {
    name: 'Lawn',
    amount: 25,
    recurrence: 'weekly',
    next_due_on: '2026-10-04',
    starts_on: '2026-10-04',
  });
  const data = { bills: [lawn] };

  it('steps a weekly bill across both clock changes on the same weekday', () => {
    expect(datesOf(view('bill', '2026-10', '2026-10-24', data).rows[0])).toEqual([
      '2026-10-04 paid',
      '2026-10-11 paid',
      '2026-10-18 paid',
      '2026-10-25',
    ]);
    expect(datesOf(view('bill', '2026-11', '2026-10-24', data).rows[0])).toEqual([
      '2026-11-01',
      '2026-11-08',
      '2026-11-15',
      '2026-11-22',
      '2026-11-29',
    ]);
  });

  it('a date of today is paid; at midnight the next one moves up', () => {
    const saturday = view('bill', '2026-10', '2026-10-24', data);
    expect(saturday.comingUp.map((o) => [o.date, daysUntil(o.date, '2026-10-24')])).toEqual([
      ['2026-10-25', 1],
    ]);

    const sunday = view('bill', '2026-10', '2026-10-25', data);
    expect(sunday.rows[0].status).toEqual({ kind: 'paid' });
    expect(summary(sunday)).toEqual({ total: 100, n: 1, p: 1, c: 0, next: null });

    const november = view('bill', '2026-11', '2026-10-31', data);
    expect(daysUntil(november.next!.date, '2026-10-31')).toBe(1);
  });

  it('counts whole days across every clock change', () => {
    expect(daysUntil('2026-10-26', '2026-10-24')).toBe(2);
    expect(daysUntil('2026-11-02', '2026-10-24')).toBe(9);
    expect(daysUntil('2026-03-09', '2026-03-07')).toBe(2);
    expect(daysUntil('2026-03-30', '2026-03-28')).toBe(2);
    expect(daysUntil('2026-04-05', '2026-04-04')).toBe(1);
    expect(daysUntil('2026-10-12', '2026-10-12')).toBe(0);
    expect(daysUntil('2026-10-11', '2026-10-12')).toBe(-1);
    expect(daysUntil('2027-01-01', '2026-12-31')).toBe(1);
  });

  it('a payment on 31 Dec is December, on 1 Jan the new year', () => {
    expect(monthOf('2026-12-31')).toBe('2026-12');
    expect(monthOf('2027-01-01')).toBe('2027-01');
  });
});

describe('11. an empty account', () => {
  it('no plans at all: nothing', () => {
    expect(view('bill', '2026-10', TODAY, {})).toEqual({
      month: '2026-10',
      when: 'current',
      total: 0,
      planCount: 0,
      paidCount: 0,
      comingCount: 0,
      next: null,
      comingUp: [],
      rows: [],
      stopped: [],
      extras: null,
    });
  });

  it('plans with nothing due in the month: $0.00, no Next, no Coming up, the plans still listed', () => {
    const yearly = bill('insurance', {
      name: 'Home insurance',
      amount: 940,
      recurrence: 'yearly',
      next_due_on: '2027-02-14',
      starts_on: '2026-02-14',
    });
    const october = view('bill', '2026-10', TODAY, { bills: [yearly] });

    expect(summary(october)).toEqual({ total: 0, n: 0, p: 0, c: 0, next: null });
    expect(october.comingUp).toEqual([]);
    expect(rowLines(october)).toEqual(['Home insurance 940 Next 2027-02-14 (later)']);
  });
});

describe('14. a loan kept out of monthly bills', () => {
  const boatRunning = bill('boat', {
    name: 'Boat loan',
    amount: 410.25,
    category_id: 'loans',
    next_due_on: '2026-09-20',
    starts_on: '2026-09-20',
    in_spending: false,
  });

  it('is not a bill here: no figure, no row, no Stopped, nothing filled on its due day', () => {
    const data = {
      bills: [boatRunning],
      charges: charges({ bill: 'boat' }, ['2026-09-20'], 'Boat loan', 410.25),
    };

    for (const today of [TODAY, '2026-10-20']) {
      const october = view('bill', '2026-10', today, data);
      expect(summary(october)).toEqual({ total: 0, n: 0, p: 0, c: 0, next: null });
      expect(october.rows).toEqual([]);
      expect(october.stopped).toEqual([]);
    }
    expect(
      view('bill', '2026-10', TODAY, { bills: [{ ...boatRunning, ends_on: '2026-10-01' }] })
        .stopped,
    ).toEqual([]);
  });

  it('what it was charged while it counted stays in that month, as history has it', () => {
    const data = {
      bills: [boatRunning],
      charges: charges({ bill: 'boat' }, ['2026-09-20', '2026-10-20'], 'Boat loan', 410.25),
    };

    for (const month of ['2026-09', '2026-10']) {
      const shown = view('bill', month, '2026-10-22', data);
      expect(summary(shown)).toEqual({ total: 410.25, n: 1, p: 1, c: 0, next: null });
      expect(rowLines(shown)).toEqual(['Boat loan 410.25 Paid']);
      expect(toCents(shown.total)).toBe(ledgerCents(month, '2026-10-22', 'bill', data));
    }
  });
});

describe('15. an amount changed mid-month', () => {
  it('past dates keep their recorded amount, later ones the new; the row and figure are the sum', () => {
    const walker = bill('walker', {
      name: 'Dog walker',
      amount: 16.19,
      recurrence: 'weekly',
      next_due_on: '2026-10-05',
      starts_on: '2026-09-28',
    });
    const october = view('bill', '2026-10', TODAY, {
      bills: [walker],
      charges: charges(
        { bill: 'walker' },
        ['2026-09-28', '2026-10-05', '2026-10-12'],
        'Dog walker',
        14.44,
      ),
    });

    expect(october.rows[0].occurrences.map((o) => o.amount)).toEqual([14.44, 14.44, 16.19, 16.19]);
    // 14.44 + 14.44 + 16.19 + 16.19 in floating point is 61.260000000000005.
    expect(october.rows[0].amount).toBe(61.26);
    expect(october.total).toBe(61.26);
    expect(comingLines(october)).toEqual([
      'Dog walker 2026-10-19 16.19',
      'Dog walker 2026-10-26 16.19',
    ]);
  });
});

describe('a running plan with no date left', () => {
  it('reads "Ends" with its end date in a month after its last due', () => {
    const lease = bill('lease', {
      name: 'Lease',
      amount: 500,
      next_due_on: '2026-10-05',
      starts_on: '2026-06-05',
      ends_on: '2026-10-30',
    });
    const november = view('bill', '2026-11', TODAY, { bills: [lease] });

    expect(rowLines(november)).toEqual(['Lease 500 Ends 2026-10-30']);
    expect(november.stopped).toEqual([]);
  });

  it('an active subscription with no renewal date stays listed, with no status date', () => {
    const unknown = subscription('unknown', { name: 'Unknown', amount: 3, next_renewal_on: null });
    const october = view('subscription', '2026-10', TODAY, { subscriptions: [unknown] });

    expect(rowLines(october)).toEqual(['Unknown 3 -']);
    expect(october.stopped).toEqual([]);
  });
});

describe('every fixture: counts agree with the figure', () => {
  it('p + c = n, and the figure is the sum of the rows and stopped rows due in the month', () => {
    const fixtures: [PlanKind, Data][] = [
      ['bill', DESIGN_BILLS],
      ['subscription', DESIGN_SUBSCRIPTIONS],
    ];
    for (const [kind, data] of fixtures) {
      for (const today of [TODAY, '2026-10-22', '2026-10-31']) {
        for (const month of ['2026-09', '2026-10', '2026-11']) {
          const shown = view(kind, month, today, data);
          expect(shown.paidCount + shown.comingCount).toBe(shown.planCount);
          const due = [...shown.rows, ...shown.stopped].filter((row) => row.occurrences.length > 0);
          expect(due).toHaveLength(shown.planCount);
          expect(due.reduce((sum, row) => sum + toCents(row.amount), 0)).toBe(toCents(shown.total));
          expect(shown.comingUp.every((o) => o.date > today && monthOf(o.date) === month)).toBe(
            true,
          );
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------------------------
// Month and date helpers.

describe('months', () => {
  it('monthBounds: whole months, leap years included', () => {
    expect(monthBounds('2026-02')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(monthBounds('2028-02')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
    expect(monthBounds('2026-10')).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(monthBounds('2026-12')).toEqual({ from: '2026-12-01', to: '2026-12-31' });
  });

  it('addMonths: across year ends, both ways', () => {
    expect(addMonths('2026-10', 3)).toBe('2027-01');
    expect(addMonths('2026-10', -10)).toBe('2025-12');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-10', 12)).toBe('2027-10');
    expect(addMonths('2026-10', 0)).toBe('2026-10');
  });

  it('monthChoices: the free floor month to 12 ahead, newest first', () => {
    const free = monthChoices(TODAY, '2026-07-15');
    expect(free[0]).toBe('2027-10');
    expect(free[free.length - 1]).toBe('2026-07');
    expect(free).toHaveLength(16);
    expect(free).toContain('2026-10');

    const pro = monthChoices(TODAY, '2020-01-01');
    expect(pro[0]).toBe('2027-10');
    expect(pro[pro.length - 1]).toBe('2020-01');
    expect(pro).toHaveLength(94);

    expect(monthChoices(TODAY, TODAY, 0)).toEqual(['2026-10']);
    expect(monthChoices('2026-01-05', '2025-12-20', 1)).toEqual(['2026-02', '2026-01', '2025-12']);
    // A malformed date offers nothing rather than spinning.
    expect(monthChoices('not-a-date', '2026-07-15')).toEqual([]);
  });
});

describe('nextDueAfter', () => {
  it('the first date after today, never today itself', () => {
    expect(nextDueAfter({ anchor: '2026-08-22', recurrence: 'monthly' }, '2026-10-12')).toBe(
      '2026-10-22',
    );
    expect(nextDueAfter({ anchor: '2026-08-22', recurrence: 'monthly' }, '2026-10-22')).toBe(
      '2026-11-22',
    );
    expect(nextDueAfter({ anchor: '2027-03-03', recurrence: 'yearly' }, '2026-10-12')).toBe(
      '2027-03-03',
    );
  });

  it('keeps the day of the month, clamped in short months', () => {
    expect(nextDueAfter({ anchor: '2026-01-31', recurrence: 'monthly' }, '2026-02-10')).toBe(
      '2026-02-28',
    );
    expect(nextDueAfter({ anchor: '2026-01-31', recurrence: 'monthly' }, '2026-02-28')).toBe(
      '2026-03-31',
    );
  });

  it('inside the plan window, or null', () => {
    const plan = { anchor: '2026-08-05', recurrence: 'monthly' as const };
    expect(nextDueAfter({ ...plan, endsOn: '2026-10-30' }, '2026-10-12')).toBe(null);
    expect(nextDueAfter({ ...plan, startsOn: '2027-01-01' }, '2026-10-12')).toBe('2027-01-05');
    expect(nextDueAfter({ anchor: null, recurrence: 'monthly' }, '2026-10-12')).toBe(null);
    expect(nextDueAfter({ anchor: '2026-11-01', recurrence: 'period' }, '2026-10-12')).toBe(
      '2026-11-01',
    );
    expect(nextDueAfter({ anchor: '2026-10-01', recurrence: 'period' }, '2026-10-12')).toBe(null);
  });
});

describe('lastChargedBy', () => {
  it('the newest charge of each plan, keyed as the ledger keys plans', () => {
    const newest = lastChargedBy([
      ...DESIGN_BILL_CHARGES,
      ...DESIGN_SUBSCRIPTIONS.charges!,
      {
        id: 'orphan',
        bill_id: null,
        subscription_id: null,
        label: 'x',
        amount: 1,
        charged_on: '2026-10-10',
        card_id: null,
        bank_account_id: null,
      },
    ]);

    expect(newest.get('bill-rent')).toBe('2026-10-01');
    expect(newest.get('bill-aep')).toBe('2026-09-22');
    expect(newest.get('subscription-icloud')).toBe('2026-09-15');
    expect(newest.has('aep')).toBe(false);
    expect(newest.size).toBe(7);
  });
});
