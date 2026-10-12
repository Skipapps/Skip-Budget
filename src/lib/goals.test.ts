import {
  clampSend,
  goalPlan,
  goalProgress,
  goalsSummary,
  splitEvenly,
  type GoalRow,
} from '@/lib/goals';
import type { MoveRow } from '@/lib/savings';

/*
 * The design's goals on 9 Oct 2026: Trip $300 of $1,200 by Mar 2027 (25%, about $37 a week),
 * Emergency fund $420 of $1,000 by Dec 2026 (42%, about $49 a week), New phone $600 reached
 * Aug 2026; "Saved toward goals $720.00 of $2,200". Then Send $700: Trip $300 → $700 and Emergency
 * fund $420 → $720. Weekly and monthly figures were worked by hand in integer cents:
 *   weekly  = ceil(need¢ × 7 ÷ (days × 100))       Trip ceil(630,000 ÷ 17,300) = 37
 *   monthly = ceil(need¢ × 1461 ÷ (days × 4800))   Trip ceil(131,490,000 ÷ 830,400) = 159
 * A month picked as "by Mar 2027" is stored as its last day; 9 Oct → 31 Mar 2027 is 173 days and
 * 9 Oct → 31 Dec 2026 is 83. Timestamps whose day is checked sit at midday UTC, the same calendar
 * day from UTC−11 to UTC+11.
 */

const TODAY = '2026-10-09';

const goal = (row: Partial<GoalRow> & Pick<GoalRow, 'id' | 'target'>): GoalRow => ({
  name: row.id,
  icon_id: row.id,
  target_date: null,
  start_amount: 0,
  created_at: '2026-07-01T10:00:00+00:00',
  closed_at: null,
  ...row,
});

/** Which pot a move names does not change a goal's figures; the savings tests cover pots. */
const move = (id: string, goalId: string, amount: number, at: string): MoveRow => ({
  id,
  goal_id: goalId,
  amount,
  pot_id: 'sep',
  batch_id: null,
  created_at: at,
});

const TRIP = goal({
  id: 'trip',
  name: 'Trip',
  target: 1200,
  target_date: '2027-03-31',
  created_at: '2026-07-20T10:00:00+00:00',
});
const EMERGENCY = goal({
  id: 'emergency',
  name: 'Emergency fund',
  target: 1000,
  target_date: '2026-12-31',
  created_at: '2026-08-01T10:00:00+00:00',
});
const PHONE = goal({
  id: 'phone',
  name: 'New phone',
  target: 600,
  start_amount: 250,
  created_at: '2026-06-01T10:00:00+00:00',
});

const MOVES = [
  move('m0', 'phone', 350, '2026-08-14T12:00:00+00:00'),
  move('m1', 'emergency', 200, '2026-08-14T16:00:00+00:00'),
  move('m2', 'trip', 300, '2026-09-10T16:00:00+00:00'),
  move('m3', 'emergency', 220, '2026-09-10T16:00:00+00:00'),
];

const SENT = [
  ...MOVES,
  move('m4', 'trip', 400, '2026-10-09T15:00:00+00:00'),
  move('m5', 'emergency', 300, '2026-10-09T15:00:00+00:00'),
];

describe('goalProgress: the design', () => {
  it('Trip: $300 of $1,200, 25%, about $37 a week, $159 a month', () => {
    expect(goalProgress(TRIP, MOVES, TODAY)).toMatchObject({
      saved: 300,
      need: 900,
      percent: 25,
      done: false,
      reachedOn: null,
      weekly: 37,
      monthly: 159,
      datePassed: false,
      fromSavings: 300,
    });
  });

  it('Emergency fund: $420 of $1,000, 42%, about $49 a week, $213 a month', () => {
    expect(goalProgress(EMERGENCY, MOVES, TODAY)).toMatchObject({
      saved: 420,
      need: 580,
      percent: 42,
      weekly: 49,
      monthly: 213,
    });
  });

  it('New phone: $600, reached Aug 2026, no line to get there', () => {
    expect(goalProgress(PHONE, MOVES, TODAY)).toMatchObject({
      saved: 600,
      need: 0,
      percent: 100,
      done: true,
      reachedOn: '2026-08-14',
      weekly: null,
      monthly: null,
      datePassed: false,
      fromSavings: 350,
    });
  });

  it('after Send $700: Trip $700 of $1,200 and Emergency fund $720 of $1,000', () => {
    expect(goalProgress(TRIP, SENT, TODAY)).toMatchObject({
      saved: 700,
      need: 500,
      percent: 58,
      weekly: 21,
      monthly: 88,
    });
    expect(goalProgress(EMERGENCY, SENT, TODAY)).toMatchObject({
      saved: 720,
      need: 280,
      percent: 72,
      weekly: 24,
      monthly: 103,
    });
  });
});

describe('goalsSummary', () => {
  it('saved toward goals $720.00 of $2,200: 2 active, 1 done', () => {
    const summary = goalsSummary([PHONE, EMERGENCY, TRIP], MOVES, TODAY);
    expect(summary.saved).toBe(720);
    expect(summary.target).toBe(2200);
    expect(summary.active.map((view) => view.id)).toEqual(['trip', 'emergency']);
    expect(summary.done.map((view) => view.id)).toEqual(['phone']);
  });

  it('after the send: $1,420 of $2,200', () => {
    const summary = goalsSummary([TRIP, EMERGENCY, PHONE], SENT, TODAY);
    expect([summary.saved, summary.target]).toEqual([1420, 2200]);
  });

  it('finished goals show the most recently reached first', () => {
    const bike = goal({
      id: 'bike',
      target: 100,
      start_amount: 100,
      created_at: '2026-09-20T12:00:00+00:00',
    });
    const summary = goalsSummary([PHONE, bike], MOVES, TODAY);
    expect(summary.done.map((view) => [view.id, view.reachedOn])).toEqual([
      ['bike', '2026-09-20'],
      ['phone', '2026-08-14'],
    ]);
    expect([summary.saved, summary.target, summary.active]).toEqual([0, 0, []]);
  });

  it('a closed goal ("I spent it") leaves every list and the headline', () => {
    const laptop = goal({
      id: 'laptop',
      target: 1500,
      target_date: '2026-12-31',
      closed_at: '2026-10-05T12:00:00+00:00',
    });
    const spentPhone = { ...PHONE, closed_at: '2026-09-01T12:00:00+00:00' };
    const moves = [...MOVES, move('l1', 'laptop', 900, '2026-09-25T12:00:00+00:00')];
    const summary = goalsSummary([TRIP, laptop, EMERGENCY, spentPhone], moves, TODAY);
    expect(summary.active.map((view) => view.id)).toEqual(['trip', 'emergency']);
    expect(summary.done).toEqual([]);
    expect([summary.saved, summary.target]).toEqual([720, 2200]);
  });

  it('no goals', () => {
    expect(goalsSummary([], [], TODAY)).toEqual({ saved: 0, target: 0, active: [], done: [] });
  });
});

describe('goalProgress: rules', () => {
  it('saved = already saved + sent − taken back, to the cent', () => {
    const view = goalProgress(
      goal({ id: 'g', target: 1000, start_amount: 100.1 }),
      [
        move('a', 'g', 0.1, '2026-09-01T10:00:00+00:00'),
        move('b', 'g', 0.2, '2026-09-02T10:00:00+00:00'),
        move('c', 'g', -50.05, '2026-09-03T10:00:00+00:00'),
        move('x', 'other', 999, '2026-09-03T10:00:00+00:00'),
      ],
      TODAY,
    );
    expect(view.saved).toBe(50.35);
    expect(view.need).toBe(949.65);
    expect(view.fromSavings).toBe(0);
  });

  it('whole percent, rounded down, never 100 while short', () => {
    const at = (saved: number, target = 1000) =>
      goalProgress(goal({ id: 'g', target, start_amount: saved }), [], TODAY).percent;
    expect(at(999.99)).toBe(99);
    expect(at(5)).toBe(0);
    expect(at(100, 300)).toBe(33);
    expect(at(1000)).toBe(100);
    expect(at(1050)).toBe(100);
    expect(at(999_999_999_998, 999_999_999_999)).toBe(99);
  });

  it('over the target is done with nothing more needed', () => {
    expect(
      goalProgress(goal({ id: 'g', target: 500, start_amount: 520.5 }), [], TODAY),
    ).toMatchObject({
      saved: 520.5,
      need: 0,
      done: true,
    });
  });

  it('reached on the send that last crossed the target', () => {
    const moves = [
      move('a', 'phone', 50, '2026-07-20T12:00:00+00:00'),
      move('b', 'phone', 300, '2026-08-14T12:00:00+00:00'),
      move('c', 'phone', -100, '2026-09-01T12:00:00+00:00'),
    ];
    expect(goalProgress(PHONE, moves, TODAY)).toMatchObject({
      done: false,
      reachedOn: null,
      saved: 500,
    });
    const back = [...moves, move('d', 'phone', 100, '2026-09-20T12:00:00+00:00')];
    expect(goalProgress(PHONE, back, TODAY)).toMatchObject({ done: true, reachedOn: '2026-09-20' });
    // Out of order on arrival makes no difference.
    expect(goalProgress(PHONE, [...back].reverse(), TODAY).reachedOn).toBe('2026-09-20');
  });

  it('stays reached on the crossing send while later moves keep it full', () => {
    const moves = [
      move('a', 'phone', 400, '2026-08-14T12:00:00+00:00'),
      move('b', 'phone', -30, '2026-09-01T12:00:00+00:00'),
      move('c', 'phone', 10, '2026-09-20T12:00:00+00:00'),
    ];
    expect(goalProgress(PHONE, moves, TODAY)).toMatchObject({
      saved: 630,
      done: true,
      reachedOn: '2026-08-14',
    });
  });

  it('a goal made already full was reached the day it was made', () => {
    const full = goal({
      id: 'g',
      target: 200,
      start_amount: 200,
      created_at: '2026-10-02T12:00:00+00:00',
    });
    expect(goalProgress(full, [], TODAY)).toMatchObject({ done: true, reachedOn: '2026-10-02' });
  });

  it('date passed and short: no weekly line, what is still to go', () => {
    const late = goal({ id: 'g', target: 1000, start_amount: 400, target_date: '2026-09-30' });
    expect(goalProgress(late, [], TODAY)).toMatchObject({
      datePassed: true,
      need: 600,
      weekly: null,
      monthly: null,
    });
  });

  it('date passed but done is not "passed"', () => {
    const met = goal({ id: 'g', target: 100, start_amount: 100, target_date: '2026-09-30' });
    expect(goalProgress(met, [], TODAY).datePassed).toBe(false);
  });

  it('on the target date itself it is not passed yet: the whole need is due', () => {
    const due = goal({ id: 'g', target: 100.01, target_date: TODAY });
    expect(goalProgress(due, [], TODAY)).toMatchObject({
      datePassed: false,
      weekly: 101,
      monthly: 101,
    });
  });

  it('no date, no line', () => {
    expect(goalProgress(goal({ id: 'g', target: 100 }), [], TODAY)).toMatchObject({
      weekly: null,
      monthly: null,
      datePassed: false,
    });
  });

  it('a goal that has given back more than it was sent holds nothing from savings', () => {
    const view = goalProgress(
      goal({ id: 'g', target: 1000, start_amount: 500 }),
      [
        move('a', 'g', 100, '2026-09-01T10:00:00+00:00'),
        move('b', 'g', -300, '2026-09-02T10:00:00+00:00'),
      ],
      TODAY,
    );
    expect([view.saved, view.fromSavings]).toEqual([300, 0]);
  });
});

describe('goalPlan: the goal calculator', () => {
  it('the design: $1,200 by Mar 2027 with $300 already saved', () => {
    expect(
      goalPlan({ target: 1200, alreadySaved: 300, targetDate: '2027-03-31', today: TODAY }),
    ).toEqual({
      weekly: 37,
      monthly: 159,
    });
  });

  it('rounds up to whole dollars, so following it gets you there', () => {
    expect(
      goalPlan({ target: 900.01, alreadySaved: 0, targetDate: '2026-10-16', today: TODAY }),
    ).toEqual({
      weekly: 901,
      monthly: 901,
    });
    expect(
      goalPlan({ target: 100, alreadySaved: 0, targetDate: '2026-10-17', today: TODAY }),
    ).toEqual({
      weekly: 88,
      monthly: 100,
    });
  });

  it('a month is 30.4375 days: 30 days asks the whole need, 31 a little less', () => {
    expect(
      goalPlan({ target: 100, alreadySaved: 0, targetDate: '2026-11-08', today: TODAY }).monthly,
    ).toBe(100);
    expect(
      goalPlan({ target: 100, alreadySaved: 0, targetDate: '2026-11-09', today: TODAY }).monthly,
    ).toBe(99);
  });

  it('under a week to go asks the whole need, never a rate above it', () => {
    expect(
      goalPlan({ target: 100, alreadySaved: 0, targetDate: '2026-10-12', today: TODAY }),
    ).toEqual({
      weekly: 100,
      monthly: 100,
    });
  });

  it('no date, a past date, or nothing needed: no plan', () => {
    const none = { weekly: null, monthly: null };
    expect(goalPlan({ target: 1200, alreadySaved: 0, targetDate: null, today: TODAY })).toEqual(
      none,
    );
    expect(
      goalPlan({ target: 1200, alreadySaved: 0, targetDate: '2026-10-08', today: TODAY }),
    ).toEqual(none);
    expect(
      goalPlan({ target: 1200, alreadySaved: 1200, targetDate: '2027-03-31', today: TODAY }),
    ).toEqual(none);
    expect(goalPlan({ target: 1200, alreadySaved: 0, targetDate: 'March', today: TODAY })).toEqual(
      none,
    );
  });

  // toCents keeps 12 significant digits, so the largest figure it holds to the cent at this size is
  // a whole-dollar one; need¢ × 1461 is then past 2^53.
  it('exact where the monthly product passes 2^53', () => {
    const big = { target: 999_999_999_999, alreadySaved: 0, today: TODAY };
    expect(goalPlan({ ...big, targetDate: '2026-11-08' })).toEqual({
      weekly: 233_333_333_334,
      monthly: 999_999_999_999,
    });
    expect(goalPlan({ ...big, targetDate: '2027-10-09' })).toEqual({
      weekly: 19_178_082_192,
      monthly: 83_390_410_959,
    });
  });
});

describe('splitEvenly', () => {
  it('the design: $850 between Trip and Emergency fund is $425 each', () => {
    expect(splitEvenly(850, [900, 580])).toEqual([425, 425]);
  });

  it('cents that do not divide go one each, first goal first', () => {
    expect(splitEvenly(100, [500, 500, 500])).toEqual([33.34, 33.33, 33.33]);
    expect(splitEvenly(0.05, [1, 1, 1])).toEqual([0.02, 0.02, 0.01]);
    expect(splitEvenly(0.02, [1, 1, 1])).toEqual([0.01, 0.01, 0]);
    expect(splitEvenly(1000.02, [900, 900, 900])).toEqual([333.34, 333.34, 333.34]);
    expect(splitEvenly(1000.04, [900, 900, 900])).toEqual([333.35, 333.35, 333.34]);
  });

  it('a goal is capped at its need and the rest is shared again', () => {
    expect(splitEvenly(850, [900, 100])).toEqual([750, 100]);
    expect(splitEvenly(1000, [50, 900, 100])).toEqual([50, 850, 100]);
  });

  it('the odd cents move on when the first goal is full', () => {
    expect(splitEvenly(100.01, [10, 200, 200])).toEqual([10, 45.01, 45]);
    // 7¢ across three is 3, 2, 2; the first can take 1¢, and the rest is shared again.
    expect(splitEvenly(0.07, [0.01, 1, 1])).toEqual([0.01, 0.03, 0.03]);
  });

  it('more than the goals need fills them; the rest stays in savings', () => {
    expect(splitEvenly(2000, [900, 580])).toEqual([900, 580]);
  });

  it('a goal needing nothing gets nothing', () => {
    expect(splitEvenly(850, [0, 580, 900])).toEqual([0, 425, 425]);
  });

  it('nothing to share, or nobody to share it with', () => {
    expect(splitEvenly(0, [100])).toEqual([0]);
    expect(splitEvenly(100, [])).toEqual([]);
    expect(splitEvenly(-5, [100])).toEqual([0]);
  });
});

describe('clampSend: the send page', () => {
  const page = { available: 850, amounts: [400, 300], needs: [900, 580] };

  it('the stepper and +$50 move freely while there is room', () => {
    expect(clampSend({ ...page, index: 0, next: 410 })).toBe(410);
    expect(clampSend({ ...page, index: 0, next: 450 })).toBe(450);
  });

  it('never more than the others leave of what is available', () => {
    expect(clampSend({ ...page, index: 0, next: 1000 })).toBe(550);
  });

  it('Fill goal takes its need, capped by what is left', () => {
    expect(clampSend({ ...page, index: 1, next: 580 })).toBe(450);
    expect(
      clampSend({ available: 2000, amounts: [0, 0], needs: [900, 580], index: 0, next: 900 }),
    ).toBe(900);
  });

  it('never more than the goal still needs', () => {
    expect(
      clampSend({ available: 2000, amounts: [400, 575], needs: [900, 580], index: 1, next: 585 }),
    ).toBe(580);
  });

  it('never below zero; a typed figure is held to the cent', () => {
    expect(clampSend({ ...page, index: 0, next: -10 })).toBe(0);
    expect(clampSend({ ...page, index: 0, next: 123.456 })).toBe(123.46);
  });

  it('nothing to give when the others already take it all', () => {
    expect(
      clampSend({ available: 500, amounts: [0, 600], needs: [900, 580], index: 0, next: 50 }),
    ).toBe(0);
  });
});
