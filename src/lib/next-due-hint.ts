import { cycleStart, occurrencesInRange, type Recurrence } from '@/lib/card-ledger';
import { floorAfterCharges } from '@/lib/charges';
import { shiftMonths } from '@/lib/month-step';

/**
 * Where a picked due date really lands once the plan's charges are counted, for the edit forms to
 * say so before Save ("October is already paid · next payment 15 Nov"). Pure: dates are yyyy-mm-dd
 * strings, so no timezone can move a day.
 *
 * The rule is the one the database applies to every bill and subscription it stores: a plan's next
 * date is never before its floor, and when it is, it becomes the schedule's first date on or after
 * the floor. The floor is the later of starts_on as Save writes it and the start of the cycle after
 * the newest charge, since a cycle is charged once (charges_one_per_cycle). Save writes starts_on as
 * `floorAfterCharges(picked, …)`, or as the picked date for a set period, so either way the floor is
 * `floorAfterCharges(picked, …)`. Cycles are calendar ones (`cycleStart`): a Monday-to-Sunday week,
 * a month, a calendar quarter, a calendar year. Every recurrence, a set period included, goes through
 * the same floor, walk and cycles, so it follows them wherever they go.
 */

export type PaidCycleLabel = 'week' | 'month' | 'quarter' | 'year';

export type PaidCycle = {
  /** The cycle's first day (`cycleStart`): its Monday, or the 1st of its month, quarter or year. */
  start: string;
  label: PaidCycleLabel;
  /** Today falls in it, so it can be called "this week" or "this month". */
  current: boolean;
};

export type NextDueHint = {
  /**
   * The date the plan is next due on, as the database will store it; null when that is after the
   * plan ends, so the paid cycle was its last.
   */
  next: string | null;
  /**
   * The newest cycle with a charge, when it moved the picked date on; null when the date stands. A
   * date picked in an earlier month is moved past that newest one too, so the newest is named.
   */
  paidCycle: PaidCycle | null;
};

export type NextDueInput = {
  /** yyyy-mm-dd the person picked (or left as stored). */
  picked: string;
  recurrence: Recurrence;
  /**
   * The day of the month the database keeps for the plan, as its anchor trigger decides: null for a
   * newly picked date (its own day becomes the anchor), the row's `anchor_day` when the date is left
   * as stored or a loan sits behind the bill. A clamped 30 Nov walks on to 31 Dec only with 31 here.
   */
  anchorDay?: number | null;
  /** The plan's newest charge (`usePastCharges().lastChargedOn`); null for a plan never charged. */
  lastChargedOn: string | null;
  /** yyyy-mm-dd, the person's own day (`useToday`). Only decides `paidCycle.current`. */
  today: string;
  /** The plan's last day (a loan's last payment, a period's end), when it has one. */
  endsOn?: string | null;
};

const LABELS: Record<Recurrence, PaidCycleLabel> = {
  weekly: 'week',
  monthly: 'month',
  quarterly: 'quarter',
  yearly: 'year',
  // A set period is paid month by month, so its cycle is the month.
  period: 'month',
};

/**
 * How far past the floor the walk looks. The first date on or after the start of a cycle is inside
 * that cycle, and a year is the longest one, so a year finds the same date as the database's five.
 */
const LOOK_AHEAD_MONTHS = 12;

export function effectiveNextDue({
  picked,
  recurrence,
  anchorDay = null,
  lastChargedOn,
  today,
  endsOn = null,
}: NextDueInput): NextDueHint {
  const floor = floorAfterCharges(picked, lastChargedOn, recurrence) ?? picked;
  if (picked >= floor || !lastChargedOn) return { next: picked, paidCycle: null };

  const to = shiftMonths(floor, LOOK_AHEAD_MONTHS, Number(floor.slice(8, 10)));
  // Newest first; the last is the first date on or after the floor.
  const dates = occurrencesInRange(picked, recurrence, floor, to, anchorDay);
  // Nothing on the schedule from the floor on: the database keeps the date as written, and there is
  // no later payment to name.
  if (dates.length === 0) return { next: picked, paidCycle: null };

  const first = dates[dates.length - 1];
  const start = cycleStart(lastChargedOn, recurrence);
  return {
    // The end day itself is still a payment.
    next: endsOn && first > endsOn ? null : first,
    paidCycle: {
      start,
      label: LABELS[recurrence],
      current: cycleStart(today, recurrence) === start,
    },
  };
}
