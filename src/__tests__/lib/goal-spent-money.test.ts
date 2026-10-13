import { goalsSummary, type GoalRow } from '@/lib/goals';
import { heroFigures, spendSummary, type SpendEntry } from '@/lib/insights';
import { moneyBook, type BookIncome, type BookSource, type BookSpend } from '@/lib/money-book';
import {
  monthTotals,
  movesToSavingsOn,
  paidFromGoals,
  savingsFlows,
  savingsSummary,
  type GoalPurchase,
  type MoveRow,
  type PotRow,
} from '@/lib/savings';

/**
 * "I spent it" counts the money once, on Savings, Home's Current balance and Insights alike.
 *
 * Hand-checked fixture, today 20 Oct 2026, account made 14 Jul 2026:
 *   Pots       August 520.00 + September 640.00                                  = 1,160.00
 *   New TV     150.00 put by before Skip + 300.00 (Sep) + 212.47 (Aug)            =   662.47
 *              of which from savings 300.00 + 212.47                              =   512.47
 *   Trip       80.00 (Sep)
 *   Ready      1,160.00 − 512.47 − 80.00                                          =   567.53
 *   October    pay 3,700.00 (15th, into Chase); rent 1,500.00 (1st, Chase);
 *              groceries 84.16 (3rd, Visa); coffee 4.75 (6th, Skip)
 *              spent 1,500.00 + 84.16 + 4.75 = 1,588.91; left over 3,700.00 − 1,588.91 = 2,111.09
 *   Balances   Chase 2,000.00 and Visa 0.00 owed, both typed 1 Oct
 *              Current balance (2,000.00 + 3,700.00 − 1,500.00) − 84.16 − 4.75    = 4,111.09
 *   The TV     bought 18 Oct on the Visa for what New TV held, 662.47
 *
 * With its receipt filed in the same step, the TV leaves Current balance once (4,111.09 − 662.47 =
 * 3,448.62), Insights' spending once (1,588.91 + 662.47 = 2,251.38), and savings once: the 512.47
 * that went to New TV stays out, and October still leaves 2,111.09 over, so 1 November brings Ready
 * to use to 567.53 + 2,111.09 = 2,678.62.
 */

const TODAY = '2026-10-20';
const ACCOUNT_DAY = '2026-07-14';

const cents = (value: number) => Math.round(value * 100);

const pot = (id: string, month: string, earned: number, spent: number, amount: number): PotRow => ({
  id,
  kind: 'month',
  month,
  label: null,
  earned,
  spent,
  amount,
  added_on: movesToSavingsOn(month),
  note: null,
  wrap_up_seen_at: null,
  removed_at: null,
  created_at: '2026-09-01T09:00:00Z',
});

const POTS: PotRow[] = [
  pot('aug', '2026-08-01', 3700, 3180, 520),
  pot('sep', '2026-09-01', 3700, 3060, 640),
];

const move = (id: string, goalId: string, potId: string, amount: number): MoveRow => ({
  id,
  goal_id: goalId,
  pot_id: potId,
  amount,
  batch_id: `batch-${id}`,
  created_at: '2026-10-02T12:00:00Z',
});

const MOVES: MoveRow[] = [
  move('m1', 'tv', 'sep', 300),
  move('m2', 'tv', 'aug', 212.47),
  move('m3', 'trip', 'sep', 80),
];

const goal = (id: string, name: string, target: number, start: number, closed = false) =>
  ({
    id,
    name,
    icon_id: 'other',
    target,
    target_date: null,
    start_amount: start,
    created_at: '2026-09-20T09:00:00Z',
    closed_at: closed ? '2026-10-18T15:00:00Z' : null,
  }) satisfies GoalRow;

const SOURCES: BookSource[] = [
  { id: 'chase', kind: 'account', name: 'Chase', balance: 2000, asOf: '2026-10-01' },
  { id: 'visa', kind: 'card', name: 'Visa', balance: 0, asOf: '2026-10-01' },
];

const spend = (
  id: string,
  kind: BookSpend['kind'],
  date: string,
  amount: number,
  sourceId: string,
): BookSpend => ({ id, label: id, date, amount: -amount, kind, sourceId });

const OCTOBER: BookSpend[] = [
  spend('bill-rent-2026-10-01', 'bill', '2026-10-01', 1500, 'chase'),
  spend('receipt-groceries', 'receipt', '2026-10-03', 84.16, 'visa'),
  spend('receipt-coffee', 'receipt', '2026-10-06', 4.75, ''),
];

const PAY: BookIncome[] = [
  { id: 'pay-oct', label: 'Salary', date: '2026-10-15', amount: 3700, accountId: 'chase' },
];

/** The TV's receipt as `spend_goal` files it: what New TV held, on the Visa. */
const TV_RECEIPT = spend('receipt-tv', 'receipt', '2026-10-18', 662.47, 'visa');

/** goals.receipt_id: New TV names the TV's receipt. */
const TV_PURCHASE: GoalPurchase = { goal_id: 'tv', receipt_id: 'tv', start_amount: 150 };

/** Every figure the three places show, from the same rows. */
function figures(args: {
  spending: readonly BookSpend[];
  goals: readonly GoalRow[];
  purchases: readonly GoalPurchase[];
}) {
  const ledger: SpendEntry[] = [
    ...args.spending,
    ...PAY.map((pay) => ({ amount: pay.amount, date: pay.date, kind: 'income' as const })),
  ];
  const flows = savingsFlows(
    [...args.spending, ...PAY.map((pay) => ({ ...pay, kind: 'income' }))],
    paidFromGoals(args.purchases, MOVES),
  );
  const october = monthTotals({
    month: '2026-10',
    today: TODAY,
    accountCreatedOn: ACCOUNT_DAY,
    ...flows,
  });
  // What closing October on 1 November moves: greatest(earned − spent, 0).
  const closed = pot(
    'oct',
    '2026-10-01',
    october.earned,
    october.spent,
    Math.max(0, october.leftOver),
  );
  const hero = heroFigures(ledger, TODAY);
  return {
    readyToUse: savingsSummary({ pots: POTS, moves: MOVES }).readyToUse,
    goalsSaved: goalsSummary(args.goals, MOVES, TODAY).saved,
    october,
    readyAfterNovember1: savingsSummary({ pots: [...POTS, closed], moves: MOVES }).readyToUse,
    currentBalance: moneyBook({
      today: TODAY,
      sources: SOURCES,
      spending: args.spending,
      payments: [],
      income: PAY,
    }).current.balance,
    insights: {
      out: hero.out,
      left: hero.left,
      receipts: spendSummary(ledger, { from: '2026-10-01', to: TODAY }).receipts,
    },
  };
}

const OPEN = [goal('tv', 'New TV', 1000, 150), goal('trip', 'Trip', 1200, 0)];
const SPENT = [goal('tv', 'New TV', 1000, 150, true), goal('trip', 'Trip', 1200, 0)];

describe('before anything is spent', () => {
  it('reads the fixture as hand-checked', () => {
    expect(figures({ spending: OCTOBER, goals: OPEN, purchases: [] })).toEqual({
      readyToUse: 567.53,
      goalsSaved: 742.47,
      october: { earned: 3700, spent: 1588.91, leftOver: 2111.09 },
      readyAfterNovember1: 2678.62,
      currentBalance: 4111.09,
      insights: { out: 1588.91, left: 2111.09, receipts: 88.91 },
    });
  });
});

describe('"I spent it" with the receipt filed in the same step', () => {
  const after = figures({
    spending: [...OCTOBER, TV_RECEIPT],
    goals: SPENT,
    purchases: [TV_PURCHASE],
  });

  it('takes the TV off Current balance once', () => {
    expect(after.currentBalance).toBe(3448.62);
  });

  it('adds it to Insights spending once', () => {
    expect(after.insights).toEqual({ out: 2251.38, left: 1448.62, receipts: 751.38 });
  });

  it('takes it out of savings once: the goal’s money stays out, and October still leaves 2,111.09', () => {
    expect(after.readyToUse).toBe(567.53);
    expect(after.goalsSaved).toBe(80);
    expect(after.october).toEqual({ earned: 3700, spent: 1588.91, leftOver: 2111.09 });
    expect(after.readyAfterNovember1).toBe(2678.62);
  });

  it('moves each figure by the receipt, or not at all, to the cent', () => {
    const before = figures({ spending: OCTOBER, goals: OPEN, purchases: [] });
    expect(cents(before.currentBalance) - cents(after.currentBalance)).toBe(66247);
    expect(cents(after.insights.out) - cents(before.insights.out)).toBe(66247);
    expect(cents(after.readyAfterNovember1) - cents(before.readyAfterNovember1)).toBe(0);
    // Savings held for the person: Ready to use plus what open goals took from savings.
    expect(cents(before.readyToUse) + 51247 + 8000).toBe(116000);
    expect(cents(after.readyToUse) + 8000).toBe(116000 - 51247);
  });
});

describe('"I spent it" with no receipt ("Just remove it")', () => {
  const after = figures({ spending: OCTOBER, goals: SPENT, purchases: [] });

  it('takes it out of savings once, and leaves Current balance and Insights as they were', () => {
    expect(after).toEqual({
      readyToUse: 567.53,
      goalsSaved: 80,
      october: { earned: 3700, spent: 1588.91, leftOver: 2111.09 },
      readyAfterNovember1: 2678.62,
      currentBalance: 4111.09,
      insights: { out: 1588.91, left: 2111.09, receipts: 88.91 },
    });
  });
});

describe('the double count this step prevents', () => {
  it('a receipt for the same purchase, added on its own, still takes it from savings again', () => {
    const twice = figures({ spending: [...OCTOBER, TV_RECEIPT], goals: SPENT, purchases: [] });
    expect(twice.october).toEqual({ earned: 3700, spent: 2251.38, leftOver: 1448.62 });
    expect(twice.readyAfterNovember1).toBe(2016.15);
    expect(cents(2678.62) - cents(twice.readyAfterNovember1)).toBe(66247);
  });
});

describe('a goal’s receipt edited later', () => {
  const october = (amount: number) =>
    figures({
      spending: [...OCTOBER, spend('receipt-tv', 'receipt', '2026-10-18', amount, 'visa')],
      goals: SPENT,
      purchases: [TV_PURCHASE],
    }).october;

  it('counts only what it cost beyond the goal against October', () => {
    // 700.00 − 662.47 = 37.53 came from October's own money.
    expect(october(700)).toEqual({ earned: 3700, spent: 1626.44, leftOver: 2073.56 });
  });

  it('counts nothing against October when it cost less than the goal held', () => {
    expect(october(600)).toEqual({ earned: 3700, spent: 1588.91, leftOver: 2111.09 });
  });

  it('counts in full once it no longer names the goal (receipt deleted and filed again)', () => {
    expect(
      figures({
        spending: [...OCTOBER, spend('receipt-other', 'receipt', '2026-10-18', 662.47, 'visa')],
        goals: SPENT,
        purchases: [TV_PURCHASE],
      }).october.spent,
    ).toBe(2251.38);
  });
});

describe('paidFromGoals', () => {
  it('is the goal’s own figure: what it started with plus every move, in cents', () => {
    expect(paidFromGoals([TV_PURCHASE], MOVES)).toEqual(new Map([['receipt-tv', 662.47]]));
  });

  it('never pays below zero', () => {
    const paid = paidFromGoals(
      [{ goal_id: 'odd', receipt_id: 'r9', start_amount: 0 }],
      [move('x', 'odd', 'sep', -5)],
    );
    expect(paid).toEqual(new Map([['receipt-r9', 0]]));
  });

  it('reads amounts that arrive as text', () => {
    const paid = paidFromGoals(
      [{ goal_id: 'tv', receipt_id: 'tv', start_amount: '150.00' as unknown as number }],
      MOVES.map((row) => ({ ...row, amount: String(row.amount) as unknown as number })),
    );
    expect(paid.get('receipt-tv')).toBe(662.47);
  });
});

describe('two goals spent in one month', () => {
  // Trip is spent too: 80.00 at IKEA on 19 Oct from Chase, its receipt named by Trip.
  const BOTH = [goal('tv', 'New TV', 1000, 150, true), goal('trip', 'Trip', 1200, 0, true)];
  const TRIP_PURCHASE: GoalPurchase = { goal_id: 'trip', receipt_id: 'ikea', start_amount: 0 };
  const ikea = (amount: number) => spend('receipt-ikea', 'receipt', '2026-10-19', amount, 'chase');

  it('leaves both out of October, and takes each off Current balance and onto Insights once', () => {
    const after = figures({
      spending: [...OCTOBER, TV_RECEIPT, ikea(80)],
      goals: BOTH,
      purchases: [TV_PURCHASE, TRIP_PURCHASE],
    });
    expect(after).toEqual({
      readyToUse: 567.53,
      goalsSaved: 0,
      october: { earned: 3700, spent: 1588.91, leftOver: 2111.09 },
      readyAfterNovember1: 2678.62,
      // 4,111.09 − 662.47 − 80.00
      currentBalance: 3368.62,
      // 1,588.91 + 662.47 + 80.00
      insights: { out: 2331.38, left: 1368.62, receipts: 831.38 },
    });
  });

  it('counts what each cost beyond its own goal, and no more', () => {
    const october = figures({
      spending: [...OCTOBER, spend('receipt-tv', 'receipt', '2026-10-18', 700, 'visa'), ikea(100)],
      goals: BOTH,
      purchases: [TV_PURCHASE, TRIP_PURCHASE],
    }).october;
    // 1,588.91 + (700.00 − 662.47) + (100.00 − 80.00)
    expect(october).toEqual({ earned: 3700, spent: 1646.44, leftOver: 2053.56 });
  });

  it('pays each receipt from its own goal only', () => {
    expect(paidFromGoals([TV_PURCHASE, TRIP_PURCHASE], MOVES)).toEqual(
      new Map([
        ['receipt-tv', 662.47],
        ['receipt-ikea', 80],
      ]),
    );
  });
});

describe('"I already added it": a receipt on the record named by the goal', () => {
  // Best Buy 662.47 on 18 Oct, added from Receipts before New TV was deleted.
  const BEST_BUY = spend('receipt-bestbuy', 'receipt', '2026-10-18', 662.47, 'visa');
  const LINK: GoalPurchase = { goal_id: 'tv', receipt_id: 'bestbuy', start_amount: 150 };

  it('before the link, October counts it while the goal still holds the money', () => {
    const before = figures({ spending: [...OCTOBER, BEST_BUY], goals: OPEN, purchases: [] });
    expect(before.october).toEqual({ earned: 3700, spent: 2251.38, leftOver: 1448.62 });
    expect(before.goalsSaved).toBe(742.47);
  });

  it('after it, every figure is the one "Add receipt" gives', () => {
    const linked = figures({ spending: [...OCTOBER, BEST_BUY], goals: SPENT, purchases: [LINK] });
    const filed = figures({
      spending: [...OCTOBER, TV_RECEIPT],
      goals: SPENT,
      purchases: [TV_PURCHASE],
    });
    expect(linked).toEqual(filed);
    expect(linked.currentBalance).toBe(3448.62);
    expect(linked.october.leftOver).toBe(2111.09);
  });
});
