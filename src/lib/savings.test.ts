import {
  allocateBatch,
  allocateSend,
  allocateTakeBack,
  canChangePot,
  localDayOf,
  monthTotals,
  monthUpdate,
  monthsToClose,
  movesToSavingsOn,
  savingsFlows,
  savingsSummary,
  type FlowEntry,
  type MoveRow,
  type PotRow,
  type SendDraw,
} from '@/lib/savings';

/*
 * Every expected figure below was added up by hand in integer cents from the rows listed, not by
 * the code under test. The design months: September 3,700 − 3,060 = 640, August 3,700 − 3,180 =
 * 520, July 3,700 − 3,290 = 410, October so far 3,700 − 2,961.29 = 738.71.
 */

// Rows as the money book lists them: pay positive, spending negative.
const income = (date: string, amount: number): FlowEntry => ({ kind: 'income', date, amount });
const receipt = (date: string, amount: number): FlowEntry => ({
  kind: 'receipt',
  date,
  amount: -amount,
});
const bill = (date: string, amount: number): FlowEntry => ({ kind: 'bill', date, amount: -amount });
const sub = (date: string, amount: number): FlowEntry => ({
  kind: 'subscription',
  date,
  amount: -amount,
});
const cardPayment = (date: string, amount: number): FlowEntry => ({
  kind: 'payment',
  date,
  amount,
});

/** Salary 3,450.00 on the 1st and a side job 250.00 on the 5th: 3,700.00 a month. */
const payFor = (month: string) => [income(`${month}-01`, 3450), income(`${month}-05`, 250)];

const JULY = [
  bill('2026-07-01', 1650.0), // Rent
  sub('2026-07-02', 185.0), // Equinox
  sub('2026-07-05', 10.99), // Spotify
  bill('2026-07-08', 131.74), // Electricity
  sub('2026-07-12', 15.49), // Netflix
  bill('2026-07-15', 493.85), // Car loan
  bill('2026-07-18', 79.99), // Internet
  receipt('2026-07-19', 206.39), // IKEA
  bill('2026-07-22', 65.0), // Phone
  receipt('2026-07-22', 68.42), // Trader Joe's
  receipt('2026-07-25', 52.1), // Shell
  receipt('2026-07-26', 174.28), // Costco
  bill('2026-07-27', 142.0), // Car insurance
  receipt('2026-07-28', 14.75), // Chipotle
];

const AUGUST = [
  bill('2026-08-01', 1650.0),
  receipt('2026-08-02', 82.13),
  receipt('2026-08-04', 23.6),
  sub('2026-08-05', 10.99),
  receipt('2026-08-07', 61.07),
  bill('2026-08-08', 138.6),
  receipt('2026-08-08', 27.31),
  sub('2026-08-12', 15.49),
  receipt('2026-08-13', 112.44),
  bill('2026-08-15', 493.85),
  bill('2026-08-18', 79.99),
  bill('2026-08-22', 65.0),
  receipt('2026-08-22', 158.92),
  bill('2026-08-27', 142.0),
  receipt('2026-08-29', 118.61),
];

const SEPTEMBER = [
  bill('2026-09-01', 1650.0),
  receipt('2026-09-03', 72.15),
  sub('2026-09-05', 10.99),
  receipt('2026-09-05', 51.44),
  bill('2026-09-08', 118.42),
  receipt('2026-09-10', 88.21),
  sub('2026-09-12', 15.49),
  receipt('2026-09-12', 34.78),
  receipt('2026-09-13', 174.28),
  receipt('2026-09-14', 42.6),
  bill('2026-09-15', 493.85),
  bill('2026-09-18', 79.99),
  bill('2026-09-22', 65.0),
  bill('2026-09-27', 142.0),
  receipt('2026-09-29', 20.8),
];

// Up to and including 9 Oct; the car loan on the 15th and Netflix on the 12th are still to come.
const OCTOBER = [
  bill('2026-10-01', 1650.0),
  sub('2026-10-02', 185.0),
  receipt('2026-10-03', 212.47),
  receipt('2026-10-04', 64.93),
  sub('2026-10-05', 10.99),
  receipt('2026-10-06', 48.2),
  receipt('2026-10-07', 649.99),
  bill('2026-10-08', 118.42),
  receipt('2026-10-09', 21.29),
  sub('2026-10-12', 15.49),
  bill('2026-10-15', 493.85),
];

const TODAY = '2026-10-09';
const CREATED = '2026-07-01';

const BOOK = savingsFlows([
  ...payFor('2026-07'),
  ...payFor('2026-08'),
  ...payFor('2026-09'),
  ...payFor('2026-10'),
  ...JULY,
  ...AUGUST,
  ...SEPTEMBER,
  ...OCTOBER,
  // Moves money the person already had: never earned, never spent.
  cardPayment('2026-09-06', 350),
  { kind: 'transfer', date: '2026-09-07', amount: 500 },
]);

const totals = (month: string, today = TODAY, accountCreatedOn = CREATED) =>
  monthTotals({ month, today, accountCreatedOn, ...BOOK });

describe('monthTotals: the design months', () => {
  it('September: earned 3,700, spent 3,060, left over 640', () => {
    expect(totals('2026-09')).toEqual({ earned: 3700, spent: 3060, leftOver: 640 });
  });

  it('August: 3,700 − 3,180 = 520', () => {
    expect(totals('2026-08')).toEqual({ earned: 3700, spent: 3180, leftOver: 520 });
  });

  it('July: 3,700 − 3,290 = 410', () => {
    expect(totals('2026-07')).toEqual({ earned: 3700, spent: 3290, leftOver: 410 });
  });

  it('October so far: up to and including today, nothing still to come', () => {
    expect(totals('2026-10')).toEqual({ earned: 3700, spent: 2961.29, leftOver: 738.71 });
  });

  it('October so far moves on as days pass: Netflix lands on the 12th', () => {
    expect(totals('2026-10', '2026-10-12')).toEqual({
      earned: 3700,
      spent: 2976.78,
      leftOver: 723.22,
    });
  });

  it('a closed month is the same whatever later day it is worked out on', () => {
    expect(totals('2026-09', '2026-10-01')).toEqual(totals('2026-09', '2027-03-15'));
  });

  it('accepts the month as its first day too (a pot row)', () => {
    expect(totals('2026-09-01')).toEqual(totals('2026-09'));
  });
});

describe('monthTotals: what counts', () => {
  it('leaves out card payments, moves between accounts and added money', () => {
    expect(BOOK.pay).toHaveLength(8);
    expect(BOOK.spending).toHaveLength(
      JULY.length + AUGUST.length + SEPTEMBER.length + OCTOBER.length,
    );
    const flows = savingsFlows([
      cardPayment('2026-09-06', 350),
      { kind: 'payment', date: '2026-09-06', amount: -350 },
      { kind: 'add-money', date: '2026-09-07', amount: 100 },
      { kind: 'income', date: '2026-09-08', amount: -20 },
    ]);
    expect(flows).toEqual({ pay: [], spending: [] });
  });

  it('sums cents exactly where floats drift (0.1 + 0.2)', () => {
    const tenCents = Array.from({ length: 30 }, () => ({ date: '2026-09-10', amount: 0.1 }));
    const result = monthTotals({
      month: '2026-09',
      today: TODAY,
      accountCreatedOn: CREATED,
      pay: [{ date: '2026-09-01', amount: 0.3 }],
      spending: [...tenCents, { date: '2026-09-11', amount: 0.2 }],
    });
    expect(result).toEqual({ earned: 0.3, spent: 3.2, leftOver: -2.9 });
  });

  it('reads spending signed or unsigned, and day-stamped dates by their day', () => {
    const result = monthTotals({
      month: '2026-09',
      today: TODAY,
      accountCreatedOn: CREATED,
      pay: [{ date: '2026-09-30T23:00:00', amount: 100 }],
      spending: [
        { date: '2026-09-30', amount: -12.34 },
        { date: '2026-09-30', amount: 0.66 },
        { date: '2026-10-01T00:00:00', amount: 99 },
      ],
    });
    expect(result).toEqual({ earned: 100, spent: 13, leftOver: 87 });
  });

  it('an overspent month has a negative left over', () => {
    const result = monthTotals({
      month: '2026-09',
      today: TODAY,
      accountCreatedOn: CREATED,
      pay: [{ date: '2026-09-15', amount: 2000 }],
      spending: [{ date: '2026-09-20', amount: 2150.75 }],
    });
    expect(result).toEqual({ earned: 2000, spent: 2150.75, leftOver: -150.75 });
  });

  it('a month not begun yet, or before the account, counts nothing', () => {
    const zero = { earned: 0, spent: 0, leftOver: 0 };
    expect(totals('2026-11')).toEqual(zero);
    expect(totals('2026-06')).toEqual(zero);
    expect(totals('2026-07', TODAY, '2026-08-02')).toEqual(zero);
  });

  it('counts nothing when the account day, today or the month cannot be read', () => {
    const zero = { earned: 0, spent: 0, leftOver: 0 };
    expect(totals('2026-09', TODAY, '')).toEqual(zero);
    expect(totals('2026-09', '', CREATED)).toEqual(zero);
    expect(totals('Sept')).toEqual(zero);
  });

  it('knows short months and leap years', () => {
    const feb = (year: number) =>
      monthTotals({
        month: `${year}-02`,
        today: `${year}-12-31`,
        accountCreatedOn: '2020-01-01',
        pay: [
          { date: `${year}-02-28`, amount: 1 },
          { date: `${year}-02-29`, amount: 10 },
        ],
        spending: [],
      }).earned;
    expect(feb(2027)).toBe(1);
    expect(feb(2028)).toBe(11);
  });
});

/*
 * The demo account's shape: rows seeded back to July into an account that came later. The account
 * is taken as created on 20 Aug 2026 (the live profile's day was not read). Komal Pay is 1,880.00
 * twice a month (15th and last day) with its last payday typed as 15 Jul, so the pay recorder's
 * first run writes 15 Jul, 31 Jul and 15 Aug before the account existed. Receipts and charges are
 * the seed's own rows; September's 18th-27th charges are the plan amounts the sweep records.
 */
describe('monthTotals: nothing before the account (demo account shape)', () => {
  const ACCOUNT_DAY = '2026-08-20';
  const DEMO_TODAY = '2026-10-11';
  const komalPay = ['07-15', '07-31', '08-15', '08-31', '09-15', '09-30'].map((day) =>
    income(`2026-${day}`, 1880),
  );
  const seed = savingsFlows([
    ...komalPay,
    // August receipts, all of them; only 21 Aug on are after the account.
    ...[
      ['08-02', 82.13],
      ['08-04', 23.6],
      ['08-07', 61.07],
      ['08-08', 27.31],
      ['08-09', 16.2],
      ['08-11', 48.73],
      ['08-13', 112.44],
      ['08-15', 74.66],
      ['08-16', 7.1],
      ['08-18', 18.95],
      ['08-19', 55.88],
      ['08-21', 13.4],
      ['08-22', 158.92],
      ['08-25', 44.19],
      ['08-27', 12.86],
      ['08-29', 69.34],
      ['08-30', 15.85],
    ].map(([day, amount]) => receipt(`2026-${day}`, amount as number)),
    // August charges.
    ...[
      ['08-02', 185.0],
      ['08-05', 10.99],
      ['08-08', 138.6],
      ['08-12', 15.49],
      ['08-15', 493.85],
      ['08-18', 79.99],
      ['08-21', 2.99],
      ['08-22', 65.0],
      ['08-27', 142.0],
    ].map(([day, amount]) => bill(`2026-${day}`, amount as number)),
    // September receipts.
    ...[
      ['09-01', 24.99],
      ['09-03', 72.15],
      ['09-04', 6.35],
      ['09-05', 51.44],
      ['09-07', 21.3],
      ['09-08', 15.6],
      ['09-10', 88.21],
      ['09-12', 34.78],
      ['09-14', 42.6],
      ['09-15', 64.93],
      ['09-15', 9.85],
      ['09-16', 5.95],
      ['09-16', 17.45],
    ].map(([day, amount]) => receipt(`2026-${day}`, amount as number)),
    // September charges.
    ...[
      ['09-02', 185.0],
      ['09-05', 10.99],
      ['09-08', 118.42],
      ['09-12', 15.49],
      ['09-15', 493.85],
      ['09-18', 79.99],
      ['09-21', 2.99],
      ['09-22', 65.0],
      ['09-27', 142.0],
    ].map(([day, amount]) => bill(`2026-${day}`, amount as number)),
    // July, all before the account.
    receipt('2026-07-22', 68.42),
    bill('2026-07-15', 493.85),
    cardPayment('2026-09-06', 350),
  ]);
  const demo = (month: string) =>
    monthTotals({ month, today: DEMO_TODAY, accountCreatedOn: ACCOUNT_DAY, ...seed });

  it('closes August and September only: July is before the account', () => {
    expect(
      monthsToClose({ today: DEMO_TODAY, accountCreatedOn: ACCOUNT_DAY, closedMonths: [] }),
    ).toEqual(['2026-08', '2026-09']);
  });

  it('August counts from the 20th: one pay of 1,880 and 524.55 spent', () => {
    expect(demo('2026-08')).toEqual({ earned: 1880, spent: 524.55, leftOver: 1355.45 });
  });

  it('September is a whole month: 3,760 − 1,569.33', () => {
    expect(demo('2026-09')).toEqual({ earned: 3760, spent: 1569.33, leftOver: 2190.67 });
  });

  it('July would invent a month: pay recorded before the account never counts', () => {
    expect(demo('2026-07')).toEqual({ earned: 0, spent: 0, leftOver: 0 });
  });
});

describe('monthsToClose', () => {
  it('fills every finished month since the account, oldest first', () => {
    expect(monthsToClose({ today: TODAY, accountCreatedOn: CREATED, closedMonths: [] })).toEqual([
      '2026-07',
      '2026-08',
      '2026-09',
    ]);
  });

  it('skips closed months, removed ones included, given as yyyy-mm or yyyy-mm-01', () => {
    expect(
      monthsToClose({
        today: TODAY,
        accountCreatedOn: CREATED,
        closedMonths: ['2026-07-01', '2026-09'],
      }),
    ).toEqual(['2026-08']);
  });

  it('never the month in progress: on the 1st, last month closes', () => {
    expect(
      monthsToClose({
        today: '2026-11-01',
        accountCreatedOn: CREATED,
        closedMonths: ['2026-07', '2026-08', '2026-09'],
      }),
    ).toEqual(['2026-10']);
    expect(
      monthsToClose({
        today: '2026-10-31',
        accountCreatedOn: CREATED,
        closedMonths: ['2026-07', '2026-08', '2026-09'],
      }),
    ).toEqual([]);
  });

  it('nothing in the account’s first month', () => {
    expect(
      monthsToClose({ today: '2026-10-31', accountCreatedOn: '2026-10-01', closedMonths: [] }),
    ).toEqual([]);
  });

  it('at most the last 12 finished months, across a new year', () => {
    expect(
      monthsToClose({ today: '2027-02-10', accountCreatedOn: '2024-05-17', closedMonths: [] }),
    ).toEqual([
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
      '2026-12',
      '2027-01',
    ]);
  });

  it('a long absence still reaches back no further than 12 months', () => {
    expect(
      monthsToClose({
        today: '2028-01-03',
        accountCreatedOn: '2026-07-01',
        closedMonths: ['2026-07', '2026-08'],
      }),
    ).toHaveLength(12);
  });

  it('nothing when the account day cannot be read', () => {
    expect(monthsToClose({ today: TODAY, accountCreatedOn: '', closedMonths: [] })).toEqual([]);
  });
});

const monthPot = (
  id: string,
  month: string,
  earned: number,
  spent: number,
  amount: number,
): PotRow => ({
  id,
  kind: 'month',
  month: `${month}-01`,
  label: null,
  earned,
  spent,
  amount,
  added_on: movesToSavingsOn(month),
  note: null,
  wrap_up_seen_at: null,
  removed_at: null,
  created_at: `${movesToSavingsOn(month)}T09:00:00+00:00`,
});

const addedPot = (id: string, label: string, amount: number, addedOn: string): PotRow => ({
  id,
  kind: 'added',
  month: null,
  label,
  earned: null,
  spent: null,
  amount,
  added_on: addedOn,
  note: null,
  wrap_up_seen_at: null,
  removed_at: null,
  created_at: `${addedOn}T12:00:00+00:00`,
});

const move = (
  id: string,
  goal: string,
  pot: string | null,
  amount: number,
  at: string,
  batch: string | null = null,
): MoveRow => ({ id, goal_id: goal, pot_id: pot, amount, batch_id: batch, created_at: at });

/** The rows a send writes: one per goal and pot drawn on. */
const rowsOf = (batch: string, at: string, draws: readonly SendDraw[]): MoveRow[] =>
  draws.map((draw, index) =>
    move(`${batch}-${index}`, draw.goal_id, draw.pot_id, draw.amount, at, batch),
  );

const JUL = monthPot('jul', '2026-07', 3700, 3290, 410);
const AUG = monthPot('aug', '2026-08', 3700, 3180, 520);
const SEP = monthPot('sep', '2026-09', 3700, 3060, 640);
const DESIGN_POTS = [SEP, JUL, AUG];

/*
 * The design's history: on 14 Aug, with only July in savings, 200 went to Emergency fund; on
 * 10 Sep, with July and August in, 300 went to Trip and 220 to Emergency fund, newest pot first.
 * That leaves July $210, August all sent, September ready (design 1).
 */
const DESIGN_MOVES = [
  move('m1', 'emergency', 'jul', 200, '2026-08-14T16:00:00+00:00', 'b1'),
  move('m2', 'trip', 'aug', 300, '2026-09-10T16:00:00+00:00', 'b2'),
  move('m3', 'emergency', 'aug', 220, '2026-09-10T16:00:00+00:00', 'b2'),
];

/** Send $700 (design 3): 400 to Trip and 300 to Emergency fund, from the $850 ready. */
const SEND_700 = [
  { goal_id: 'trip', amount: 400 },
  { goal_id: 'emergency', amount: 300 },
];
const OCT_9 = '2026-10-09T15:00:00+00:00';

describe('allocateBatch / allocateSend: which pots a send draws on', () => {
  it('reproduces the design history, newest pot first', () => {
    expect(allocateSend({ pots: [JUL], moves: [], amount: 200 })).toEqual([
      { pot_id: 'jul', amount: 200 },
    ]);
    expect(
      allocateBatch({
        pots: [JUL, AUG],
        moves: DESIGN_MOVES.slice(0, 1),
        items: [
          { goal_id: 'trip', amount: 300 },
          { goal_id: 'emergency', amount: 220 },
        ],
      }),
    ).toEqual([
      { goal_id: 'trip', pot_id: 'aug', amount: 300 },
      { goal_id: 'emergency', pot_id: 'aug', amount: 220 },
    ]);
  });

  it('Send $700 from Savings: September first, then July; a goal spanning two pots gets two rows', () => {
    expect(allocateBatch({ pots: DESIGN_POTS, moves: DESIGN_MOVES, items: SEND_700 })).toEqual([
      { goal_id: 'trip', pot_id: 'sep', amount: 400 },
      { goal_id: 'emergency', pot_id: 'sep', amount: 240 },
      { goal_id: 'emergency', pot_id: 'jul', amount: 60 },
    ]);
  });

  it('sending from a month’s page spends that month first', () => {
    expect(
      allocateBatch({
        pots: DESIGN_POTS,
        moves: DESIGN_MOVES,
        items: SEND_700,
        preferPotId: 'jul',
      }),
    ).toEqual([
      { goal_id: 'trip', pot_id: 'jul', amount: 210 },
      { goal_id: 'trip', pot_id: 'sep', amount: 190 },
      { goal_id: 'emergency', pot_id: 'sep', amount: 300 },
    ]);
    expect(
      allocateBatch({
        pots: DESIGN_POTS,
        moves: DESIGN_MOVES,
        items: SEND_700,
        preferPotId: 'sep',
      }),
    ).toEqual(allocateBatch({ pots: DESIGN_POTS, moves: DESIGN_MOVES, items: SEND_700 }));
  });

  it('a preferred pot with nothing left, or one that is gone, changes nothing', () => {
    const plain = allocateBatch({ pots: DESIGN_POTS, moves: DESIGN_MOVES, items: SEND_700 });
    for (const preferPotId of ['aug', 'nope', null]) {
      expect(
        allocateBatch({ pots: DESIGN_POTS, moves: DESIGN_MOVES, items: SEND_700, preferPotId }),
      ).toEqual(plain);
    }
  });

  it('never draws more than the pots hold, nor from a removed or overspent pot', () => {
    const over = monthPot('oct', '2026-10', 3700, 3850.5, 0);
    const removed = { ...addedPot('gone', 'Gone', 99, '2026-10-05'), removed_at: OCT_9 };
    expect(
      allocateSend({ pots: [...DESIGN_POTS, over, removed], moves: DESIGN_MOVES, amount: 900 }),
    ).toEqual([
      { pot_id: 'sep', amount: 640 },
      { pot_id: 'jul', amount: 210 },
    ]);
  });

  it('newest pot first, added savings by their day; on the same day the month is older', () => {
    const gift = addedPot('gift', 'Birthday gift', 75.25, '2026-09-15');
    const cash = addedPot('cash', 'Cash found', 20, '2026-10-03');
    const sameDay = addedPot('same', 'Refund', 10, '2026-10-01');
    expect(
      allocateSend({ pots: [gift, cash, sameDay, ...DESIGN_POTS], moves: [], amount: 500 }),
    ).toEqual([
      { pot_id: 'cash', amount: 20 },
      { pot_id: 'same', amount: 10 },
      { pot_id: 'sep', amount: 470 },
    ]);
  });

  it('nothing asked, nothing drawn', () => {
    expect(allocateSend({ pots: DESIGN_POTS, moves: [], amount: 0 })).toEqual([]);
    expect(allocateBatch({ pots: [], moves: [], items: SEND_700 })).toEqual([]);
  });
});

describe('savingsSummary: the design', () => {
  const summary = savingsSummary({ pots: DESIGN_POTS, moves: DESIGN_MOVES });

  it('Ready to use is 1,570 in pots less 720 in goals: 850', () => {
    expect(summary.readyToUse).toBe(850);
    expect(summary.inGoals).toBe(720);
  });

  it('lists live pots newest first with their frozen figures', () => {
    expect(summary.pots.map((pot) => [pot.id, pot.amount, pot.leftOver, pot.movedOn])).toEqual([
      ['sep', 640, 640, '2026-10-01'],
      ['aug', 520, 520, '2026-09-01'],
      ['jul', 410, 410, '2026-08-01'],
    ]);
  });

  it('September ready, August sent to goals, July $210 left: from the pots each send named', () => {
    expect(summary.pots.map((pot) => [pot.id, pot.status, pot.sentFromIt, pot.left])).toEqual([
      ['sep', 'ready', 0, 640],
      ['aug', 'sent', 520, 0],
      ['jul', 'partly', 200, 210],
    ]);
  });

  it('the send header: "September $640 · July $210"', () => {
    expect(summary.withMoneyLeft.map((pot) => [pot.id, pot.left])).toEqual([
      ['sep', 640],
      ['jul', 210],
    ]);
  });

  it('after Send $700: $150 still in savings, all of it July’s', () => {
    const after = savingsSummary({
      pots: DESIGN_POTS,
      moves: [
        ...DESIGN_MOVES,
        ...rowsOf(
          'b3',
          OCT_9,
          allocateBatch({ pots: DESIGN_POTS, moves: DESIGN_MOVES, items: SEND_700 }),
        ),
      ],
    });
    expect(after.readyToUse).toBe(150);
    expect(after.inGoals).toBe(1420);
    expect(after.pots.map((pot) => [pot.id, pot.status, pot.left])).toEqual([
      ['sep', 'sent', 0],
      ['aug', 'sent', 0],
      ['jul', 'partly', 150],
    ]);
  });
});

describe('savingsSummary: rules', () => {
  it('an overspent month moves nothing and says so', () => {
    const over = monthPot('oct', '2026-10', 3700, 3850.5, 0);
    const summary = savingsSummary({ pots: [SEP, over], moves: [] });
    expect(summary.pots[0]).toMatchObject({
      id: 'oct',
      status: 'overspent',
      amount: 0,
      left: 0,
      leftOver: -150.5,
    });
    expect(summary.readyToUse).toBe(640);
    expect(summary.withMoneyLeft.map((pot) => pot.id)).toEqual(['sep']);
  });

  it('an overspent month given an amount by hand is a pot like any other', () => {
    const over = monthPot('oct', '2026-10', 3700, 3850.5, 50);
    expect(savingsSummary({ pots: [over], moves: [] }).pots[0].status).toBe('ready');
  });

  it('removed pots are gone from the list and from the money', () => {
    const removed = { ...AUG, removed_at: '2026-10-05T10:00:00+00:00' };
    const summary = savingsSummary({ pots: [JUL, removed, SEP], moves: [] });
    expect(summary.pots.map((pot) => pot.id)).toEqual(['sep', 'jul']);
    expect(summary.readyToUse).toBe(1050);
  });

  it('money still in goals from a pot that is gone stays out of Ready to use', () => {
    const removed = { ...AUG, removed_at: '2026-10-05T10:00:00+00:00' };
    const summary = savingsSummary({ pots: [JUL, removed, SEP], moves: DESIGN_MOVES });
    // 410 + 640 held, less 200 from July and the 520 no live pot claims.
    expect(summary.readyToUse).toBe(330);
    expect(summary.inGoals).toBe(720);
  });

  it('a move no pot claims still holds its money out of savings', () => {
    const summary = savingsSummary({
      pots: DESIGN_POTS,
      moves: [...DESIGN_MOVES, move('old', 'trip', null, 100, '2026-09-20T10:00:00+00:00')],
    });
    expect([summary.readyToUse, summary.inGoals]).toEqual([750, 820]);
    expect(summary.pots.find((pot) => pot.id === 'sep')?.status).toBe('ready');
  });

  it('a goal cannot hand a pot more than it took, nor offset another goal', () => {
    const summary = savingsSummary({
      pots: [SEP],
      moves: [
        move('m1', 'trip', 'sep', 100, '2026-10-02T10:00:00+00:00'),
        move('m2', 'trip', 'sep', -300, '2026-10-03T10:00:00+00:00'),
        move('m3', 'emergency', 'sep', 40, '2026-10-03T10:00:00+00:00'),
      ],
    });
    expect([summary.inGoals, summary.readyToUse]).toEqual([40, 600]);
  });

  it('never below zero, even when goals hold more than a pot', () => {
    const summary = savingsSummary({
      pots: [SEP],
      moves: [move('m1', 'trip', 'sep', 700, '2026-10-02T10:00:00+00:00')],
    });
    expect(summary.readyToUse).toBe(0);
    expect(summary.pots[0]).toMatchObject({ status: 'sent', left: 0, sentFromIt: 640 });
    expect(summary.withMoneyLeft).toEqual([]);
  });

  it('nothing at all: an empty Savings', () => {
    expect(savingsSummary({ pots: [], moves: [] })).toEqual({
      readyToUse: 0,
      inGoals: 0,
      pots: [],
      withMoneyLeft: [],
    });
  });

  it('reads numeric columns that arrive as text, to the cent', () => {
    const textual = { ...SEP, amount: '640.10' as unknown as number };
    const summary = savingsSummary({
      pots: [textual],
      moves: [move('m1', 'trip', 'sep', '0.30' as unknown as number, '2026-10-02T10:00:00+00:00')],
    });
    expect(summary.readyToUse).toBe(639.8);
  });
});

describe('allocateTakeBack: money out of a goal goes back to its pots', () => {
  const AFTER = [
    ...DESIGN_MOVES,
    move('s1', 'trip', 'sep', 400, OCT_9, 'b3'),
    move('s2', 'emergency', 'sep', 240, OCT_9, 'b3'),
    move('s3', 'emergency', 'jul', 60, OCT_9, 'b3'),
  ];

  it('to the pots of the most recent sends first', () => {
    const back = allocateTakeBack({ goalId: 'trip', moves: AFTER, amount: 500 });
    expect(back).toEqual([
      { pot_id: 'sep', amount: 400 },
      { pot_id: 'aug', amount: 100 },
    ]);
    const summary = savingsSummary({
      pots: DESIGN_POTS,
      moves: [
        ...AFTER,
        ...back.map((row, index) =>
          move(`t${index}`, 'trip', row.pot_id, -row.amount, '2026-10-10T10:00:00+00:00'),
        ),
      ],
    });
    // 150 ready before, 500 back: September 400 left, August 100, July 150.
    expect(summary.readyToUse).toBe(650);
    expect(summary.pots.map((pot) => [pot.id, pot.status, pot.left])).toEqual([
      ['sep', 'partly', 400],
      ['aug', 'partly', 100],
      ['jul', 'partly', 150],
    ]);
  });

  it('never more than the goal has from each pot, so never more than it has from savings', () => {
    expect(allocateTakeBack({ goalId: 'trip', moves: AFTER, amount: 1000 })).toEqual([
      { pot_id: 'sep', amount: 400 },
      { pot_id: 'aug', amount: 300 },
    ]);
  });

  it('one send drawn on two pots refills the older first', () => {
    expect(
      allocateTakeBack({ goalId: 'emergency', moves: AFTER, amount: 300, pots: DESIGN_POTS }),
    ).toEqual([
      { pot_id: 'jul', amount: 260 },
      { pot_id: 'sep', amount: 40 },
    ]);
  });

  it('the pots settle that tie by age, not by id', () => {
    const older = monthPot('z-old', '2026-08', 3700, 3000, 700);
    const newer = monthPot('a-new', '2026-09', 3700, 3000, 700);
    const moves = [
      move('x', 'g', 'a-new', 50, OCT_9, 'b'),
      move('y', 'g', 'z-old', 30, OCT_9, 'b'),
    ];
    expect(allocateTakeBack({ goalId: 'g', moves, amount: 40, pots: [older, newer] })).toEqual([
      { pot_id: 'z-old', amount: 30 },
      { pot_id: 'a-new', amount: 10 },
    ]);
    expect(allocateTakeBack({ goalId: 'g', moves, amount: 40 })).toEqual([
      { pot_id: 'a-new', amount: 40 },
    ]);
  });

  it('skips a pot the goal has already given back, and returns unclaimed money last', () => {
    const moves = [
      move('a', 'trip', null, 100, '2026-09-01T10:00:00+00:00'),
      move('b', 'trip', 'aug', 300, '2026-09-05T10:00:00+00:00'),
      move('c', 'trip', 'aug', -300, '2026-09-06T10:00:00+00:00'),
      move('d', 'trip', 'sep', 50, '2026-10-01T10:00:00+00:00'),
      move('e', 'emergency', 'sep', 500, '2026-10-02T10:00:00+00:00'),
    ];
    expect(allocateTakeBack({ goalId: 'trip', moves, amount: 120 })).toEqual([
      { pot_id: 'sep', amount: 50 },
      { pot_id: null, amount: 70 },
    ]);
  });

  it('"most recent" is the last send to a pot, not money given back to it', () => {
    const moves = [
      move('a', 'trip', 'aug', 100, '2026-09-05T10:00:00+00:00'),
      move('b', 'trip', 'sep', 100, '2026-10-01T10:00:00+00:00'),
      move('c', 'trip', 'aug', -20, '2026-10-05T10:00:00+00:00'),
    ];
    expect(allocateTakeBack({ goalId: 'trip', moves, amount: 50 })).toEqual([
      { pot_id: 'sep', amount: 50 },
    ]);
  });

  it('a pot the goal has over-returned to is never drawn on', () => {
    const moves = [
      move('a', 'trip', 'sep', 100, '2026-09-01T10:00:00+00:00'),
      move('b', 'trip', 'aug', 50, '2026-09-05T10:00:00+00:00'),
      move('c', 'trip', 'aug', -80, '2026-09-06T10:00:00+00:00'),
    ];
    expect(allocateTakeBack({ goalId: 'trip', moves, amount: 60 })).toEqual([
      { pot_id: 'sep', amount: 60 },
    ]);
  });

  it('nothing to take back', () => {
    expect(allocateTakeBack({ goalId: 'trip', moves: AFTER, amount: 0 })).toEqual([]);
    expect(allocateTakeBack({ goalId: 'nope', moves: AFTER, amount: 50 })).toEqual([]);
  });
});

describe('canChangePot: per pot', () => {
  const at = (potId: string, newAmount: number | null, pots = DESIGN_POTS, moves = DESIGN_MOVES) =>
    canChangePot({ pots, moves, potId, newAmount });

  it('a pot with nothing in goals may change or go', () => {
    expect(at('sep', 100)).toEqual({ ok: true });
    expect(at('sep', null)).toEqual({ ok: true });
  });

  it('never below what this pot has in goals', () => {
    expect(at('jul', 150)).toEqual({ ok: false, reason: 'in-goals', inGoals: 200, short: 50 });
    expect(at('jul', 200)).toEqual({ ok: true });
    expect(at('jul', 199.99)).toEqual({ ok: false, reason: 'in-goals', inGoals: 200, short: 0.01 });
    expect(at('aug', null)).toEqual({ ok: false, reason: 'in-goals', inGoals: 520, short: 520 });
  });

  it('other pots holding plenty do not make up for this one', () => {
    const rich = { ...SEP, amount: 5000 };
    expect(at('jul', 0, [rich, JUL, AUG])).toMatchObject({ ok: false, reason: 'in-goals' });
  });

  it('$0 is refused for a pot that is not an overspent month: remove it instead', () => {
    expect(at('sep', 0)).toEqual({ ok: false, reason: 'zero', inGoals: 0, short: 0 });
    const gift = addedPot('gift', 'Gift', 50, '2026-10-05');
    expect(at('gift', 0, [...DESIGN_POTS, gift])).toMatchObject({ ok: false, reason: 'zero' });
    expect(at('gift', null, [...DESIGN_POTS, gift])).toEqual({ ok: true });
  });

  it('an overspent month may sit at $0', () => {
    const over = monthPot('oct', '2026-10', 3700, 3850.5, 0);
    const given = monthPot('oct', '2026-10', 3700, 3850.5, 50);
    expect(at('oct', 0, [over])).toEqual({ ok: true });
    expect(at('oct', 0, [given])).toEqual({ ok: true });
    expect(at('oct', null, [over])).toEqual({ ok: true });
  });

  it('raising is always allowed; removing a pot with money in goals never is', () => {
    const moves = [move('m1', 'trip', 'sep', 900, '2026-10-02T10:00:00+00:00')];
    expect(at('sep', 700, [SEP], moves)).toEqual({ ok: true });
    expect(at('sep', 600, [SEP], moves)).toEqual({
      ok: false,
      reason: 'in-goals',
      inGoals: 900,
      short: 300,
    });
    const empty = monthPot('oct', '2026-10', 3700, 3850.5, 0);
    expect(
      at('oct', null, [empty], [move('m2', 'trip', 'oct', 50, '2026-11-02T10:00:00+00:00')]),
    ).toEqual({ ok: false, reason: 'in-goals', inGoals: 50, short: 50 });
  });

  it('a pot that is unknown or already removed has nothing to protect', () => {
    expect(at('nope', null)).toEqual({ ok: true });
    expect(at('aug', null, [JUL, { ...AUG, removed_at: OCT_9 }, SEP])).toEqual({ ok: true });
  });
});

describe('monthUpdate: a closed month that changed later', () => {
  const update = (pot: PotRow, earned: number, spent: number, moves = DESIGN_MOVES) =>
    monthUpdate({ pot, moves, now: { earned, spent } });

  it('a September receipt typed on 3 Oct: $25.49 more spent, $614.51 instead of $640', () => {
    expect(update(SEP, 3700, 3085.49)).toEqual({
      earned: 3700,
      spent: 3085.49,
      earnedChange: 0,
      spentChange: 25.49,
      amount: 614.51,
      inGoals: 0,
      capped: false,
    });
  });

  it('a deleted receipt and a late pay: both changes signed', () => {
    expect(update(SEP, 3750, 3020)).toMatchObject({
      earnedChange: 50,
      spentChange: -40,
      amount: 730,
      capped: false,
    });
  });

  it('late pay alone is a change too', () => {
    expect(update(SEP, 3750, 3060)).toMatchObject({
      earnedChange: 50,
      spentChange: 0,
      amount: 690,
    });
  });

  it('nothing changed to the cent: no offer', () => {
    expect(update(SEP, 3700, 3060)).toBeNull();
    const tiny = monthPot('tiny', '2026-09', 0.3, 0.3, 0);
    expect(update(tiny, 0.1 + 0.2, 0.1 + 0.2)).toBeNull();
  });

  it('never below what the pot already has in goals: August holds at $520', () => {
    expect(update(AUG, 3700, 3280)).toEqual({
      earned: 3700,
      spent: 3280,
      earnedChange: 0,
      spentChange: 100,
      amount: 520,
      inGoals: 520,
      capped: true,
    });
  });

  it('turned overspent: $0, or what is in goals', () => {
    expect(update(SEP, 3700, 3800)).toMatchObject({ amount: 0, inGoals: 0, capped: false });
    expect(update(JUL, 3700, 3750.25)).toMatchObject({ amount: 200, inGoals: 200, capped: true });
  });

  it('an overspent month that now has money left gets it', () => {
    const over = monthPot('oct', '2026-10', 3700, 3850.5, 0);
    expect(update(over, 3700, 3650.5)).toMatchObject({ spentChange: -200, amount: 49.5 });
  });

  it('counts money taken back, and only moves that name this pot', () => {
    const moves = [
      ...DESIGN_MOVES,
      move('t1', 'trip', 'aug', -150, '2026-10-05T10:00:00+00:00'),
      move('o1', 'trip', 'sep', 600, '2026-10-06T10:00:00+00:00'),
    ];
    expect(update(AUG, 3700, 3280, moves)).toMatchObject({
      amount: 420,
      inGoals: 370,
      capped: false,
    });
  });

  it('only for a live month pot', () => {
    expect(update({ ...SEP, removed_at: OCT_9 }, 3700, 3000)).toBeNull();
    expect(update(addedPot('gift', 'Gift', 50, '2026-10-05'), 3700, 3000)).toBeNull();
  });
});

describe('dates', () => {
  it('a month moves to savings on the 1st after it, across a year', () => {
    expect(movesToSavingsOn('2026-10')).toBe('2026-11-01');
    expect(movesToSavingsOn('2026-12-01')).toBe('2027-01-01');
  });

  it('a bare day stays that day; a timestamp is read on the phone’s own calendar', () => {
    expect(localDayOf('2026-10-01')).toBe('2026-10-01');
    // Midday UTC is the same calendar day from UTC−11 to UTC+11.
    expect(localDayOf('2026-08-14T12:00:00+00:00')).toBe('2026-08-14');
    expect(localDayOf('2026-08-14T12:00:00.123456+00:00')).toBe('2026-08-14');
    expect(localDayOf('not a time')).toBe('not a time');
  });
});
