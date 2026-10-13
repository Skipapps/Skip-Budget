import type { ChargeRow } from '@/api/charges';
import { planLedger } from '@/api/payment-ledger';
import type { BillRow, LedgerPayoff, SubscriptionRow } from '@/api/queries';
import { lastChargedBy, monthBounds, planMonth, type PlanKind } from '@/lib/bill-month';
import { habitsSummary, movedThisMonth, nextDue, subscriptionCost } from '@/lib/insights-sections';
import { savingsSummary, type MoveRow, type PotRow } from '@/lib/savings';

/**
 * Next due, Moved this month and Coming up, seen on 12 Oct 2026. Next due reads the month views
 * the Monthly bills and Subscriptions pages draw, built here exactly as `usePlanMonth` builds them.
 */

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/providers/session-provider', () => ({ useUserId: () => null }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

const TODAY = '2026-10-12';
const CHECKING = 'acct-checking';

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
    card_id: null,
    bank_account_id: CHECKING,
    note: null,
    active: true,
    brands: null,
    ...fields,
  };
}

function charges(
  plan: { bill?: string; subscription?: string },
  amount: number,
  on: readonly string[],
): ChargeRow[] {
  return on.map((date) => ({
    id: `${plan.bill ?? plan.subscription}-${date}`,
    bill_id: plan.bill ?? null,
    subscription_id: plan.subscription ?? null,
    label: plan.bill ?? plan.subscription ?? '',
    amount,
    charged_on: date,
    card_id: null,
    bank_account_id: CHECKING,
  }));
}

const monthly = (day: number, last = 10) =>
  Array.from(
    { length: last },
    (_, index) => `2026-${String(index + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  );

type Plans = {
  bills: BillRow[];
  subscriptions: SubscriptionRow[];
  charges: ChargeRow[];
  payoffs?: LedgerPayoff[];
};

/** `usePlanMonth(kind, monthOf(today), today).view`, as the hook builds it. */
function view(plans: Plans, kind: PlanKind, today: string) {
  const month = today.slice(0, 7);
  const reads = { ...plans, payoffs: plans.payoffs ?? [] };
  return planMonth({
    kind,
    month,
    today,
    entries: planLedger(reads, monthBounds(month), today),
    bills: plans.bills,
    subscriptions: plans.subscriptions,
    lastCharged: lastChargedBy(plans.charges),
  });
}

function dues(plans: Plans, today = TODAY, count?: number) {
  return nextDue(
    {
      bills: view(plans, 'bill', today),
      subscriptions: view(plans, 'subscription', today),
      billRows: plans.bills,
      subscriptionRows: plans.subscriptions,
      today,
    },
    count,
  ).map((due) => [due.name, due.date, due.amount]);
}

const DESIGN: Plans = {
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
    ...charges({ bill: 'housing' }, 1500, monthly(1)),
    ...charges({ subscription: 'hulu' }, 99.99, monthly(11)),
  ],
};

describe('F11 next due', () => {
  it('lists the next two dues after today across bills and subscriptions, soonest first', () => {
    // Housing was paid on the 1st, so its next is 1 Nov, ahead of Netflix on the 9th.
    expect(dues(DESIGN)).toEqual([
      ['AEP', '2026-10-22', 150],
      ['Housing', '2026-11-01', 1500],
    ]);
    expect(dues(DESIGN, TODAY, 4)).toEqual([
      ['AEP', '2026-10-22', 150],
      ['Housing', '2026-11-01', 1500],
      ['Netflix', '2026-11-09', 15.99],
      ['Hulu', '2026-11-11', 99.99],
    ]);
  });

  it('gives each row its logo, its kind and its page', () => {
    const [aep] = nextDue({
      bills: view(DESIGN, 'bill', TODAY),
      subscriptions: view(DESIGN, 'subscription', TODAY),
      billRows: DESIGN.bills,
      subscriptionRows: DESIGN.subscriptions,
      today: TODAY,
    });
    expect(aep).toEqual({
      planId: 'aep',
      kind: 'bill',
      name: 'AEP',
      date: '2026-10-22',
      amount: 150,
      domain: null,
      logoHidden: false,
      categoryId: 'energy',
      iconId: null,
      href: { pathname: '/bill/[id]', params: { id: 'aep' } },
    });
  });

  it('reads a date due today as paid, and moves on to the next', () => {
    expect(dues(DESIGN, '2026-10-22')).toEqual([
      ['Housing', '2026-11-01', 1500],
      ['Netflix', '2026-11-09', 15.99],
    ]);
  });

  it('never offers a date that has come, even from views built the day before', () => {
    // Read at midnight: the views still say AEP is next on the 22nd, which is now today.
    const yesterday = '2026-10-21';
    const found = nextDue(
      {
        bills: view(DESIGN, 'bill', yesterday),
        subscriptions: view(DESIGN, 'subscription', yesterday),
        billRows: DESIGN.bills,
        subscriptionRows: DESIGN.subscriptions,
        today: '2026-10-22',
      },
      1,
    );
    expect(found.map((due) => [due.name, due.date])).toEqual([['Housing', '2026-11-01']]);
  });

  it('walks a plan paid this month to its next date, however far: a yearly one a year on', () => {
    const plans: Plans = {
      bills: [],
      subscriptions: [
        subscription('domain', {
          name: 'Domain',
          amount: 19.99,
          cycle: 'yearly',
          next_renewal_on: '2027-10-03',
          started_on: '2025-10-03',
        }),
      ],
      charges: charges({ subscription: 'domain' }, 19.99, ['2025-10-03', '2026-10-03']),
    };
    expect(dues(plans)).toEqual([['Domain', '2027-10-03', 19.99]]);
  });

  it('takes a weekly bill’s next date in the month at that date’s amount', () => {
    const plans: Plans = {
      bills: [
        bill('cleaner', {
          name: 'Cleaner',
          amount: 85,
          recurrence: 'weekly',
          next_due_on: '2026-10-16',
          starts_on: '2026-09-04',
        }),
      ],
      subscriptions: [],
      charges: charges({ bill: 'cleaner' }, 80, ['2026-10-02', '2026-10-09']),
    };
    // Recorded at $80; the plan now charges $85. One row per plan: its next date only.
    expect(dues(plans, TODAY, 3)).toEqual([['Cleaner', '2026-10-16', 85]]);
  });

  it('puts two dues on the same day in name order', () => {
    const plans: Plans = {
      bills: [
        bill('water', {
          name: 'Water',
          amount: 40,
          next_due_on: '2026-10-20',
          starts_on: '2026-10-20',
        }),
        bill('internet', {
          name: 'Internet',
          amount: 60,
          next_due_on: '2026-10-20',
          starts_on: '2026-10-20',
        }),
      ],
      subscriptions: [],
      charges: [],
    };
    expect(dues(plans)).toEqual([
      ['Internet', '2026-10-20', 60],
      ['Water', '2026-10-20', 40],
    ]);
  });

  it('leaves out a loan kept out of monthly bills, and keeps one that counts, opening the loan', () => {
    const plans: Plans = {
      bills: [
        bill('car', {
          name: 'Car loan',
          amount: 424.8,
          category_id: 'loans',
          icon_id: 'loan-car',
          next_due_on: '2026-11-03',
          starts_on: '2026-01-03',
        }),
        bill('boat', {
          name: 'Boat loan',
          amount: 300,
          category_id: 'loans',
          next_due_on: '2026-11-05',
          starts_on: '2026-01-05',
          in_spending: false,
        }),
      ],
      subscriptions: [],
      // The boat loan's October charge was recorded before it was taken out of monthly bills.
      charges: [
        ...charges({ bill: 'car' }, 424.8, monthly(3)),
        ...charges({ bill: 'boat' }, 300, ['2026-10-05']),
      ],
    };
    const found = nextDue(
      {
        bills: view(plans, 'bill', TODAY),
        subscriptions: view(plans, 'subscription', TODAY),
        billRows: plans.bills,
        subscriptionRows: [],
        today: TODAY,
      },
      5,
    );
    expect(found.map((due) => [due.name, due.date, due.amount, due.href])).toEqual([
      ['Car loan', '2026-11-03', 424.8, { pathname: '/loan/[id]', params: { id: 'car' } }],
    ]);
  });

  it('never lists a stopped bill or a cancelled subscription', () => {
    const plans: Plans = {
      bills: [
        bill('gym', {
          name: 'Gym',
          amount: 30,
          next_due_on: '2026-11-02',
          starts_on: '2026-01-02',
          ends_on: '2026-10-02',
        }),
      ],
      subscriptions: [
        subscription('tv', {
          name: 'TV',
          amount: 12,
          next_renewal_on: '2026-10-20',
          started_on: '2026-01-20',
          active: false,
        }),
      ],
      charges: [
        ...charges({ bill: 'gym' }, 30, monthly(2)),
        ...charges({ subscription: 'tv' }, 12, monthly(20, 9)),
      ],
    };
    expect(dues(plans, TODAY, 5)).toEqual([]);
  });

  it('is empty with no plans', () => {
    expect(dues({ bills: [], subscriptions: [], charges: [] })).toEqual([]);
  });
});

function pot(id: string, fields: Partial<PotRow>): PotRow {
  return {
    id,
    kind: 'month',
    month: null,
    label: null,
    earned: null,
    spent: null,
    amount: 0,
    added_on: '2026-01-01',
    note: null,
    wrap_up_seen_at: null,
    removed_at: null,
    created_at: '2026-01-01T09:00:00Z',
    ...fields,
  };
}

const POTS: PotRow[] = [
  pot('jul', {
    month: '2026-07-01',
    earned: 10_000,
    spent: 8000,
    amount: 2000,
    added_on: '2026-08-01',
  }),
  pot('aug', {
    month: '2026-08-01',
    earned: 10_000,
    spent: 9300,
    amount: 700,
    added_on: '2026-09-01',
  }),
  pot('sep', {
    month: '2026-09-01',
    earned: 10_000,
    spent: 9500,
    amount: 500,
    added_on: '2026-10-01',
  }),
];

describe('F13 savings', () => {
  it('reads the design: $500.00 moved this month, 5% of $10,000.00, and $3,200.00 in savings', () => {
    const summary = savingsSummary({ pots: POTS, moves: [] });
    expect(summary.readyToUse).toBe(3200);
    expect(movedThisMonth(summary.pots, 10_000, TODAY)).toEqual({
      moved: 500,
      incomeShare: 5,
      belowOnePercent: false,
    });
  });

  it('adds money put in savings with a date this month, and nothing dated last month', () => {
    const pots = [
      ...POTS,
      pot('gift', { kind: 'added', label: 'Birthday', amount: 120.45, added_on: '2026-10-05' }),
      pot('late', { kind: 'added', label: 'Refund', amount: 60, added_on: '2026-09-30' }),
    ];
    const summary = savingsSummary({ pots, moves: [] });
    expect(movedThisMonth(summary.pots, 10_000, TODAY)).toEqual({
      moved: 620.45,
      incomeShare: 6,
      belowOnePercent: false,
    });
  });

  it('counts a pot in full after some of it went to a goal', () => {
    const moves: MoveRow[] = [
      {
        id: 'm1',
        goal_id: 'trip',
        amount: 300,
        pot_id: 'sep',
        batch_id: null,
        created_at: '2026-10-03T10:00:00Z',
      },
    ];
    const summary = savingsSummary({ pots: POTS, moves });
    expect(summary.readyToUse).toBe(2900);
    expect(movedThisMonth(summary.pots, 10_000, TODAY).moved).toBe(500);
  });

  it('counts nothing for an overspent month or a removed pot', () => {
    const pots = [
      ...POTS.filter((each) => each.id !== 'sep'),
      pot('sep', {
        month: '2026-09-01',
        earned: 9000,
        spent: 9400,
        amount: 0,
        added_on: '2026-10-01',
      }),
      pot('gone', {
        kind: 'added',
        label: 'Oops',
        amount: 50,
        added_on: '2026-10-04',
        removed_at: '2026-10-04T12:00:00Z',
      }),
    ];
    const summary = savingsSummary({ pots, moves: [] });
    expect(movedThisMonth(summary.pots, 10_000, TODAY)).toEqual({
      moved: 0,
      incomeShare: 0,
      belowOnePercent: false,
    });
  });

  it('reads a pot below zero as holding nothing, as Savings does', () => {
    const pots = [
      pot('sep', { month: '2026-09-01', amount: 500, added_on: '2026-10-01' }),
      pot('odd', { kind: 'added', label: 'Fix', amount: -80, added_on: '2026-10-03' }),
    ];
    const summary = savingsSummary({ pots, moves: [] });
    expect(summary.readyToUse).toBe(500);
    expect(movedThisMonth(summary.pots, 10_000, TODAY).moved).toBe(500);
  });

  it('hides the share with no income, and reads an amount stored as text', () => {
    const pots = [
      pot('sep', {
        month: '2026-09-01',
        amount: '500.10' as unknown as number,
        added_on: '2026-10-01',
      }),
    ];
    const summary = savingsSummary({ pots, moves: [] });
    expect(movedThisMonth(summary.pots, 0, TODAY)).toEqual({
      moved: 500.1,
      incomeShare: null,
      belowOnePercent: false,
    });
  });

  it('flags money moved that rounds to 0% of income but is not nothing', () => {
    const shareOf = (amount: number) => {
      const pots = [pot('sep', { month: '2026-09-01', amount, added_on: '2026-10-01' })];
      const moved = movedThisMonth(savingsSummary({ pots, moves: [] }).pots, 10_000, TODAY);
      return [amount, moved.incomeShare, moved.belowOnePercent];
    };
    expect([0.01, 49.99, 50, 0].map(shareOf)).toEqual([
      [0.01, 0, true],
      [49.99, 0, true],
      // 0.5% rounds half up.
      [50, 1, false],
      [0, 0, false],
    ]);
  });

  it('counts September’s wrap-up on 1 Oct, and none of it on 1 Nov', () => {
    const summary = savingsSummary({ pots: POTS, moves: [] });
    expect(movedThisMonth(summary.pots, 10_000, '2026-10-01').moved).toBe(500);
    expect(movedThisMonth(summary.pots, 10_000, '2026-11-01').moved).toBe(0);
  });
});

describe('F15 Coming up: subscriptions by billing cycle', () => {
  const sub = (
    amount: number,
    cycle: SubscriptionRow['cycle'],
    active = true,
    next: string | null = '2026-11-01',
  ) => ({ amount, cycle, active, next_renewal_on: next });

  it('reads the design: $115.98 a month, $1,391.76 over a year', () => {
    expect(subscriptionCost(DESIGN.subscriptions)).toEqual({
      perMonth: 115.98,
      perYear: 1391.76,
      count: 2,
    });
  });

  it('reads a $120 yearly plan as $10.00 a month, not $120', () => {
    expect(subscriptionCost([sub(120, 'yearly')])).toEqual({
      perMonth: 10,
      perYear: 120,
      count: 1,
    });
  });

  it('counts a year as 52 weeks, 12 months or 4 quarters', () => {
    expect(subscriptionCost([sub(10, 'weekly')])).toEqual({
      perMonth: 43.33,
      perYear: 520,
      count: 1,
    });
    expect(subscriptionCost([sub(30, 'quarterly')])).toEqual({
      perMonth: 10,
      perYear: 120,
      count: 1,
    });
    // $2.99 × 52 = $155.48; ÷ 12 = $12.9566…
    expect(subscriptionCost([sub(2.99, 'weekly')])).toEqual({
      perMonth: 12.96,
      perYear: 155.48,
      count: 1,
    });
  });

  it('rounds the month once, on the year’s total, half up', () => {
    // Each is $4.333… a month: rounded one by one they would be $8.66.
    expect(subscriptionCost([sub(1, 'weekly'), sub(1, 'weekly')]).perMonth).toBe(8.67);
    expect(subscriptionCost([sub(0.06, 'yearly')]).perMonth).toBe(0.01);
    expect(subscriptionCost([sub(0.05, 'yearly')]).perMonth).toBe(0);
  });

  it('leaves out cancelled plans, and adds a mix to the cent', () => {
    const mix = [
      sub(2.99, 'weekly'),
      sub(9.99, 'monthly'),
      sub(29.97, 'quarterly'),
      sub(119.88, 'yearly'),
      sub(500, 'monthly', false),
    ];
    // 155.48 + 119.88 + 119.88 + 119.88 = 515.12 a year; ÷ 12 = 42.9266…
    expect(subscriptionCost(mix)).toEqual({ perMonth: 42.93, perYear: 515.12, count: 4 });
    expect(subscriptionCost([])).toEqual({ perMonth: 0, perYear: 0, count: 0 });
  });

  it('leaves out an active plan with no next date, which the ledger never charges', () => {
    expect(subscriptionCost([sub(9.99, 'monthly'), sub(120, 'yearly', true, null)])).toEqual({
      perMonth: 9.99,
      perYear: 119.88,
      count: 1,
    });
  });

  it('reads an amount stored as text, and a cycle it has no word for as monthly', () => {
    const odd = [
      {
        amount: '15.99' as unknown as number,
        cycle: 'monthly' as const,
        active: true,
        next_renewal_on: '2026-11-01',
      },
      {
        amount: 5,
        cycle: 'biweekly' as unknown as SubscriptionRow['cycle'],
        active: true,
        next_renewal_on: '2026-11-01',
      },
    ];
    expect(subscriptionCost(odd)).toEqual({ perMonth: 20.99, perYear: 251.88, count: 2 });
  });
});

describe('habitsSummary', () => {
  // Hand-counted. Today is Tuesday 13 Oct 2026; the week began on Monday the 12th.
  const TODAY = '2026-10-13';
  const coffee = {
    id: 'coffee',
    price: 4.35,
    started_on: '2026-10-05',
    saved_from: '2026-10-07',
    archived_at: null,
  };
  // Stopped with Keep past days at 10 pm on Friday 9 Oct, its days kept.
  const delivery = {
    id: 'delivery',
    price: 23.99,
    started_on: '2026-09-21',
    saved_from: '2026-09-21',
    archived_at: new Date(2026, 9, 9, 22, 0).toISOString(),
  };
  const taps = [
    { habitId: 'coffee', day: '2026-10-08', amount: 4.35, receiptId: 'c-8' },
    { habitId: 'coffee', day: '2026-10-12', amount: 4.35, receiptId: 'c-12' },
    { habitId: 'delivery', day: '2026-09-25', amount: 23.99, receiptId: 'd-25' },
    { habitId: 'delivery', day: '2026-10-02', amount: 31.5, receiptId: 'd-2' },
    // On the stop day, before the stop: spent, never saved.
    { habitId: 'delivery', day: '2026-10-09', amount: 23.99, receiptId: 'd-9' },
  ];

  it('adds a stopped habit’s saving until the day before it stopped to Saved so far only', () => {
    // Coffee: 7 to 12 Oct is 6 days, the 8th and the 12th bought: 4 x $4.35 = $17.40. This week
    // only the 12th has ended, and it was bought.
    // Food delivery: 21 Sep to 8 Oct is 18 days, the 25th and the 2nd bought: 16 x $23.99 = $383.84.
    const summary = habitsSummary([coffee], [delivery], taps, TODAY);
    expect(summary.rows).toEqual([{ habit: coffee, skipped: 0, saved: 0 }]);
    expect(summary.count).toBe(1);
    expect(summary.savedSoFar).toBe(401.24);
    // The same on any later day: the stopped habit's part never grows.
    expect(habitsSummary([], [delivery], taps, '2027-06-30').savedSoFar).toBe(383.84);
    expect(habitsSummary([], [delivery], taps, '2026-10-09').savedSoFar).toBe(383.84);
  });
});
