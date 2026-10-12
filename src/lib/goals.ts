import { fromCents, toCents } from '@/lib/money';
import { localDayOf, type MoveRow } from '@/lib/savings';

/**
 * Goals: money set aside for something, filled from savings. Pure and cent-exact, with dates as
 * yyyy-mm-dd text.
 */

export type GoalRow = {
  id: string;
  name: string;
  icon_id: string;
  target: number;
  /** yyyy-mm-dd; the last day of the month picked ("by Mar 2027" is 2027-03-31). */
  target_date: string | null;
  /** Saved before the goal was made; never came from savings. */
  start_amount: number;
  created_at: string;
  /**
   * Set when its money was spent ("I spent it"): the goal leaves every list, and its moves stay so
   * that money stays out of savings.
   */
  closed_at: string | null;
};

export type GoalView = GoalRow & {
  /** start_amount + sent − taken back. */
  saved: number;
  /** What it still needs; 0 once done. */
  need: number;
  /** Whole percent, rounded down: never 100 while short. */
  percent: number;
  done: boolean;
  /** yyyy-mm-dd of the send that last crossed the target, while done; else null. */
  reachedOn: string | null;
  /** Whole dollars, rounded up; null when done, past its date, or without one. */
  weekly: number | null;
  monthly: number | null;
  /** The date is behind today and the goal is still short ("Target date passed · $X to go"). */
  datePassed: boolean;
  /** What came from savings and has not gone back: what taking out or deleting returns. */
  fromSavings: number;
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const isDay = (value: unknown): value is string => typeof value === 'string' && DAY.test(value);

const cents = (value: number | string | null | undefined): number => toCents(Number(value ?? 0));

/** ceil(a / b) for whole non-negative a and positive b. */
const ceilDiv = (a: number, b: number): number => Math.floor((a + b - 1) / b);

/**
 * ceil(a × m / d), exact for whole non-negative numbers whose product passes 2^53: a is split into
 * whole multiples of d and a remainder, so neither part of the sum leaves the safe integer range.
 */
function mulDivCeil(a: number, m: number, d: number): number {
  const whole = Math.floor(a / d);
  return whole * m + ceilDiv((a - whole * d) * m, d);
}

/**
 * floor(100 × part ÷ whole) for 0 ≤ part < whole, one decimal digit at a time so no product passes
 * 10 × whole, which a money column keeps far below 2^53.
 */
function percentDown(part: number, whole: number): number {
  const tens = Math.floor((part * 10) / whole);
  const units = Math.floor(((part * 10 - tens * whole) * 10) / whole);
  return tens * 10 + units;
}

function daysBetween(from: string, to: string): number {
  const at = (day: string) => {
    const [year, month, date] = day.split('-').map(Number);
    return Date.UTC(year, month - 1, date);
  };
  return Math.round((at(to) - at(from)) / 86_400_000);
}

const NO_PLAN = { weekly: null, monthly: null } as const;

/**
 * What to put aside to get there, in whole dollars rounded up so following it gets you there:
 *   weekly  = need ÷ (days ÷ 7)
 *   monthly = need ÷ (days × 12 ÷ 365.25), an average Gregorian month of 30.4375 days
 * where need = target − already saved and days runs from today to the target date. With less than a
 * week (or a month) to go the whole need is due in it, never a rate above the need itself.
 * Null without a date, once the date has passed, or when nothing is needed.
 */
export function goalPlan(args: {
  target: number;
  alreadySaved: number;
  targetDate: string | null;
  today: string;
}): { weekly: number | null; monthly: number | null } {
  const need = cents(args.target) - Math.max(0, cents(args.alreadySaved));
  if (need <= 0 || !isDay(args.targetDate) || !isDay(args.today)) return NO_PLAN;
  if (args.targetDate < args.today) return NO_PLAN;

  const days = daysBetween(args.today, args.targetDate);
  const wholeNeed = ceilDiv(need, 100);
  return {
    weekly: days >= 7 ? mulDivCeil(need, 7, days * 100) : wholeNeed,
    // days × 48 ≥ 1461 is days × 12 ÷ 365.25 ≥ 1, kept in whole numbers.
    monthly: days * 48 >= 1461 ? mulDivCeil(need, 1461, days * 4800) : wholeNeed,
  };
}

/** Moves in the order they happened; one batch's moves share a time, so the id settles ties. */
const byTime = (a: MoveRow, b: MoveRow) =>
  a.created_at === b.created_at
    ? a.id.localeCompare(b.id)
    : a.created_at.localeCompare(b.created_at);

export function goalProgress(goal: GoalRow, moves: readonly MoveRow[], today: string): GoalView {
  const own = moves.filter((move) => move.goal_id === goal.id).sort(byTime);
  const target = cents(goal.target);

  let running = Math.max(0, cents(goal.start_amount));
  let net = 0;
  // A goal made already full was reached the day it was made.
  let reachedAt: string | null = running >= target ? goal.created_at : null;
  for (const move of own) {
    const before = running;
    const amount = cents(move.amount);
    running += amount;
    net += amount;
    if (running < target) reachedAt = null;
    else if (before < target) reachedAt = move.created_at;
  }

  const saved = Math.max(0, running);
  const done = saved >= target;
  const datePassed = !done && isDay(goal.target_date) && goal.target_date < today;
  const plan =
    done || datePassed
      ? NO_PLAN
      : goalPlan({
          target: fromCents(target),
          alreadySaved: fromCents(saved),
          targetDate: goal.target_date,
          today,
        });

  return {
    ...goal,
    saved: fromCents(saved),
    need: fromCents(Math.max(0, target - saved)),
    percent: done ? 100 : percentDown(saved, target),
    done,
    reachedOn: done && reachedAt ? localDayOf(reachedAt) : null,
    weekly: plan.weekly,
    monthly: plan.monthly,
    datePassed,
    fromSavings: fromCents(Math.max(0, net)),
  };
}

/**
 * Every open goal's progress; a closed goal is left out. The headline ("Saved toward goals $720.00
 * of $2,200") sums the goals still being saved for; a finished goal's money is spoken for. Active
 * goals keep the order they were made; finished ones show the most recently reached first.
 */
export function goalsSummary(
  goals: readonly GoalRow[],
  moves: readonly MoveRow[],
  today: string,
): { saved: number; target: number; active: GoalView[]; done: GoalView[] } {
  const views = goals
    .filter((goal) => !goal.closed_at)
    .map((goal) => goalProgress(goal, moves, today));
  const made = (a: GoalView, b: GoalView) =>
    a.created_at === b.created_at
      ? a.id.localeCompare(b.id)
      : a.created_at.localeCompare(b.created_at);

  const active = views.filter((view) => !view.done).sort(made);
  const done = views
    .filter((view) => view.done)
    .sort((a, b) => (b.reachedOn ?? '').localeCompare(a.reachedOn ?? '') || made(b, a));

  let saved = 0;
  let target = 0;
  for (const view of active) {
    saved += cents(view.saved);
    target += cents(view.target);
  }
  return { saved: fromCents(saved), target: fromCents(target), active, done };
}

/**
 * "Split evenly": the available money shared across the goals still short, in cents. The cents that
 * do not divide go one each to the goals still short, first goal first ($0.05 across three is 0.02,
 * 0.02, 0.01). Each share is capped at what the goal needs, and whatever a capped goal could not
 * take is shared again among the rest, until the money or the needs run out. `needs` lines up with
 * the goals on screen; a goal needing nothing gets 0.
 */
export function splitEvenly(available: number, needs: readonly number[]): number[] {
  const room = needs.map((need) => Math.max(0, cents(need)));
  const given = room.map(() => 0);
  let left = Math.max(0, cents(available));

  // Every pass either places all that is left or fills at least one goal, so it ends.
  while (left > 0) {
    const short = room.flatMap((space, index) => (given[index] < space ? [index] : []));
    if (short.length === 0) break;
    const share = Math.floor(left / short.length);
    const odd = left - share * short.length;
    short.forEach((index, place) => {
      const give = Math.min(share + (place < odd ? 1 : 0), room[index] - given[index]);
      given[index] += give;
      left -= give;
    });
  }
  return given.map(fromCents);
}

/**
 * The amount a goal on the send page may take when the person asks for `next` (stepper, "+$50",
 * "Fill goal" as next = its need, or a typed figure): rounded to the cent, at least 0, at most what
 * the goal still needs, and at most what the other goals leave of the money available.
 */
export function clampSend(args: {
  available: number;
  amounts: readonly number[];
  needs: readonly number[];
  index: number;
  next: number;
}): number {
  let others = 0;
  args.amounts.forEach((amount, index) => {
    if (index !== args.index) others += Math.max(0, cents(amount));
  });
  const room = Math.max(0, cents(args.available) - others);
  const cap = Math.min(room, Math.max(0, cents(args.needs[args.index])));
  return fromCents(Math.min(cap, Math.max(0, cents(args.next))));
}
