import {
  billWindow,
  dayAfter,
  occurrencesInRange,
  planFloor,
  type Recurrence,
} from '@/lib/card-ledger';

/**
 * Decides which occurrences still need writing down: every date a plan has come due on that has not
 * been recorded, so opening the app after a fortnight away catches up. Pure: the caller reads and
 * writes.
 */

export type ChargeablePlan = {
  id: string;
  recurrence: Recurrence;
  /** The stored anchor. Occurrences are walked outwards from it. */
  nextDate: string | null;
  /** When the plan began. Nothing is recorded before it. */
  startsOn?: string | null;
  /** When the row was made, as the floor of last resort. */
  createdAt?: string | null;
  /** When it stopped, if it has. */
  endsOn?: string | null;
};

/**
 * Dates a plan has come due on and that are not recorded yet, oldest first.
 *
 * The floor is `planFloor`, the same one the screens read with, so what is written down and what is
 * shown are the same dates. A plan with neither date is not backfilled: it records from today.
 */
export function unrecordedDates(
  plan: ChargeablePlan,
  today: string,
  recorded: ReadonlySet<string>,
): string[] {
  if (!plan.nextDate) return [];

  const floor = planFloor(plan.startsOn, plan.createdAt) ?? today;
  const window = billWindow({ starts_on: floor, ends_on: plan.endsOn ?? null }, floor, today);
  if (window.from && window.from > window.to) return [];

  // One charge per cycle, not just per date, or a moved due date looks like an unrecorded month.
  // The database holds the same rule (charges_one_per_cycle).
  const charged = new Set([...recorded].map((date) => cycleStart(date, plan.recurrence)));

  return occurrencesInRange(plan.nextDate, plan.recurrence, window.from, window.to)
    .filter((date) => !recorded.has(date) && !charged.has(cycleStart(date, plan.recurrence)))
    .sort();
}

/** The date picked, unless the plan counts from earlier: a later start would drop occurrences already on the books. */
export function countFromAfterPick(picked: string | null, current: string | null): string | null {
  return picked && (!current || picked < current) ? picked : current;
}

/**
 * The first day of the cycle `date` falls in: its week's Monday, the 1st of its month, its calendar
 * quarter or its year. A set period has no cycle, so each date is its own. Matches Postgres's
 * date_trunc, which the database's copy of the rule uses.
 */
export function cycleStart(date: string, recurrence: Recurrence): string {
  const [year, month, day] = date.split('-').map(Number);
  const at = (start: Date) => start.toISOString().slice(0, 10);
  switch (recurrence) {
    case 'weekly': {
      const monday = (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
      return at(new Date(Date.UTC(year, month - 1, day - monday)));
    }
    case 'monthly':
      return at(new Date(Date.UTC(year, month - 1, 1)));
    case 'quarterly':
      return at(new Date(Date.UTC(year, Math.floor((month - 1) / 3) * 3, 1)));
    case 'yearly':
      return at(new Date(Date.UTC(year, 0, 1)));
    default:
      return date;
  }
}

function nextCycleStart(date: string, recurrence: Recurrence): string {
  const [year, month, day] = date.split('-').map(Number);
  const at = (next: Date) => next.toISOString().slice(0, 10);
  switch (recurrence) {
    case 'weekly': {
      const monday = (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
      return at(new Date(Date.UTC(year, month - 1, day + 7 - monday)));
    }
    case 'monthly':
      return at(new Date(Date.UTC(year, month, 1)));
    case 'quarterly':
      return at(new Date(Date.UTC(year, (Math.floor((month - 1) / 3) + 1) * 3, 1)));
    case 'yearly':
      return at(new Date(Date.UTC(year + 1, 0, 1)));
    default:
      return dayAfter(date);
  }
}

/**
 * Keeps an edited plan from recording a cycle it has already been charged for. Both recorders write
 * every due date from the start up to today that is not on the record, matched by exact date, so
 * moving a charged rent from the 28th to the 1st would charge September twice. Starting the plan at
 * the cycle after its newest charge avoids that.
 */
export function floorAfterCharges(
  start: string | null,
  lastCharged: string | null,
  recurrence: Recurrence,
): string | null {
  if (!lastCharged) return start;
  const floor = nextCycleStart(lastCharged, recurrence);
  return start && start > floor ? start : floor;
}
